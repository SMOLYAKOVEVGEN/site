import asyncio
import hashlib
import json
import mimetypes
import os
import random
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
import subprocess

import aiohttp
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

def require_env(value, name):
    if not value:
        raise RuntimeError(f"Не задана переменная окружения: {name}")
    return value

SUPABASE_URL = require_env(os.getenv("SUPABASE_URL", ""), "SUPABASE_URL")
SUPABASE_SERVICE_KEY = require_env(os.getenv("SUPABASE_SERVICE_KEY", ""), "SUPABASE_SERVICE_KEY")

DB_HOST = require_env(os.getenv("DB_HOST", ""), "DB_HOST")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = require_env(os.getenv("DB_NAME", ""), "DB_NAME")
DB_USER = require_env(os.getenv("DB_USER", ""), "DB_USER")
DB_PASSWORD = require_env(os.getenv("DB_PASSWORD", ""), "DB_PASSWORD")

BUCKET_NAME = require_env(os.getenv("BUCKET_NAME", "catalog-media"), "BUCKET_NAME")

MAX_IMAGE_DOWNLOAD_CONCURRENCY = 20
MAX_IMAGE_UPLOAD_CONCURRENCY = 8
HTTP_TIMEOUT = 60
HTTP_RETRIES = 4
DB_CONNECT_TIMEOUT = 20

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru,en;q=0.9",
}

RETRYABLE_HTTP_CODES = {408, 409, 425, 429, 500, 502, 503, 504}

def clean_text(value):
    if value is None:
        return ""
    value = str(value).replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()

def parse_bool_availability(value):
    value = clean_text(value).lower()
    if value == "out_of_stock":
        return False
    if value == "нет в наличии":
        return False
    return True

def normalize_slug(value, fallback=""):
    value = clean_text(value)
    return value or fallback

def ext_from_url_or_type(url, content_type):
    path = urlparse(url).path
    ext = os.path.splitext(path)[1].lower()

    if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"}:
        return ".jpg" if ext == ".jpeg" else ext

    mime = (content_type or "").split(";")[0].strip().lower()
    guessed = mimetypes.guess_extension(mime) or ".jpg"
    if guessed == ".jpe":
        guessed = ".jpg"
    return guessed

def md5_text(value):
    return hashlib.md5(value.encode("utf-8")).hexdigest()

def build_storage_path(group_slug, subgroup_slug, product_slug, image_url, is_main, sort_order, ext):
    group_slug = normalize_slug(group_slug, "group")
    subgroup_slug = normalize_slug(subgroup_slug, "category")
    product_slug = normalize_slug(product_slug, "product")

    image_hash = md5_text(image_url)
    prefix = "main" if is_main else f"gallery_{sort_order:03d}"

    if product_slug == "category":
        if subgroup_slug == "root":
            return f"categories/{group_slug}/{prefix}_{image_hash}{ext}"

        return f"categories/{group_slug}/{subgroup_slug}/{prefix}_{image_hash}{ext}"

    return f"products/{group_slug}/{product_slug}/{prefix}_{image_hash}{ext}"

