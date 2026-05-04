import asyncio
import json
import random
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse, parse_qsl, urlencode

import aiohttp
import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


BASE_URL = "https://cnc.su"
CATALOG_URL = f"{BASE_URL}/catalog/"
DEFAULT_GROUP_URL = f"{BASE_URL}/catalog/frezernaya-obrabotka/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "ru,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Upgrade-Insecure-Requests": "1",
}

RETRYABLE_HTTP_CODES = {408, 409, 425, 429, 500, 502, 503, 504}
MAX_PRODUCTS_PER_COLLECTION = 50


def clean_text(value):
    if value is None:
        return ""
    value = str(value).replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()

def abs_url(url):
    url = clean_text(url)
    if not url:
        return ""
    return urljoin(BASE_URL, url)

def path_parts(url):
    path = urlparse(url).path.strip("/")
    if not path:
        return []
    return [x for x in path.split("/") if x]

def slug_from_url(url):
    parts = path_parts(url)
    return parts[-1] if parts else ""

def normalize_url(url):
    url = abs_url(url)
    if not url:
        return ""
    parsed = urlparse(url)
    query_items = sorted(parse_qsl(parsed.query, keep_blank_values=True))
    normalized = parsed._replace(
        fragment="",
        query=urlencode(query_items, doseq=True),
    )
    return urlunparse(normalized)

def add_cache_buster(url):
    url = normalize_url(url)
    if not url:
        return ""

    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["_cb"] = str(int(time.time() * 1000))

    parsed = parsed._replace(query=urlencode(query, doseq=True))
    return normalize_url(urlunparse(parsed))

def is_image_url(url):
    url = clean_text(url)
    if not url:
        return False

    low = url.lower().split("?")[0]

    if "noimage" in low:
        return False

    return low.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"))

def parse_float_safe(value):
    value = clean_text(value)
    if not value:
        return None
    value = value.replace(" ", "").replace(",", ".")
    value = re.sub(r"[^\d.]", "", value)
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None

def parse_stock_qty(value):
    value = clean_text(value)
    m = re.search(r"\((\d+)\)", value)
    if m:
        return int(m.group(1))
    return None

def normalize_availability_text(value):
    value = clean_text(value)
    low = value.lower()

    if "есть в наличии" in low:
        return "in_stock"
    if "под заказ" in low:
        return "on_order"
    if "нет в наличии" in low:
        return "out_of_stock"

    return low if low else ""

def unique_by(items, key_func):
    seen = set()
    result = []
    for item in items:
        key = key_func(item)
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result

def normalize_spec_name(name):
    name = clean_text(name)
    low = name.lower().replace("ё", "е")
    low = re.sub(r"\s+", " ", low).strip()

    mapping = {
        "штрихкод": "Штрихкод",
        "производитель": "Производитель",
    }
    return mapping.get(low, name)

def normalize_specifications(specs):
    result = []
    seen = set()

    for item in specs:
        name = normalize_spec_name(item.get("name", ""))
        value = clean_text(item.get("value", ""))

        if not name or not value:
            continue

        key = (name.lower(), value.lower())
        if key in seen:
            continue
        seen.add(key)

        result.append({
            "name": name,
            "value": value,
        })

    return result

def strip_subgroup_prefix(name, subgroup_name):
    name = clean_text(name)
    subgroup_name = clean_text(subgroup_name)

    if not name or not subgroup_name:
        return name

    pattern = r"^" + re.escape(subgroup_name) + r"\s+"
    return re.sub(pattern, "", name, flags=re.IGNORECASE).strip()

def extract_listing_product_name(row):
    candidates = []

    for node in row.select("[data-autoload-product_name]"):
        candidates.append(node.get("data-autoload-product_name"))

    img = row.select_one(".image_wrapper_block img")
    if img:
        candidates.append(img.get("alt"))
        candidates.append(img.get("title"))

    title_link = row.select_one(".title a.js-notice-block__title, .title a")
    if title_link:
        candidates.append(title_link.get_text(" ", strip=True))

    for raw in candidates:
        value = clean_text(raw)
        if value:
            return value

    return ""

def make_output_paths(group_slug):
    safe_slug = clean_text(group_slug) or "group"
    out_dir = Path("out_catalog_groups")
    out_dir.mkdir(exist_ok=True)

    return {
        "out_dir": out_dir,
        "result": out_dir / f"{safe_slug}.json",
        "partial": out_dir / f"{safe_slug}.partial.json",
    }

