import { useEffect, useState } from 'react';
import { Plus, Save } from 'lucide-react';
import {
  createAdminBrand,
  getAdminBrands,
  type AdminBrandItem,
  updateAdminBrand,
} from '@/lib/admin-service';

export default function AdminBrandsPage() {
  const [items, setItems] = useState<AdminBrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await getAdminBrands();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const updateItem = (id: string, patch: Partial<AdminBrandItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleCreate = async () => {
    await createAdminBrand();
    await load();
  };

  const handleSave = async (item: AdminBrandItem) => {
    setSavingId(item.id);
    try {
      await updateAdminBrand(item);
      await load();
    } catch (e) {
      console.error(e);
      alert('Ошибка сохранения бренда');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading text-graphite">Бренды</h1>
          <p className="text-slate-500 mt-2">Управление брендами каталога</p>
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-3 hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Новый бренд
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-slate-500">Загрузка...</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_1fr_120px] gap-4 p-4 border-b border-slate-100 items-center">
              <input
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                className="rounded-xl border border-slate-200 px-4 py-3"
              />
              <input
                value={item.slug}
                onChange={(e) => updateItem(item.id, { slug: e.target.value })}
                className="rounded-xl border border-slate-200 px-4 py-3"
              />
              <button
                onClick={() => handleSave(item)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50"
              >
                <Save className="h-4 w-4" />
                {savingId === item.id ? '...' : 'Сохранить'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}