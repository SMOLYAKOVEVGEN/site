import json
import re
import time
from typing import Any

from supabase import create_client, Client

SUPABASE_URL = "https://btppiivskcahxrswlwzs.supabase.co"
SUPABASE_KEY = "sb_publishable_cirAybq5ttvIUwnARZ-P4w_HhVuM1ks"

PRODUCTS_FILE = "products.json"

# для дозапуска с места падения
START_FROM = 1020

# для будущих тестов можно ограничивать число товаров:
# LIMIT = 50
LIMIT = None


def execute_with_retry(action, label: str = "", retries: int = 5, base_delay: float = 1.5):
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            return action()
        except Exception as e:
            last_error = e
            print(f"[retry {attempt}/{retries}] {label}: {e}")
            if attempt < retries:
                time.sleep(base_delay * attempt)
    raise last_error


def parse_price(value: Any) -> float:
    if value is None:
        return 0.0
    s = str(value).strip()
    s = s.replace("\xa0", " ")
    s = s.replace("₽", "")
    s = s.replace("в‚Ѕ", "")
    s = s.replace(" ", "")
    s = s.replace(",", ".")
    m = re.findall(r"\d+(?:\.\d+)?", s)
    if not m:
        return 0.0
    try:
        return float(m[0])
    except ValueError:
        return 0.0


def is_available_text(value: Any) -> bool:
    s = str(value or "").strip().lower()
    return "в наличии" in s