class CatalogImporter:
    def __init__(self):
        self.conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=DB_CONNECT_TIMEOUT,
            sslmode="require",
        )
        self.conn.autocommit = False
        self.category_map = {}
        self.category_url_map = {}
        self.reset_stats()

    def close(self):
        try:
            self.conn.close()
        except Exception:
            pass

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def upsert_group(self, cur, group):
        slug = clean_text(group.get("slug"))

        cur.execute(
            """
            select id
            from public.categories
            where parent_id is null
              and slug = %s
            limit 1
            """,
            (slug,),
        )
        row = cur.fetchone()

        if row:
            group_id = row[0]
            cur.execute(
                """
                update public.categories
                set
                    name = %s,
                    description = %s,
                    image = %s,
                    source_type = %s,
                    source_url = %s,
                    root_group_slug = %s,
                    root_group_name = %s,
                    level = %s
                where id = %s
                """,
                (
                    clean_text(group.get("name")),
                    clean_text(group.get("description")),
                    clean_text(group.get("image")),
                    "group",
                    clean_text(group.get("url")),
                    clean_text(group.get("slug")),
                    clean_text(group.get("name")),
                    0,
                    group_id,
                ),
            )
        else:
            cur.execute(
                """
                insert into public.categories
                (
                    name,
                    slug,
                    description,
                    parent_id,
                    image,
                    source_type,
                    source_url,
                    root_group_slug,
                    root_group_name,
                    level
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                returning id
                """,
                (
                    clean_text(group.get("name")),
                    clean_text(group.get("slug")),
                    clean_text(group.get("description")),
                    None,
                    clean_text(group.get("image")),
                    "group",
                    clean_text(group.get("url")),
                    clean_text(group.get("slug")),
                    clean_text(group.get("name")),
                    0,
                ),
            )
            group_id = cur.fetchone()[0]

        self.category_map[(None, slug)] = group_id
        self.category_url_map[clean_text(group.get("url"))] = group_id
        self.stats["groups_upserted"] += 1
        return group_id

    def upsert_subgroup(self, cur, collection, group):
        collection_url = clean_text(collection.get("url"))
        parent_url = clean_text(collection.get("parent_url"))

        group_id = self.category_url_map.get(clean_text(group.get("url")))
        parent_id = self.category_url_map.get(parent_url) or group_id

        level = 1
        current_parent_id = parent_id
        while current_parent_id and current_parent_id != group_id:
            level += 1
            cur.execute(
                """
                select parent_id
                from public.categories
                where id = %s
                limit 1
                """,
                (current_parent_id,),
            )
            row = cur.fetchone()
            current_parent_id = row[0] if row else None

        cur.execute(
            """
            insert into public.categories
            (
                name,
                slug,
                description,
                parent_id,
                image,
                source_type,
                source_url,
                root_group_slug,
                root_group_name,
                level
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (parent_id, slug) do update
            set
                name = excluded.name,
                description = excluded.description,
                image = excluded.image,
                source_type = excluded.source_type,
                source_url = excluded.source_url,
                root_group_slug = excluded.root_group_slug,
                root_group_name = excluded.root_group_name,
                level = excluded.level
            returning id
            """,
            (
                clean_text(collection.get("name")),
                clean_text(collection.get("slug")),
                clean_text(collection.get("description")),
                parent_id,
                clean_text(collection.get("image")),
                "collection",
                collection_url,
                clean_text(group.get("slug")),
                clean_text(group.get("name")),
                level,
            ),
        )

        subgroup_id = cur.fetchone()[0]

        self.category_map[(parent_id, clean_text(collection.get("slug")))] = subgroup_id
        self.category_url_map[collection_url] = subgroup_id

        self.stats["subgroups_upserted"] += 1
        return subgroup_id

    def upsert_product(self, cur, item, subgroup_id):
        name = clean_text(item.get("name"))
        slug = normalize_slug(item.get("slug"), fallback=md5_text(clean_text(item.get("url")))[:16])
        sku = clean_text(item.get("article"))
        price = item.get("price_value")
        description = clean_text(item.get("description"))
        short_description = clean_text(item.get("description"))
        full_description = clean_text(item.get("description"))
        is_available = parse_bool_availability(item.get("availability"))
        source_url = clean_text(item.get("url")) or None
        availability_text = clean_text(item.get("availability_raw"))
        specifications = item.get("specifications") or []
        root_group_slug = clean_text(item.get("group_slug"))
        root_group_name = clean_text(item.get("group_name"))
        stock_qty = item.get("stock_qty")
        currency = clean_text(item.get("currency"))
        measure = clean_text(item.get("measure"))
        source_site_id = clean_text(item.get("site_id")) or None

        if source_site_id:
            cur.execute(
                """
                insert into public.products
                (
                    name,
                    slug,
                    sku,
                    price,
                    description,
                    brand_id,
                    category_id,
                    is_available,
                    source_url,
                    short_description,
                    full_description,
                    availability_text,
                    specifications,
                    root_group_slug,
                    root_group_name,
                    stock_qty,
                    currency,
                    measure,
                    source_site_id
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (source_site_id) where source_site_id is not null do update
                set
                    name = excluded.name,
                    slug = excluded.slug,
                    sku = excluded.sku,
                    price = excluded.price,
                    description = excluded.description,
                    category_id = excluded.category_id,
                    is_available = excluded.is_available,
                    source_url = excluded.source_url,
                    short_description = excluded.short_description,
                    full_description = excluded.full_description,
                    availability_text = excluded.availability_text,
                    specifications = excluded.specifications,
                    root_group_slug = excluded.root_group_slug,
                    root_group_name = excluded.root_group_name,
                    stock_qty = excluded.stock_qty,
                    currency = excluded.currency,
                    measure = excluded.measure
                returning id
                """,
                (
                    name,
                    slug,
                    sku,
                    price,
                    description,
                    None,
                    subgroup_id,
                    is_available,
                    source_url,
                    short_description,
                    full_description,
                    availability_text,
                    Json(specifications),
                    root_group_slug,
                    root_group_name,
                    stock_qty,
                    currency,
                    measure,
                    source_site_id,
                ),
            )
        elif source_url:
            cur.execute(
                """
                insert into public.products
                (
                    name,
                    slug,
                    sku,
                    price,
                    description,
                    brand_id,
                    category_id,
                    is_available,
                    source_url,
                    short_description,
                    full_description,
                    availability_text,
                    specifications,
                    root_group_slug,
                    root_group_name,
                    stock_qty,
                    currency,
                    measure,
                    source_site_id
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (source_url) where source_url is not null do update
                set
                    name = excluded.name,
                    slug = excluded.slug,
                    sku = excluded.sku,
                    price = excluded.price,
                    description = excluded.description,
                    category_id = excluded.category_id,
                    is_available = excluded.is_available,
                    short_description = excluded.short_description,
                    full_description = excluded.full_description,
                    availability_text = excluded.availability_text,
                    specifications = excluded.specifications,
                    root_group_slug = excluded.root_group_slug,
                    root_group_name = excluded.root_group_name,
                    stock_qty = excluded.stock_qty,
                    currency = excluded.currency,
                    measure = excluded.measure
                returning id
                """,
                (
                    name,
                    slug,
                    sku,
                    price,
                    description,
                    None,
                    subgroup_id,
                    is_available,
                    source_url,
                    short_description,
                    full_description,
                    availability_text,
                    Json(specifications),
                    root_group_slug,
                    root_group_name,
                    stock_qty,
                    currency,
                    measure,
                    None,
                ),
            )
        else:
            cur.execute(
                """
                insert into public.products
                (
                    name,
                    slug,
                    sku,
                    price,
                    description,
                    brand_id,
                    category_id,
                    is_available,
                    source_url,
                    short_description,
                    full_description,
                    availability_text,
                    specifications,
                    root_group_slug,
                    root_group_name,
                    stock_qty,
                    currency,
                    measure,
                    source_site_id
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                returning id
                """,
                (
                    name,
                    slug,
                    sku,
                    price,
                    description,
                    None,
                    subgroup_id,
                    is_available,
                    None,
                    short_description,
                    full_description,
                    availability_text,
                    Json(specifications),
                    root_group_slug,
                    root_group_name,
                    stock_qty,
                    currency,
                    measure,
                    None,
                ),
            )

        product_id = cur.fetchone()[0]
        self.stats["products_upserted"] += 1
        return product_id

    def upsert_product_category_link(self, cur, product_id, category_id, is_primary, sort_order):
        cur.execute(
            """
            insert into public.product_categories
            (
                product_id,
                category_id,
                is_primary,
                sort_order
            )
            values (%s, %s, %s, %s)
            on conflict (product_id, category_id) do update
            set
                is_primary = excluded.is_primary,
                sort_order = excluded.sort_order
            """,
            (product_id, category_id, is_primary, sort_order),
        )
        self.stats["product_category_links_upserted"] += 1

    def image_exists(self, cur, product_id, url):
        cur.execute(
            """
            select 1
            from public.product_images
            where product_id = %s and url = %s
            limit 1
            """,
            (product_id, url),
        )
        return cur.fetchone() is not None

    def insert_product_image(self, cur, product_id, url, is_main, sort_order):
        cur.execute(
            """
            insert into public.product_images
            (
                product_id,
                url,
                is_main,
                sort_order
            )
            values (%s, %s, %s, %s)
            on conflict (product_id, url) do update
            set
                is_main = excluded.is_main,
                sort_order = excluded.sort_order
            """,
            (product_id, url, is_main, sort_order),
        )

    def update_category_image(self, cur, category_id, image_url):
        cur.execute(
            """
            update public.categories
            set image = %s
            where id = %s
            """,
            (image_url, category_id),
        )

    async def fetch_binary(self, session, url, semaphore):
        last_error = None

        for attempt in range(1, HTTP_RETRIES + 1):
            try:
                async with semaphore:
                    await asyncio.sleep(random.uniform(0.03, 0.12))
                    timeout = aiohttp.ClientTimeout(total=HTTP_TIMEOUT)
                    async with session.get(url, timeout=timeout) as resp:
                        if resp.status in RETRYABLE_HTTP_CODES:
                            raise aiohttp.ClientResponseError(
                                request_info=resp.request_info,
                                history=resp.history,
                                status=resp.status,
                                message=f"Retryable status code: {resp.status}",
                                headers=resp.headers,
                            )
                        resp.raise_for_status()
                        data = await resp.read()
                        ctype = resp.headers.get("Content-Type", "")
                        if not data:
                            raise RuntimeError("Empty image body")
                        return data, ctype
            except Exception as e:
                last_error = e
                if attempt < HTTP_RETRIES:
                    await asyncio.sleep((0.6 * attempt) + random.uniform(0.1, 0.3))

        raise last_error

    async def upload_to_storage(self, session, path, content, content_type, semaphore):
        upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{path}"
        headers = {
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "apikey": SUPABASE_SERVICE_KEY,
            "Content-Type": content_type or "application/octet-stream",
            "x-upsert": "true",
        }

        last_error = None

        for attempt in range(1, HTTP_RETRIES + 1):
            try:
                async with semaphore:
                    timeout = aiohttp.ClientTimeout(total=HTTP_TIMEOUT)
                    async with session.post(upload_url, data=content, headers=headers, timeout=timeout) as resp:
                        text = await resp.text()
                        if resp.status in RETRYABLE_HTTP_CODES:
                            raise RuntimeError(f"Retryable upload status {resp.status}: {text}")
                        if resp.status not in (200, 201):
                            raise RuntimeError(f"Upload failed {resp.status}: {text}")
                        return
            except Exception as e:
                last_error = e
                if attempt < HTTP_RETRIES:
                    await asyncio.sleep((0.7 * attempt) + random.uniform(0.1, 0.3))

        raise last_error

    def get_public_url(self, path):
        return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{path}"

    async def process_one_image(
        self,
        http_session,
        source_url,
        group_slug,
        subgroup_slug,
        product_slug,
        is_main,
        sort_order,
        download_sem,
        upload_sem,
    ):
        binary, content_type = await self.fetch_binary(http_session, source_url, download_sem)
        ext = ext_from_url_or_type(source_url, content_type)
        storage_path = build_storage_path(
            group_slug=group_slug,
            subgroup_slug=subgroup_slug,
            product_slug=product_slug,
            image_url=source_url,
            is_main=is_main,
            sort_order=sort_order,
            ext=ext,
        )
        await self.upload_to_storage(http_session, storage_path, binary, content_type, upload_sem)
        public_url = self.get_public_url(storage_path)
        return public_url

    async def upload_images_for_product(self, image_jobs):
        if not image_jobs:
            return []

        connector = aiohttp.TCPConnector(
            limit=MAX_IMAGE_DOWNLOAD_CONCURRENCY + MAX_IMAGE_UPLOAD_CONCURRENCY,
            ssl=False,
        )
        download_sem = asyncio.Semaphore(MAX_IMAGE_DOWNLOAD_CONCURRENCY)
        upload_sem = asyncio.Semaphore(MAX_IMAGE_UPLOAD_CONCURRENCY)

        async with aiohttp.ClientSession(headers=HEADERS, connector=connector) as session:
            tasks = [
                self.process_one_image(
                    http_session=session,
                    source_url=job["source_url"],
                    group_slug=job["group_slug"],
                    subgroup_slug=job["subgroup_slug"],
                    product_slug=job["product_slug"],
                    is_main=job["is_main"],
                    sort_order=job["sort_order"],
                    download_sem=download_sem,
                    upload_sem=upload_sem,
                )
                for job in image_jobs
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        output = []
        for job, result in zip(image_jobs, results):
            if isinstance(result, Exception):
                output.append({
                    "ok": False,
                    "error": str(result),
                    "job": job,
                })
            else:
                output.append({
                    "ok": True,
                    "public_url": result,
                    "job": job,
                })
        return output

    async def upload_single_image(
        self,
        source_url,
        group_slug,
        subgroup_slug,
        product_slug,
        is_main,
        sort_order,
    ):
        connector = aiohttp.TCPConnector(limit=4, ssl=False)
        download_sem = asyncio.Semaphore(2)
        upload_sem = asyncio.Semaphore(2)

        async with aiohttp.ClientSession(headers=HEADERS, connector=connector) as session:
            public_url = await self.process_one_image(
                http_session=session,
                source_url=source_url,
                group_slug=group_slug,
                subgroup_slug=subgroup_slug,
                product_slug=product_slug,
                is_main=is_main,
                sort_order=sort_order,
                download_sem=download_sem,
                upload_sem=upload_sem,
            )
            return public_url

    def build_image_jobs(self, item):
        jobs = []
        seen = set()

        candidates = []

        main_image = clean_text(item.get("main_image"))
        if main_image:
            candidates.append({
                "source_url": main_image,
                "sort_order": 0,
                "priority": 0,
            })

        preview_image = clean_text(item.get("preview_image"))
        if preview_image:
            candidates.append({
                "source_url": preview_image,
                "sort_order": 1,
                "priority": 1,
            })

        full_image = clean_text(item.get("full_image"))
        if full_image:
            candidates.append({
                "source_url": full_image,
                "sort_order": 2,
                "priority": 2,
            })

        gallery = item.get("gallery_images") or []
        for idx, image_item in enumerate(gallery, start=1):
            preview = clean_text(image_item.get("preview_image"))
            full = clean_text(image_item.get("full_image"))

            if preview:
                candidates.append({
                    "source_url": preview,
                    "sort_order": 100 + idx * 2,
                    "priority": 100 + idx * 2,
                })

            if full:
                candidates.append({
                    "source_url": full,
                    "sort_order": 100 + idx * 2 + 1,
                    "priority": 100 + idx * 2 + 1,
                })

        for c in candidates:
            url = c["source_url"]
            if not url or url in seen:
                continue
            seen.add(url)

            is_main_image = len(jobs) == 0

            jobs.append({
                "source_url": url,
                "is_main": is_main_image,
                "sort_order": c["sort_order"],
                "priority": c["priority"],
                "group_slug": clean_text(item.get("group_slug")),
                "subgroup_slug": clean_text(item.get("subgroup_slug")),
                "product_slug": clean_text(item.get("slug")),
            })

        return jobs

    def import_json(self, json_path):
        json_path = Path(json_path)

        if not json_path.exists():
            raise FileNotFoundError(f"Файл не найден: {json_path}")

        self.reset_stats()

        with json_path.open("r", encoding="utf-8") as f:
            payload = json.load(f)

        group = payload.get("group") or {}
        collections = payload.get("collections") or []
        products = payload.get("products") or []

        print("=" * 100)
        print(f"Импорт файла: {json_path}")
        print(f"Группа: {group.get('name') or group.get('slug')}")
        print(f"Подгрупп: {len(collections)}")
        print(f"Товаров: {len(products)}")

        cur = self.conn.cursor()

        try:
            group_id = self.upsert_group(cur, group)

            group_image = clean_text(group.get("image"))
            if group_image:
                try:
                    public_url = asyncio.run(
                        self.upload_single_image(
                            source_url=group_image,
                            group_slug=clean_text(group.get("slug")),
                            subgroup_slug="root",
                            product_slug="category",
                            is_main=True,
                            sort_order=0,
                        )
                    )
                    self.update_category_image(cur, group_id, public_url)
                    self.stats["category_images_uploaded"] += 1
                except Exception as e:
                    self.stats["category_image_errors"] += 1
                    print(f"[CATEGORY IMG ERROR] {group.get('name')}: {e}")

            collections_sorted = sorted(
                collections,
                key=lambda x: len(urlparse(clean_text(x.get("url"))).path.strip("/").split("/"))
            )

            subgroup_by_url = {}

            for collection in collections_sorted:
                collection_url = clean_text(collection.get("url"))
                group_url = clean_text(group.get("url"))

                if collection_url == group_url:
                    print(f"[SKIP COLLECTION] Коллекция совпадает с группой: {collection.get('name')} | {collection_url}")
                    subgroup_by_url[collection_url] = group_id
                    continue

                subgroup_id = self.upsert_subgroup(cur, collection, group)

                subgroup_by_url[collection_url] = subgroup_id

                collection_image = clean_text(collection.get("image"))
                if collection_image:
                    try:
                        public_url = asyncio.run(
                            self.upload_single_image(
                                source_url=collection_image,
                                group_slug=clean_text(group.get("slug")),
                                subgroup_slug=clean_text(collection.get("slug")),
                                product_slug="category",
                                is_main=True,
                                sort_order=0,
                            )
                        )
                        self.update_category_image(cur, subgroup_id, public_url)
                        self.stats["category_images_uploaded"] += 1
                    except Exception as e:
                        self.stats["category_image_errors"] += 1
                        print(f"[CATEGORY IMG ERROR] {collection.get('name')}: {e}")

            self.commit()
            print("Категории импортированы")

        except Exception:
            self.rollback()
            raise

        total_products = len(products)

        for index, item in enumerate(products, start=1):
            subgroup_url = clean_text(item.get("subgroup_url"))
            subgroup_slug = clean_text(item.get("subgroup_slug"))

            subgroup_id = subgroup_by_url.get(subgroup_url)

            if not subgroup_id:
                subgroup_id = self.category_url_map.get(subgroup_url)

            if not subgroup_id and subgroup_slug:
                candidates = [
                    category_id
                    for (parent_id, slug), category_id in self.category_map.items()
                    if slug == subgroup_slug
                ]
                if len(candidates) == 1:
                    subgroup_id = candidates[0]

            if not subgroup_id:
                subgroup_id = group_id

            if not subgroup_id:
                print(f"[WARN] Нет категории для товара: {item.get('name')} | subgroup_slug={subgroup_slug}")
                continue

            try:
                cur = self.conn.cursor()

                product_id = self.upsert_product(
                    cur=cur,
                    item=item,
                    subgroup_id=subgroup_id,
                )

                self.upsert_product_category_link(
                    cur=cur,
                    product_id=product_id,
                    category_id=subgroup_id,
                    is_primary=True,
                    sort_order=0,
                )

                if subgroup_id != group_id:
                    self.upsert_product_category_link(
                        cur=cur,
                        product_id=product_id,
                        category_id=group_id,
                        is_primary=False,
                        sort_order=1,
                    )

                self.commit()

                image_jobs = self.build_image_jobs(item)
                upload_results = asyncio.run(self.upload_images_for_product(image_jobs))

                cur = self.conn.cursor()

                successful_results = []
                

                for result in upload_results:
                    job = result["job"]

                    if not result["ok"]:
                        self.stats["image_errors"] += 1
                        print(f"[IMG ERROR] {item.get('name')}: {result['error']}")
                        continue

                    successful_results.append(result)

                successful_results.sort(key=lambda x: x["job"].get("priority", 999999))

                main_assigned = False

                for result in successful_results:
                    public_url = result["public_url"]
                    job = result["job"]

                    if self.image_exists(cur, product_id, public_url):
                        self.stats["images_skipped_existing"] += 1
                        continue

                    is_main = False
                    if not main_assigned:
                        is_main = True
                        main_assigned = True

                    self.insert_product_image(
                        cur=cur,
                        product_id=product_id,
                        url=public_url,
                        is_main=is_main,
                        sort_order=job["sort_order"],
                    )
                    self.stats["images_uploaded"] += 1

                self.commit()

            except Exception as e:
                self.rollback()
                print(f"[ERROR] Товар не импортирован: {item.get('name')} | {e}")
                continue

            if index % 10 == 0 or index == total_products:
                print(
                    f"Обработано товаров: {index}/{total_products} | "
                    f"products_upserted={self.stats['products_upserted']} | "
                    f"images_uploaded={self.stats['images_uploaded']} | "
                    f"image_errors={self.stats['image_errors']}"
                )

        print("=" * 100)
        print("ИМПОРТ ЗАВЕРШЕН")
        print(json.dumps(self.stats, ensure_ascii=False, indent=2))

    def reset_stats(self):
        self.stats = {
            "groups_upserted": 0,
            "subgroups_upserted": 0,
            "products_upserted": 0,
            "product_category_links_upserted": 0,
            "images_uploaded": 0,
            "images_skipped_existing": 0,
            "image_errors": 0,
            "category_images_uploaded": 0,
            "category_image_errors": 0,
        }

def list_json_files_for_import(path_value):
    base_path = Path(path_value)

    if base_path.is_file():
        return [base_path]

    if not base_path.exists():
        raise FileNotFoundError(f"Путь не найден: {base_path}")

    if not base_path.is_dir():
        raise RuntimeError(f"Ожидался файл или папка: {base_path}")

    files = []
    for file_path in sorted(base_path.glob("*.json")):
        if file_path.name.startswith("_"):
            continue
        files.append(file_path)

    return files

def import_many(importer, input_path):
    files = list_json_files_for_import(input_path)

    if not files:
        print(f"JSON-файлы для импорта не найдены: {input_path}")
        return

    print("=" * 100)
    print(f"Пакетный импорт из: {Path(input_path)}")
    print(f"Файлов к импорту: {len(files)}")

    results = []
    total_started = time.time()

    for index, file_path in enumerate(files, start=1):
        print("")
        print("=" * 100)
        print(f"[{index}/{len(files)}] Импорт файла: {file_path.name}")

        file_started = time.time()

        try:
            importer.import_json(file_path)
            elapsed = round(time.time() - file_started, 2)

            results.append({
                "file": str(file_path),
                "ok": True,
                "error": "",
                "elapsed_sec": elapsed,
            })

            print(f"[OK] {file_path.name} | {elapsed} сек")

        except Exception as e:
            elapsed = round(time.time() - file_started, 2)

            results.append({
                "file": str(file_path),
                "ok": False,
                "error": str(e),
                "elapsed_sec": elapsed,
            })

            print(f"[ERROR] {file_path.name} | {e} | {elapsed} сек")

    summary_path = Path(input_path) / "_import_summary.json" if Path(input_path).is_dir() else Path("out_catalog_groups") / "_import_summary.json"
    summary_path.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    ok_count = sum(1 for x in results if x["ok"])
    bad_count = len(results) - ok_count

    print("")
    print("=" * 100)
    print("ИТОГ ПАКЕТНОГО ИМПОРТА")
    print(f"Всего файлов: {len(results)}")
    print(f"Успешно: {ok_count}")
    print(f"С ошибками: {bad_count}")
    print(f"Время всего: {round(time.time() - total_started, 2)} сек")
    print(f"Сводка: {summary_path}")

def run_elasticsearch_reindex():
    print("")
    print("=" * 100)
    print("Запуск переиндексации Elasticsearch...")

    result = subprocess.run(
        "npm run reindex:elasticsearch",
        cwd=str(BASE_DIR),
        shell=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError("Не удалось выполнить npm run reindex:elasticsearch")

    print("Переиндексация Elasticsearch завершена")

# def main():
#     if len(sys.argv) >= 2:
#         input_path = sys.argv[1]
#     else:
#         input_path = "out_catalog_groups"

#     importer = CatalogImporter()
#     try:
#         started = time.time()
#         import_many(importer, input_path)
#         run_elasticsearch_reindex()
#         print(f"Общее время: {round(time.time() - started, 2)} сек")
#     finally:
#         importer.close()

def main():
    if len(sys.argv) < 2:
        print("Нужно указать путь к одному JSON-файлу.")
        print("")
        print("Пример:")
        print("python import_catalog.py out_catalog_groups/frezernaya-obrabotka.json")
        return

    input_path = Path(sys.argv[1])

    if not input_path.exists():
        raise FileNotFoundError(f"Файл не найден: {input_path}")

    if not input_path.is_file():
        raise RuntimeError(f"Сейчас включен режим одного файла. Ожидался JSON-файл, а не папка: {input_path}")

    if input_path.suffix.lower() != ".json":
        raise RuntimeError(f"Ожидался .json файл: {input_path}")

    importer = CatalogImporter()

    try:
        started = time.time()

        print("=" * 100)
        print("РЕЖИМ ИМПОРТА ОДНОГО ФАЙЛА")
        print(f"Файл: {input_path}")

        importer.import_json(input_path)

        run_elasticsearch_reindex()

        print(f"Общее время: {round(time.time() - started, 2)} сек")

    finally:
        importer.close()

if __name__ == "__main__":
    main()