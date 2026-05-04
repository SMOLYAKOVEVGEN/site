import { useEffect, useState } from 'react';
import { Plus, Save } from 'lucide-react';
import {
  createAdminCategory,
  getAdminCategories,
  getAdminCategoriesOptions,
  type AdminCategoryItem,
  type AdminOption,
  updateAdminCategory,
} from '@/lib/admin-service';

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<AdminCategoryItem[]>([]);
  const [options, setOptions] = useState<AdminOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [itemsRes, optionsRes] = await Promise.all([
        getAdminCategories(),
        getAdminCategoriesOptions(),
      ]);
      setItems(itemsRes);
      setOptions(optionsRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const updateItem = (id: string, patch: Partial<AdminCategoryItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleCreate = async () => {
    await createAdminCategory();
    await load();
  };

  const handleSave = async (item: AdminCategoryItem) => {
    setSavingId(item.id);
    try {
      await updateAdminCategory(item);
      await load();
    } catch (e) {
      console.error(e);
      alert('Ошибка сохранения категории');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading text-graphite">Категории</h1>
          <p className="text-slate-500 mt-2">Управление группами и подгруппами</p>
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-3 hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Новая категория
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-slate-500">Загрузка...</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_220px_220px_1fr_110px] gap-4 p-4 border-b border-slate-100 items-center">
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

              <select
                value={item.source_type || 'group'}
                onChange={(e) => updateItem(item.id, { source_type: e.target.value })}
                className="rounded-xl border border-slate-200 px-4 py-3"
              >
                <option value="group">group</option>
                <option value="subgroup">subgroup</option>
              </select>

              <select
                value={item.parent_id || ''}
                onChange={(e) => updateItem(item.id, { parent_id: e.target.value || null })}
                className="rounded-xl border border-slate-200 px-4 py-3"
              >
                <option value="">Без родителя</option>
                {options
                  .filter((x) => x.id !== item.id)
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
              </select>

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