class UniversalCatalogParser:
    def __init__(
        self,
        delay=0.2,
        timeout=30,
        max_retries=4,
        async_concurrency=10,
        max_products_per_collection=40,
    ):
        self.delay = delay
        self.timeout = timeout
        self.max_retries = max_retries
        self.async_concurrency = async_concurrency
        self.max_products_per_collection = max_products_per_collection

        self.session = requests.Session()
        self.session.headers.update(HEADERS)

        retry = Retry(
            total=max_retries,
            connect=max_retries,
            read=max_retries,
            status=max_retries,
            backoff_factor=0.7,
            status_forcelist=sorted(RETRYABLE_HTTP_CODES),
            allowed_methods=frozenset(["GET", "HEAD"]),
            raise_on_status=False,
            respect_retry_after_header=True,
        )
        adapter = HTTPAdapter(max_retries=retry, pool_connections=100, pool_maxsize=100)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        self.reset_group_state()

    def reset_group_state(self):
        self.issues = []
        self.visited_page_urls = set()
        self.visited_category_urls = set()
        self.visited_listing_page_urls = set()
        self.processed_product_urls = set()

        self.group = None
        self.collections = []
        self.listing_products = []
        self.product_cards = []

    def log_issue(self, issue_type, **kwargs):
        payload = {"type": issue_type}
        payload.update(kwargs)
        self.issues.append(payload)

    def fetch_html(self, url):
        last_error = None
        normalized_url = normalize_url(url)

        for attempt in range(1, self.max_retries + 1):
            try:
                time.sleep(self.delay + random.uniform(0.0, 0.15))
                response = self.session.get(normalized_url, timeout=self.timeout)

                if response.status_code in RETRYABLE_HTTP_CODES:
                    raise requests.HTTPError(
                        f"Retryable status code: {response.status_code}",
                        response=response,
                    )

                response.raise_for_status()
                return response.text

            except Exception as e:
                last_error = e
                if attempt < self.max_retries:
                    sleep_for = (0.8 * attempt) + random.uniform(0.1, 0.4)
                    time.sleep(sleep_for)

        raise last_error

    def get_soup(self, url):
        html = self.fetch_html(url)
        return BeautifulSoup(html, "html.parser")

    def extract_all_groups(self):
        soup = self.get_soup(CATALOG_URL)
        results = []

        for a in soup.select("a[href]"):
            raw_href = clean_text(a.get("href"))
            if not raw_href:
                continue

            href = normalize_url(raw_href)
            if not href:
                continue

            parsed = urlparse(href)
            path = parsed.path.strip("/")

            m = re.fullmatch(r"catalog/([a-z0-9\-_%]+)", path, flags=re.IGNORECASE)
            if not m:
                continue

            slug = clean_text(m.group(1))
            if not slug or "." in slug:
                continue

            name = clean_text(a.get_text(" ", strip=True))
            if not name:
                name = slug

            results.append({
                "name": name,
                "slug": slug,
                "url": href,
            })

        results = unique_by(results, key_func=lambda x: x["url"])
        results = sorted(results, key=lambda x: x["url"])
        return results

    def extend_collections(self, collections):
        self.collections.extend(collections)
        self.collections = unique_by(self.collections, key_func=lambda x: x["url"])

    def extend_listing_products(self, products):
        self.listing_products.extend(products)
        self.listing_products = unique_by(
            self.listing_products,
            key_func=lambda x: (x["source_listing_url"], x["url"])
        )

    def parse_group_pages_limited(self, group):
        pseudo_collection = {
            "root_group_slug": group["slug"],
            "root_group_name": group["name"],
            "name": group["name"],
            "slug": group["slug"],
            "url": group["url"],
            "parent_url": "",
            "image": "",
            "image_alt": "",
            "image_title": "",
            "sort_order": 1,
        }

        return self.parse_collection_pages_limited(
            section_url=group["url"],
            group=group,
            current_collection=pseudo_collection,
        )

    def extend_product_cards(self, cards):
        self.product_cards.extend(cards)
        self.product_cards = unique_by(self.product_cards, key_func=lambda x: x["product_url"])
        for card in cards:
            if card.get("product_url"):
                self.processed_product_urls.add(card["product_url"])

    def build_group_from_url(self, group_url):
        group_url = normalize_url(group_url)
        parts = path_parts(group_url)

        if len(parts) != 2 or parts[0] != "catalog":
            raise ValueError("Ожидается ссылка уровня /catalog/<group>/")

        return {
            "name": slug_from_url(group_url),
            "slug": parts[1],
            "url": group_url,
        }

    def enrich_group_name_from_page(self, soup, group):
        h1 = soup.select_one("h1#pagetitle") or soup.select_one("h1")
        if h1:
            group["name"] = clean_text(h1.get_text(" ", strip=True))
        return group

    def extract_collections(self, soup, group, parent_url):
        results = []

        for item in soup.select("div.list.items div.item"):
            name_link = item.select_one("div.name a.dark_link[href]")
            img = item.select_one("div.img a.thumb img")
            thumb_link = item.select_one("div.img a.thumb[href]")

            name = clean_text(name_link.get_text(" ", strip=True)) if name_link else ""
            url = normalize_url(name_link.get("href")) if name_link and name_link.get("href") else ""

            if not url and thumb_link:
                url = normalize_url(thumb_link.get("href"))

            if not name or not url:
                continue

            parts = path_parts(url)

            if len(parts) < 3:
                continue

            if parts[0] != "catalog":
                continue

            if parts[1] != group["slug"]:
                continue

            image = ""
            image_alt = ""
            image_title = ""

            if img:
                image = abs_url(img.get("data-src") or img.get("src") or "")
                image_alt = clean_text(img.get("alt"))
                image_title = clean_text(img.get("title"))

            if "catalog_category_noimage.svg" in image:
                image = ""

            raw_id = clean_text(item.get("id"))
            category_id = ""
            m = re.search(r"_(\d+)$", raw_id)
            if m:
                category_id = m.group(1)

            results.append({
                "root_group_slug": group["slug"],
                "root_group_name": group["name"],
                "category_id": category_id,
                "name": name,
                "slug": slug_from_url(url),
                "url": url,
                "parent_url": normalize_url(parent_url),
                "image": image,
                "image_alt": image_alt,
                "image_title": image_title,
                "sort_order": len(results) + 1,
            })

        return unique_by(results, key_func=lambda x: x["url"])

    def extract_listing_products(self, soup, group, collection=None, source_url=""):
        results = []

        rows = soup.select("tr.item.main_item_wrapper")
        if not rows:
            return results

        for index, row in enumerate(rows, start=1):
            row_id = clean_text(row.get("id"))
            numeric_row_id = ""
            m = re.search(r"_(\d+)$", row_id)
            if m:
                numeric_row_id = m.group(1)

            title_link = row.select_one(".title a.js-notice-block__title[href], .title a.dark_link[href], .title a[href]")
            if not title_link:
                self.log_issue(
                    "listing_product_link_not_found",
                    listing_url=source_url or (collection["url"] if collection else group["url"]),
                    row_id=row_id,
                )
                continue

            product_url = normalize_url(title_link.get("href"))
            name_from_listing = clean_text(title_link.get_text(" ", strip=True))

            if not product_url:
                continue

            results.append({
                "root_group_slug": group["slug"],
                "root_group_name": group["name"],

                "collection_slug": collection["slug"] if collection else "",
                "collection_name": collection["name"] if collection else "",
                "collection_url": collection["url"] if collection else "",

                "source_listing_url": normalize_url(source_url or (collection["url"] if collection else group["url"])),

                "site_id": numeric_row_id,
                "row_id": row_id,
                "name": name_from_listing,
                "url": product_url,
                "slug": slug_from_url(product_url),
                "sort_order": index,
            })

        return unique_by(results, key_func=lambda x: (x["source_listing_url"], x["url"]))

    def extract_pagination_urls(self, soup, current_url):
        current_url = normalize_url(current_url)
        current_parsed = urlparse(current_url)
        current_path = current_parsed.path.rstrip("/")

        candidates = []

        selectors = [
            ".module-pagination a",
            ".pagination a",
            ".nums a",
            ".bottom_nav a",
            ".pages a",
            ".pager a",
            ".ajax_load_btn a",
        ]

        for selector in selectors:
            for a in soup.select(selector):
                href = normalize_url(a.get("href"))
                if not href or href == current_url:
                    continue

                parsed = urlparse(href)
                href_path = parsed.path.rstrip("/")

                same_base_path = (
                    href_path == current_path
                    or href_path.startswith(current_path + "/")
                    or current_path.startswith(href_path + "/")
                )

                text = clean_text(a.get_text(" ", strip=True)).lower()
                cls = " ".join(a.get("class", []))
                href_low = href.lower()

                is_pagination_like = (
                    text.isdigit()
                    or "след" in text
                    or "next" in text
                    or "далее" in text
                    or "pagen" in href_low
                    or "page=" in href_low
                    or "nav-" in href_low
                    or "pager" in cls.lower()
                )

                if same_base_path and is_pagination_like:
                    candidates.append(href)

        return sorted(set(candidates))

    def parse_collection_pages_limited(self, section_url, group, current_collection):
        section_url = normalize_url(section_url)
        page_url = self.listing_start_url(section_url)

        collected_products = []
        seen_urls = set()

        while page_url and len(collected_products) < self.max_products_per_collection:
            page_url = normalize_url(page_url)

            if page_url in self.visited_listing_page_urls:
                break

            self.visited_listing_page_urls.add(page_url)

            try:
                soup = self.get_soup(page_url)
            except Exception as e:
                self.log_issue(
                    "pagination_fetch_error",
                    page_url=page_url,
                    section_url=section_url,
                    error=str(e),
                )
                break

            page_products = self.extract_listing_products(
                soup=soup,
                group=group,
                collection=current_collection,
                source_url=page_url,
            )

            for product in page_products:
                if product["url"] in seen_urls:
                    continue

                seen_urls.add(product["url"])
                collected_products.append(product)

                if len(collected_products) >= self.max_products_per_collection:
                    break

            page_url = self.extract_next_listing_url(soup)

        self.extend_listing_products(collected_products)
        return collected_products

    async def fetch_html_async(self, session, url, semaphore):
        last_error = None
        url = normalize_url(url)

        for attempt in range(1, self.max_retries + 1):
            try:
                async with semaphore:
                    await asyncio.sleep(self.delay + random.uniform(0.0, 0.15))
                    timeout = aiohttp.ClientTimeout(total=self.timeout)

                    async with session.get(url, timeout=timeout) as response:
                        if response.status in RETRYABLE_HTTP_CODES:
                            raise aiohttp.ClientResponseError(
                                request_info=response.request_info,
                                history=response.history,
                                status=response.status,
                                message=f"Retryable status code: {response.status}",
                                headers=response.headers,
                            )

                        response.raise_for_status()
                        return await response.text()

            except Exception as e:
                last_error = e
                if attempt < self.max_retries:
                    sleep_for = (0.8 * attempt) + random.uniform(0.1, 0.4)
                    await asyncio.sleep(sleep_for)

        raise last_error

    async def image_url_exists_async(self, session, url, referer=""):
        url = abs_url(url)

        if not is_image_url(url):
            return False

        headers = {
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Referer": referer or BASE_URL,
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        }

        try:
            timeout = aiohttp.ClientTimeout(total=15)

            async with session.get(
                url,
                headers=headers,
                timeout=timeout,
                allow_redirects=True,
            ) as response:
                content_type = clean_text(response.headers.get("Content-Type", "")).lower()

                await response.content.read(128)

                return (
                    response.status in (200, 206)
                    and (
                        content_type.startswith("image/")
                        or is_image_url(str(response.url))
                    )
                )

        except Exception:
            return False

    async def parse_product_card_async(self, session, url, semaphore):
        html = await self.fetch_html_async(session, add_cache_buster(url), semaphore)
        soup = BeautifulSoup(html, "html.parser")

        card = {
            "product_url": normalize_url(url),
            "site_id": "",
            "h1": "",
            "article": "",
            "brand": "",
            "description": "",
            "specifications": [],
            "breadcrumbs": [],
            "gallery_images": [],
            "main_image": "",
            "price_fallback": None,
            "currency_fallback": "",
            "measure_fallback": "",
            "availability_raw_fallback": "",
            "availability_fallback": "",
            "stock_qty_fallback": None,
            "category_path": [],
            "last_category_slug": "",
            "last_category_name": "",
        }

        product_root = soup.select_one(".catalog_detail.detail")
        if product_root:
            item_block = product_root.select_one(".item_main_info")
            if item_block and item_block.has_attr("id"):
                m = re.search(r"_(\d+)$", item_block["id"])
                if m:
                    card["site_id"] = m.group(1)

        h1 = soup.select_one("h1#pagetitle") or soup.select_one("h1")
        if h1:
            card["h1"] = clean_text(h1.get_text(" ", strip=True))

        article = soup.select_one(".article.iblock [itemprop='value']")
        if article:
            card["article"] = clean_text(article.get_text(" ", strip=True))

        brand_meta = soup.select_one("[itemprop='brand'] meta[itemprop='name']")
        if brand_meta:
            card["brand"] = clean_text(brand_meta.get("content"))

        descr = soup.select_one("#descr .detail_text")
        if descr:
            card["description"] = clean_text(descr.get_text(" ", strip=True))

        props_rows = soup.select("#props table.props_list tr")
        specs = []
        for row in props_rows:
            name_node = row.select_one(".char_name [itemprop='name']")
            value_node = row.select_one(".char_value [itemprop='value']")
            name = clean_text(name_node.get_text(" ", strip=True)) if name_node else ""
            value = clean_text(value_node.get_text(" ", strip=True)) if value_node else ""
            if name and value:
                specs.append({"name": name, "value": value})
        card["specifications"] = normalize_specifications(specs)

        breadcrumbs = []
        for item in soup.select(".breadcrumbs [itemprop='itemListElement']"):
            name_node = item.select_one("[itemprop='name']")
            link_node = item.select_one("a[itemprop='item'], link[itemprop='item']")
            crumb_name = clean_text(name_node.get_text(" ", strip=True)) if name_node else ""
            crumb_url = ""
            if link_node:
                crumb_url = normalize_url(link_node.get("href") or link_node.get("content") or "")
            if crumb_name:
                breadcrumbs.append({
                    "name": crumb_name,
                    "url": crumb_url,
                    "slug": slug_from_url(crumb_url) if crumb_url else "",
                })

        card["breadcrumbs"] = breadcrumbs

        catalog_only = breadcrumbs[3:-1] if len(breadcrumbs) >= 5 else []
        card["category_path"] = [
            {
                "name": x["name"],
                "slug": x["slug"],
                "url": x["url"],
            }
            for x in catalog_only
        ]

        if catalog_only:
            last_section = catalog_only[-1]
            card["last_category_name"] = last_section.get("name", "")
            card["last_category_slug"] = last_section.get("slug", "")

        gallery = self.extract_gallery_from_soup(soup)

        live_gallery = []
        broken_gallery = []

        for g in gallery:
            full_image = abs_url(g.get("full_image", ""))
            preview_image = abs_url(g.get("preview_image", ""))

            full_ok = await self.image_url_exists_async(
                session=session,
                url=full_image,
                referer=url,
            ) if full_image else False

            preview_ok = await self.image_url_exists_async(
                session=session,
                url=preview_image,
                referer=url,
            ) if preview_image else False

            if full_ok or preview_ok:
                live_gallery.append({
                    "full_image": full_image if full_ok else "",
                    "preview_image": preview_image if preview_ok else "",
                    "display_image": full_image if full_ok else preview_image,
                    "alt": clean_text(g.get("alt", "")),
                    "title": clean_text(g.get("title", "")),
                })
            else:
                broken_gallery.append(g)
                print(
                    f"      [IMG BROKEN] {card.get('h1') or url} | "
                    f"full={full_image or '—'} | preview={preview_image or '—'}"
                )

        if broken_gallery:
            print(f"      [IMG REFRESH] Все картинки битые, перезапрашиваю карточку без кэша: {card.get('h1') or url}")

            try:
                fresh_url = add_cache_buster(url)
                fresh_html = await self.fetch_html_async(session, fresh_url, semaphore)
                fresh_soup = BeautifulSoup(fresh_html, "html.parser")

                fresh_gallery = self.extract_gallery_from_soup(fresh_soup)

                for g in fresh_gallery:
                    full_image = abs_url(g.get("full_image", ""))
                    preview_image = abs_url(g.get("preview_image", ""))

                    full_ok = await self.image_url_exists_async(
                        session=session,
                        url=full_image,
                        referer=url,
                    ) if full_image else False

                    preview_ok = await self.image_url_exists_async(
                        session=session,
                        url=preview_image,
                        referer=url,
                    ) if preview_image else False

                    if full_ok or preview_ok:
                        live_gallery.append({
                            "full_image": full_image if full_ok else "",
                            "preview_image": preview_image if preview_ok else "",
                            "display_image": full_image if full_ok else preview_image,
                            "alt": clean_text(g.get("alt", "")),
                            "title": clean_text(g.get("title", "")),
                        })

            except Exception as e:
                self.log_issue(
                    "image_refresh_fetch_error",
                    product_url=url,
                    product_name=card.get("h1", ""),
                    error=str(e),
                )

        if broken_gallery:
            self.log_issue(
                "broken_gallery_images",
                product_url=url,
                product_name=card.get("h1", ""),
                broken_gallery=broken_gallery,
            )

        live_gallery = unique_by(
            live_gallery,
            key_func=lambda x: (
                x.get("display_image", ""),
                x.get("full_image", ""),
                x.get("preview_image", ""),
            )
        )

        card["gallery_images"] = live_gallery

        if live_gallery:
            card["main_image"] = (
                live_gallery[0].get("full_image", "")
                or live_gallery[0].get("preview_image", "")
                or live_gallery[0].get("display_image", "")
            )

            print(
                f"Галерея карточки: {card.get('h1') or url} | "
                f"main: {card['main_image'] or '—'}"
            )
        else:
            print(f"      [IMG NONE] Нет живых картинок: {card.get('h1') or url}")

        price_block = soup.select_one(".prices_block .price[data-value][data-currency]")
        if price_block:
            card["price_fallback"] = parse_float_safe(price_block.get("data-value"))
            card["currency_fallback"] = clean_text(price_block.get("data-currency"))
            measure = price_block.select_one(".price_measure")
            if measure:
                card["measure_fallback"] = clean_text(measure.get_text(" ", strip=True)).lstrip("/")

        stock_block = soup.select_one(".prices_block .item-stock .value")
        if stock_block:
            stock_raw = clean_text(stock_block.get_text(" ", strip=True))
            card["availability_raw_fallback"] = stock_raw
            card["availability_fallback"] = normalize_availability_text(stock_raw)
            card["stock_qty_fallback"] = parse_stock_qty(stock_raw)

        print(
            f"      Карточка товара: {card.get('h1') or url} | артикул: {card.get('article') or '—'}"
        )

        return card

    async def parse_product_cards_async(self, urls, batch_size=100):
        urls = [normalize_url(x) for x in urls if normalize_url(x)]
        urls = [x for x in urls if x not in self.processed_product_urls]

        if not urls:
            return []

        semaphore = asyncio.Semaphore(self.async_concurrency)
        connector = aiohttp.TCPConnector(
            limit=self.async_concurrency,
            ssl=False,
            enable_cleanup_closed=True,
        )

        all_new_cards = []

        async with aiohttp.ClientSession(headers=HEADERS, connector=connector) as session:
            for offset in range(0, len(urls), batch_size):
                batch = urls[offset: offset + batch_size]
                tasks = [
                    self.parse_product_card_async(session, url, semaphore)
                    for url in batch
                ]
                results = await asyncio.gather(*tasks, return_exceptions=True)

                batch_cards = []
                for url, result in zip(batch, results):
                    if isinstance(result, Exception):
                        self.log_issue(
                            "parse_product_card_error",
                            product_url=url,
                            error=str(result),
                        )
                    else:
                        batch_cards.append(result)

                if batch_cards:
                    self.extend_product_cards(batch_cards)
                    all_new_cards.extend(batch_cards)

                print(
                    f"   Карточки: обработано {min(offset + batch_size, len(urls))}/{len(urls)}, "
                    f"успешно в батче: {len(batch_cards)}"
                )

        return all_new_cards
    
    def walk_category_tree(self, section_url, group, path_names=None, parent_url=""):
        section_url = normalize_url(section_url)

        if section_url in self.visited_category_urls:
            return

        self.visited_category_urls.add(section_url)

        if path_names is None:
            path_names = [group["name"]]

        try:
            soup = self.get_soup(section_url)
        except Exception as e:
            self.log_issue(
                "category_fetch_error",
                section_url=section_url,
                error=str(e),
            )
            return

        child_collections = self.extract_collections(
            soup=soup,
            group=group,
            parent_url=section_url,
        )

        if child_collections:
            self.extend_collections(child_collections)

            print(f"   Категория: {' / '.join(path_names)} | подгрупп: {len(child_collections)}")

            for child in child_collections:
                self.walk_category_tree(
                    section_url=child["url"],
                    group=group,
                    path_names=path_names + [child["name"]],
                    parent_url=section_url,
                )

            return

        product_rows = self.extract_listing_products(
            soup=soup,
            group=group,
            collection={
                "root_group_slug": group["slug"],
                "root_group_name": group["name"],
                "name": path_names[-1],
                "slug": slug_from_url(section_url),
                "url": section_url,
                "parent_url": normalize_url(parent_url),
                "image": "",
                "image_alt": "",
                "image_title": "",
                "sort_order": 0,
            },
            source_url=section_url,
        )

        if product_rows:
            leaf_collection = {
                "root_group_slug": group["slug"],
                "root_group_name": group["name"],
                "name": path_names[-1],
                "slug": slug_from_url(section_url),
                "url": section_url,
                "parent_url": normalize_url(parent_url),
                "image": "",
                "image_alt": "",
                "image_title": "",
                "sort_order": len(self.collections) + 1,
            }

            self.extend_collections([leaf_collection])

            print(f"   Конечная подгруппа: {' / '.join(path_names)}")

            self.parse_collection_pages_limited(
                section_url=section_url,
                group=group,
                current_collection=leaf_collection,
            )
        else:
            self.log_issue(
                "empty_or_unknown_category",
                section_url=section_url,
                path=path_names,
            )
            print(f"   Пустая/нестандартная категория: {' / '.join(path_names)}")    

    def listing_start_url(self, url):
        url = normalize_url(url)

        if "display=" in url:
            return url

        parsed = urlparse(url)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        query["display"] = "table"

        parsed = parsed._replace(query=urlencode(query, doseq=True))
        return normalize_url(urlunparse(parsed))

    def extract_next_listing_url(self, soup):
        link = soup.select_one("div.module-pagination a.flex-next[href]")
        if not link:
            return ""
        return normalize_url(link.get("href")) 

    def extract_gallery_from_soup(self, soup):
        gallery = []

        def add_gallery_image(full_image="", preview_image="", alt="", title=""):
            full_image = abs_url(full_image)
            preview_image = abs_url(preview_image)

            if not full_image and not preview_image:
                return

            if full_image and not is_image_url(full_image):
                full_image = ""

            if preview_image and not is_image_url(preview_image):
                preview_image = ""

            if not full_image and not preview_image:
                return

            gallery.append({
                "full_image": full_image,
                "preview_image": preview_image,
                "display_image": full_image or preview_image,
                "alt": clean_text(alt),
                "title": clean_text(title),
            })

        for li in soup.select(".item_slider .slides li"):
            a = li.select_one("a.popup_link[href], a.fancy[href]")
            img = li.select_one("img")

            full_image = ""
            preview_image = ""
            alt = ""
            title = ""

            itemprop_link = li.select_one('link[itemprop="image"][href]')

            if a and a.get("href"):
                full_image = a.get("href")
            elif itemprop_link:
                full_image = itemprop_link.get("href")

            if img:
                preview_image = (
                    img.get("data-src")
                    or img.get("data-lazyload")
                    or img.get("src")
                    or ""
                )
                alt = img.get("alt") or ""
                title = img.get("title") or ""

            add_gallery_image(
                full_image=full_image,
                preview_image=preview_image,
                alt=alt,
                title=title,
            )

        for link in soup.select('.catalog_detail.detail link[itemprop="image"][href]'):
            add_gallery_image(full_image=link.get("href"))

        for img in soup.select(".catalog_detail.detail .item_slider img"):
            add_gallery_image(
                preview_image=(
                    img.get("data-src")
                    or img.get("data-lazyload")
                    or img.get("src")
                    or ""
                ),
                alt=img.get("alt") or "",
                title=img.get("title") or "",
            )

        gallery = unique_by(
            gallery,
            key_func=lambda x: (
                x.get("display_image", ""),
                x.get("full_image", ""),
                x.get("preview_image", ""),
            )
        )

        return gallery

