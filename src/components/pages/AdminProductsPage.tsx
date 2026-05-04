import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminBrandsOptions,
  getAdminCategoriesOptions,
  getAdminProducts,
  type AdminOption,
  type AdminProductListItem,
} from '@/lib/admin-service';

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [brands, setBrands] = useState<AdminOption[]>([]);
  const [categories, setCategories] = useState<AdminOption[]>([]);
  const [loading, setLoading] = useState(true);

  const search = searchParams.get('search') || '';
  const brandId = searchParams.get('brandId') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const page = Number(searchParams.get('page') || '1');

  const [searchInput, setSearchInput] = useState(search);

  async function load() {
    setLoading(true);
    try {
      const [productsRes, brandsRes, categoriesRes] = await Promise.all([
        getAdminProducts({ search, brandId, categoryId, page, limit: 20 }),
        getAdminBrandsOptions(),
        getAdminCategoriesOptions(),
      ]);

      setItems(productsRes.items);
      setBrands(brandsRes);
      setCategories(categoriesRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    load();
  }, [search, brandId, categoryId, page]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);

    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const handleCreate = async () => {
    const id = await createAdminProduct();
    navigate(`/admin/products/${id}`);
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Удалить товар?');
    if (!ok) return;
    await deleteAdminProduct(id);
    await load();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading text-graphite">Товары</h1>
          <p className="text-slate-500 mt-2">Управление каталогом товаров</p>
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-3 hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Новый товар
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6">
        <div className="grid md:grid-cols-[1fr_220px_220px] gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateParam('search', searchInput);
              }}
              placeholder="Поиск по названию, slug, артикулу"
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3"
            />
          </div>

          <select
            value={brandId}
            onChange={(e) => updateParam('brandId', e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="">Все бренды</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={categoryId}
            onChange={(e) => updateParam('categoryId', e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <button
            onClick={() => updateParam('search', searchInput)}
            className="rounded-xl bg-slate-900 text-white px-4 py-2"
          >
            Применить поиск
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_120px_150px] gap-4 px-6 py-4 border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500">
          <div>Товар</div>
          <div>Бренд</div>
          <div>Категория</div>
          <div>Цена</div>
          <div>Действия</div>
        </div>

        {loading ? (
          <div className="p-8 text-slate-500">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-slate-500">Товары не найдены.</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1.6fr_1fr_1fr_120px_150px] gap-4 px-6 py-4 border-b border-slate-100 items-center"
            >
              <div>
                <div className="font-medium text-graphite">{item.name}</div>
                <div className="text-sm text-slate-500 mt-1">{item.sku || item.slug}</div>
              </div>

              <div className="text-sm text-slate-700">{item.brandName || '—'}</div>
              <div className="text-sm text-slate-700">{item.categoryName || '—'}</div>
              <div className="text-sm text-slate-700">
                {item.price > 0 ? `${item.price.toLocaleString('ru-RU')} ₽` : '—'}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/admin/products/${item.id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                </Link>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 p-2 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}