def safe_slug(value: Any, fallback: str) -> str:
    s = str(value or "").strip()
    if s:
        return s
    s = fallback.strip().lower()
    s = re.sub(r"[^a-z0-9а-яё\- ]+", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-{2,}", "-", s)
    return s.strip("-") or "item"


def load_products() -> list[dict[str, Any]]:
    with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if START_FROM:
        data = data[START_FROM:]

    if LIMIT is not None:
        data = data[:LIMIT]

    return data


def upsert_brand(supabase: Client, brand_name: str) -> str | None:
    brand_name = (brand_name or "").strip()
    if not brand_name:
        return None

    slug = safe_slug(brand_name.lower(), brand_name.lower())

    existing = execute_with_retry(
        lambda: supabase.table("brands").select("id").eq("slug", slug).limit(1).execute(),
        f"select brand {slug}",
    )

    if existing.data:
        return existing.data[0]["id"]

    inserted = execute_with_retry(
        lambda: supabase.table("brands").insert({
            "name": brand_name,
            "slug": slug,
        }).execute(),
        f"insert brand {slug}",
    )

    if inserted.data:
        return inserted.data[0]["id"]

    return None


def upsert_category(
    supabase: Client,
    name: str,
    slug: str,
    description: str | None = None,
    parent_id: str | None = None,
    image: str | None = None,
    source_type: str = "group",
) -> str:
    slug = safe_slug(slug, name)

    existing = execute_with_retry(
        lambda: supabase.table("categories").select("id,parent_id").eq("slug", slug).limit(1).execute(),
        f"select category {slug}",
    )

    payload = {
        "name": name,
        "slug": slug,
        "description": description,
        "parent_id": parent_id,
        "image": image,
        "source_type": source_type,
    }

    if existing.data:
        category_id = existing.data[0]["id"]
        execute_with_retry(
            lambda: supabase.table("categories").update(payload).eq("id", category_id).execute(),
            f"update category {slug}",
        )
        return category_id

    inserted = execute_with_retry(
        lambda: supabase.table("categories").insert(payload).execute(),
        f"insert category {slug}",
    )
    return inserted.data[0]["id"]


def upsert_product(
    supabase: Client,
    item: dict[str, Any],
    brand_id: str | None,
    category_id: str | None,
) -> str:
    slug = safe_slug(item.get("slug"), item.get("name", "product"))

    payload = {
        "name": item.get("name") or "",
        "slug": slug,
        "sku": item.get("article") or "",
        "price": parse_price(item.get("price")),
        "description": item.get("full_description") or item.get("short_description") or "",
        "short_description": item.get("short_description") or "",
        "full_description": item.get("full_description") or "",
        "brand_id": brand_id,
        "category_id": category_id,
        "is_available": is_available_text(item.get("availability")),
        "availability_text": item.get("availability") or "",
        "source_url": item.get("url") or "",
        "specifications": item.get("specifications") or {},
    }

    existing = execute_with_retry(
        lambda: supabase.table("products").select("id").eq("slug", slug).limit(1).execute(),
        f"select product {slug}",
    )

    if existing.data:
        product_id = existing.data[0]["id"]
        execute_with_retry(
            lambda: supabase.table("products").update(payload).eq("id", product_id).execute(),
            f"update product {slug}",
        )
        return product_id

    inserted = execute_with_retry(
        lambda: supabase.table("products").insert(payload).execute(),
        f"insert product {slug}",
    )
    return inserted.data[0]["id"]


def replace_product_images(supabase: Client, product_id: str, images: list[str]) -> None:
    execute_with_retry(
        lambda: supabase.table("product_images").delete().eq("product_id", product_id).execute(),
        f"delete images {product_id}",
    )

    rows = []
    for i, url in enumerate(images or []):
        if not url:
            continue
        rows.append({
            "product_id": product_id,
            "url": url,
            "is_main": i == 0,
            "sort_order": i,
        })

    if rows:
        execute_with_retry(
            lambda: supabase.table("product_images").insert(rows).execute(),
            f"insert images {product_id}",
        )


def replace_product_documents(supabase: Client, product_id: str, documents: Any) -> None:
    execute_with_retry(
        lambda: supabase.table("product_documents").delete().eq("product_id", product_id).execute(),
        f"delete documents {product_id}",
    )

    rows = []

    if isinstance(documents, list):
        for i, doc in enumerate(documents):
            if isinstance(doc, str):
                if doc:
                    rows.append({
                        "product_id": product_id,
                        "url": doc,
                        "name": "",
                        "sort_order": i,
                    })
            elif isinstance(doc, dict):
                url = doc.get("url") or doc.get("href") or ""
                name = doc.get("name") or doc.get("title") or ""
                if url:
                    rows.append({
                        "product_id": product_id,
                        "url": url,
                        "name": name,
                        "sort_order": i,
                    })

    if rows:
        execute_with_retry(
            lambda: supabase.table("product_documents").insert(rows).execute(),
            f"insert documents {product_id}",
        )


def main() -> None:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    products = load_products()

    print(f"Найдено товаров к обработке: {len(products)}")
    print(f"Стартовый индекс: {START_FROM}")

    for idx, item in enumerate(products, start=START_FROM + 1):
        group_name = (item.get("group_name") or "").strip()
        group_slug = (item.get("group_slug") or "").strip()
        subgroup_name = (item.get("subgroup_name") or "").strip()
        subgroup_slug = (item.get("subgroup_slug") or "").strip()
        brand_name = (item.get("brand") or "").strip()

        brand_id = upsert_brand(supabase, brand_name) if brand_name else None

        parent_category_id = None
        if group_name:
            parent_category_id = upsert_category(
                supabase=supabase,
                name=group_name,
                slug=group_slug or group_name,
                description=f"Группа каталога: {group_name}",
                parent_id=None,
                image=None,
                source_type="group",
            )

        category_id = parent_category_id
        if subgroup_name:
            category_id = upsert_category(
                supabase=supabase,
                name=subgroup_name,
                slug=subgroup_slug or subgroup_name,
                description=f"Подгруппа каталога: {subgroup_name}",
                parent_id=parent_category_id,
                image=None,
                source_type="subgroup",
            )

        product_id = upsert_product(
            supabase=supabase,
            item=item,
            brand_id=brand_id,
            category_id=category_id,
        )

        replace_product_images(supabase, product_id, item.get("images") or [])
        replace_product_documents(supabase, product_id, item.get("documents") or [])

        print(f"[{idx}] OK: {item.get('name')}")

        if idx % 25 == 0:
            time.sleep(1.0)

    print("Импорт завершён")


if __name__ == "__main__":
    main()