def merge_products(listing_products, product_cards):
    cards_by_url = {item["product_url"]: item for item in product_cards}
    grouped_rows = {}

    for row in listing_products:
        grouped_rows.setdefault(row["url"], []).append(row)

    merged = []

    for product_url, rows in grouped_rows.items():
        base_row = rows[0]
        card = cards_by_url.get(product_url, {}) or {}

        card_gallery = card.get("gallery_images", []) or []

        main_image = ""
        preview_image = ""
        full_image = ""
        gallery_images = []

        seen_gallery = set()

        def add_gallery_item(full_img="", preview_img="", alt="", title=""):
            key = (full_img or "", preview_img or "")
            if not (full_img or preview_img):
                return
            if key in seen_gallery:
                return
            seen_gallery.add(key)
            gallery_images.append({
                "full_image": full_img,
                "preview_image": preview_img,
                "alt": alt,
                "title": title,
            })

        for g in card_gallery:
            add_gallery_item(
                full_img=g.get("full_image", ""),
                preview_img=g.get("preview_image", ""),
                alt=g.get("alt", ""),
                title=g.get("title", ""),
            )

        if gallery_images:
            preview_image = gallery_images[0].get("preview_image", "")
            full_image = gallery_images[0].get("full_image", "")
            main_image = (
                full_image
                or preview_image
                or card.get("main_image", "")
            )
        else:
            main_image = card.get("main_image", "")
            preview_image = ""
            full_image = ""

        subgroup_slug = (
            base_row.get("collection_slug", "")
            or card.get("last_category_slug", "")
            or base_row.get("root_group_slug", "")
        )
        subgroup_name = (
            base_row.get("collection_name", "")
            or card.get("last_category_name", "")
            or base_row.get("root_group_name", "")
        )
        subgroup_url = (
            base_row.get("collection_url", "")
            or base_row.get("source_listing_url", "")
            or base_row.get("url", "")
        )

        resolved_name = clean_text(card.get("h1")) or clean_text(base_row.get("name"))
        resolved_name = strip_subgroup_prefix(resolved_name, subgroup_name)

        resolved_article = clean_text(base_row.get("article")) or clean_text(card.get("article"))
        resolved_brand = clean_text(card.get("brand"))

        print(
            f"      Итоговая картинка: {main_image or '—'} | товар: {resolved_name} | артикул: {resolved_article or '—'}"
        )
        print(
            f"      SUBGROUP DEBUG: slug={subgroup_slug or '—'} | name={subgroup_name or '—'} | url={subgroup_url or '—'}"
        )

        merged.append({
            "site_id": base_row.get("site_id", "") or card.get("site_id", ""),
            "url": product_url,
            "slug": base_row.get("slug", ""),
            "name": resolved_name,
            "article": resolved_article,
            "brand": resolved_brand,

            "group_slug": base_row.get("root_group_slug", ""),
            "group_name": base_row.get("root_group_name", ""),

            "subgroup_slug": subgroup_slug,
            "subgroup_name": subgroup_name,
            "subgroup_url": subgroup_url,
            "category_path": card.get("category_path", []),

            "availability_raw": base_row.get("availability_raw", "") or card.get("availability_raw_fallback", ""),
            "availability": base_row.get("availability", "") or card.get("availability_fallback", ""),
            "stock_qty": (
                base_row.get("stock_qty", None)
                if base_row.get("stock_qty", None) is not None
                else card.get("stock_qty_fallback", None)
            ),
            "price_value": (
                base_row.get("price_value", None)
                if base_row.get("price_value", None) is not None
                else card.get("price_fallback", None)
            ),
            "currency": base_row.get("currency", "") or card.get("currency_fallback", ""),
            "measure": base_row.get("measure", "") or card.get("measure_fallback", ""),

            "preview_image": preview_image,
            "full_image": full_image,
            "main_image": main_image,
            "gallery_images": gallery_images,

            "description": card.get("description", ""),
            "specifications": normalize_specifications(card.get("specifications", [])),
        })

    merged = unique_by(merged, key_func=lambda x: x["url"])
    return merged

def build_final_result(group, collections, products, issues):
    return {
        "group": group,
        "collections": collections,
        "products": products,
        "stats": {
            "collections_count": len(collections),
            "products_count": len(products),
            "issues_count": len(issues),
        },
        "issues": issues,
    }

def parse_one_group(group_url):
    group_url = normalize_url(group_url)
    group_slug = slug_from_url(group_url)
    paths = make_output_paths(group_slug)

    parser = UniversalCatalogParser(
        delay=0.15,
        timeout=30,
        max_retries=4,
        async_concurrency=10,
        max_products_per_collection=MAX_PRODUCTS_PER_COLLECTION,
    )

    print("=" * 100)
    print(f"СТАРТ ГРУППЫ: {group_url}")

    group = parser.build_group_from_url(group_url)

    try:
        group_soup = parser.get_soup(group_url)
        group = parser.enrich_group_name_from_page(group_soup, group)
    except Exception as e:
        print(f"Ошибка загрузки группы: {e}")
        return {
            "group_url": group_url,
            "group_name": group_slug,
            "ok": False,
            "error": str(e),
            "file": "",
        }

    parser.group = group

    print(f"   Группа: {group['name']}")
    print(f"   URL: {group['url']}")

    print("2. Рекурсивно собираем все подгруппы и конечные листинги...")

    try:
        parser.walk_category_tree(
            section_url=group["url"],
            group=group,
            path_names=[group["name"]],
            parent_url="",
        )
    except Exception as e:
        parser.log_issue(
            "recursive_group_parse_error",
            group_url=group["url"],
            group_name=group["name"],
            error=str(e),
        )
        print(f"   Ошибка рекурсивного обхода: {e}")

    print(f"   Всего подгрупп/конечных категорий: {len(parser.collections)}")
    print(f"   Строк листинга собрано: {len(parser.listing_products)}")

    unique_urls = sorted({x["url"] for x in parser.listing_products if x.get("url")})

    print("4. Асинхронно парсим карточки товаров...")
    print(f"   Уникальных карточек: {len(unique_urls)}")

    asyncio.run(parser.parse_product_cards_async(unique_urls, batch_size=100))

    print("5. Объединяем данные...")
    merged_products = merge_products(parser.listing_products, parser.product_cards)
    final_result = build_final_result(parser.group, parser.collections, merged_products, parser.issues)

    paths["partial"].write_text(
        json.dumps(final_result, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    paths["partial"].replace(paths["result"])

    print("Готово")
    print(f"Группа: {parser.group['name']}")
    print(f"Подгрупп: {len(parser.collections)}")
    print(f"Строк листинга: {len(parser.listing_products)}")
    print(f"Уникальных товаров: {len(unique_urls)}")
    print(f"Карточек товаров: {len(parser.product_cards)}")
    print(f"Итоговых товаров: {len(merged_products)}")
    print(f"Ошибок: {len(parser.issues)}")
    print("Файл:")
    print(f" - {paths['result']}")

    return {
        "group_url": group["url"],
        "group_name": group["name"],
        "ok": True,
        "error": "",
        "file": str(paths["result"]),
        "collections_count": len(parser.collections),
        "products_count": len(merged_products),
        "issues_count": len(parser.issues),
    }

def main():
    if len(sys.argv) > 1:
        group_url = normalize_url(sys.argv[1].strip())
        parse_one_group(group_url)
        return

    parser = UniversalCatalogParser(
        delay=0.15,
        timeout=30,
        max_retries=4,
        async_concurrency=10,
        max_products_per_collection=MAX_PRODUCTS_PER_COLLECTION,
    )

    print("1. Собираем все группы каталога...")
    try:
        groups = parser.extract_all_groups()
    except Exception as e:
        print(f"Ошибка получения списка групп: {e}")
        raise

    print(f"Найдено групп: {len(groups)}")

    print("Найденные группы:")
    for g in groups:
        print(f" - {g['url']}")

    results = []

    for group in groups:
        group_slug = clean_text(group.get("slug")) or slug_from_url(group["url"])
        output_path = make_output_paths(group_slug)["result"]

        if output_path.exists():
            print("")
            print(f"[SKIP] Уже есть файл: {output_path}")
            results.append({
                "group_url": group["url"],
                "group_name": group["name"],
                "ok": True,
                "skipped": True,
                "error": "",
                "file": str(output_path),
            })
            continue

        print("")
        print(f"Обрабатываем группу: {group['name']}")
        res = parse_one_group(group["url"])
        results.append(res)

    summary_path = Path("out_catalog_groups") / "_summary.json"
    summary_path.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    ok_count = sum(1 for x in results if x.get("ok"))
    bad_count = len(results) - ok_count

    print("")
    print("=" * 100)
    print("ОБЩАЯ СВОДКА")
    print(f"Всего групп: {len(results)}")
    print(f"Успешно: {ok_count}")
    print(f"С ошибками: {bad_count}")
    print(f"Сводный файл: {summary_path}")

if __name__ == "__main__":
    main()