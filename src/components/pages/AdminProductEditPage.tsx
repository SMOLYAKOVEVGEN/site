import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminBrandsOptions,
  getAdminCategoryTree,
  getAdminProductById,
  updateAdminProduct,
  uploadAdminFile,
  type AdminCategoryTreeItem,
  type AdminOption,
  type AdminProductDocument,
  type AdminProductFormData,
  type AdminProductImage,
} from '@/lib/admin-service';

type SpecItem = {
  key: string;
  value: string;
};

function specsObjectToArray(specs: Record<string, string>): SpecItem[] {
  const entries = Object.entries(specs || {});
  if (!entries.length) return [{ key: '', value: '' }];
  return entries.map(([key, value]) => ({ key, value }));
}

function specsArrayToObject(items: SpecItem[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of items) {
    const key = item.key.trim();
    const value = item.value.trim();
    if (key) out[key] = value;
  }
  return out;
}

export default function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [brands, setBrands] = useState<AdminOption[]>([]);
  const [categoryTree, setCategoryTree] = useState<AdminCategoryTreeItem[]>([]);

  const [form, setForm] = useState<AdminProductFormData | null>(null);
  const [specItems, setSpecItems] = useState<SpecItem[]>([{ key: '', value: '' }]);

  const [selectedGroupId, setSelectedGroupId] = useState('');

  const groupOptions = useMemo(() => {
    return categoryTree.filter((item) => item.source_type === 'group');
  }, [categoryTree]);

  const subgroupOptions = useMemo(() => {
    if (!selectedGroupId) return [];
    return categoryTree.filter(
      (item) => item.source_type === 'subgroup' && item.parent_id === selectedGroupId
    );
  }, [categoryTree, selectedGroupId]);

  useEffect(() => {
    async function load() {
      if (!id) return;

      setLoading(true);
      try {
        const [product, brandsRes, categoryTreeRes] = await Promise.all([
          getAdminProductById(id),
          getAdminBrandsOptions(),
          getAdminCategoryTree(),
        ]);

        setBrands(brandsRes);
        setCategoryTree(categoryTreeRes);

        if (!product) {
          setForm(null);
        } else {
          setForm(product);
          setSpecItems(specsObjectToArray(product.specifications));

          if (product.category_id) {
            const selectedCategory = categoryTreeRes.find((x) => x.id === product.category_id);

            if (selectedCategory?.source_type === 'subgroup' && selectedCategory.parent_id) {
              setSelectedGroupId(selectedCategory.parent_id);
            } else if (selectedCategory?.source_type === 'group') {
              setSelectedGroupId(selectedCategory.id);
            } else {
              setSelectedGroupId('');
            }
          } else {
            setSelectedGroupId('');
          }
        }
      } catch (e) {
        console.error(e);
        setForm(null);
        toast.error('Ошибка загрузки товара');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  const canSave = useMemo(() => {
    return Boolean(form?.name.trim() && form?.slug.trim());
  }, [form]);

  const updateField = <K extends keyof AdminProductFormData>(
    key: K,
    value: AdminProductFormData[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateImage = (index: number, patch: Partial<AdminProductImage>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev.images];
      next[index] = { ...next[index], ...patch };
      return { ...prev, images: next };
    });
  };

  const addImage = () => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            images: [
              ...prev.images,
              {
                product_id: prev.id,
                url: '',
                is_main: prev.images.length === 0,
                sort_order: prev.images.length,
              },
            ],
          }
        : prev
    );
  };

  const removeImage = (index: number) => {
    setForm((prev) => {
      if (!prev) return prev;

      const next = prev.images
        .filter((_, i) => i !== index)
        .map((x, i) => ({ ...x, sort_order: i }));

      if (next.length && !next.some((x) => x.is_main)) {
        next[0].is_main = true;
      }

      return { ...prev, images: next };
    });
  };

  const setMainImage = (index: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = prev.images.map((img, i) => ({ ...img, is_main: i === index }));
      return { ...prev, images: next };
    });
  };

  const handleUploadImage = async (file: File) => {
    try {
      const url = await uploadAdminFile(file, 'images');

      setForm((prev) =>
        prev
          ? {
              ...prev,
              images: [
                ...prev.images,
                {
                  product_id: prev.id,
                  url,
                  is_main: prev.images.length === 0,
                  sort_order: prev.images.length,
                },
              ],
            }
          : prev
      );

      toast.success('Изображение загружено');
    } catch (e) {
      console.error(e);
      toast.error('Ошибка загрузки изображения');
    }
  };

  const updateDocument = (index: number, patch: Partial<AdminProductDocument>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev.documents];
      next[index] = { ...next[index], ...patch };
      return { ...prev, documents: next };
    });
  };

  const addDocument = () => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            documents: [
              ...prev.documents,
              {
                product_id: prev.id,
                url: '',
                name: '',
                sort_order: prev.documents.length,
              },
            ],
          }
        : prev
    );
  };

  const removeDocument = (index: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = prev.documents
        .filter((_, i) => i !== index)
        .map((x, i) => ({ ...x, sort_order: i }));
      return { ...prev, documents: next };
    });
  };

  const handleUploadDocument = async (file: File) => {
    try {
      const url = await uploadAdminFile(file, 'documents');

      setForm((prev) =>
        prev
          ? {
              ...prev,
              documents: [
                ...prev.documents,
                {
                  product_id: prev.id,
                  url,
                  name: file.name,
                  sort_order: prev.documents.length,
                },
              ],
            }
          : prev
      );

      toast.success('Документ загружен');
    } catch (e) {
      console.error(e);
      toast.error('Ошибка загрузки документа');
    }
  };

  const updateSpec = (index: number, patch: Partial<SpecItem>) => {
    setSpecItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addSpec = () => {
    setSpecItems((prev) => [...prev, { key: '', value: '' }]);
  };

  const removeSpec = (index: number) => {
    setSpecItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ key: '', value: '' }];
    });
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);

    setForm((prev) => {
      if (!prev) return prev;

      if (!groupId) {
        return {
          ...prev,
          category_id: '',
        };
      }

      const currentSubgroupBelongsToGroup = categoryTree.some(
        (item) =>
          item.id === prev.category_id &&
          item.source_type === 'subgroup' &&
          item.parent_id === groupId
      );

      return {
        ...prev,
        category_id: currentSubgroupBelongsToGroup ? prev.category_id : '',
      };
    });
  };

  const handleSave = async () => {
    if (!form || !canSave) return;

    setSaving(true);
    try {
      await updateAdminProduct({
        ...form,
        specifications: specsArrayToObject(specItems),
        images: form.images.map((img, index) => ({ ...img, sort_order: index })),
        documents: form.documents.map((doc, index) => ({ ...doc, sort_order: index })),
      });

      toast.success('Товар сохранён');
    } catch (e) {
      console.error(e);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500">Загрузка товара...</div>;
  }

  if (!form) {
    return (
      <div>
        <div className="text-2xl font-heading mb-4">Товар не найден</div>
        <Link to="/admin/products" className="text-primary hover:underline">
          Вернуться к списку товаров
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к товарам
          </Link>
          <h1 className="text-3xl font-heading text-graphite">Редактирование товара</h1>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin/products')}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            Закрыть
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="rounded-xl bg-primary text-white px-5 py-3 disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-heading mb-6">Основные данные</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-600 mb-2">Название</label>
                <input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => updateField('slug', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Артикул</label>
                <input
                  value={form.sku}
                  onChange={(e) => updateField('sku', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Цена</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => updateField('price', Number(e.target.value || 0))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Статус наличия</label>
                <input
                  value={form.availability_text}
                  onChange={(e) => updateField('availability_text', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  placeholder="В наличии / Под заказ"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Бренд</label>
                <select
                  value={form.brand_id}
                  onChange={(e) => updateField('brand_id', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                >
                  <option value="">Не выбран</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Группа</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                >
                  <option value="">Не выбрана</option>
                  {groupOptions.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Подгруппа</label>
                <select
                  value={form.category_id}
                  onChange={(e) => updateField('category_id', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  disabled={!selectedGroupId}
                >
                  <option value="">Не выбрана</option>
                  {subgroupOptions.map((subgroup) => (
                    <option key={subgroup.id} value={subgroup.id}>
                      {subgroup.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) => updateField('is_available', e.target.checked)}
                  />
                  Товар в наличии
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-heading mb-6">Описание</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-2">Краткое описание</label>
                <textarea
                  value={form.short_description}
                  onChange={(e) => updateField('short_description', e.target.value)}
                  className="w-full min-h-[120px] rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Полное описание</label>
                <textarea
                  value={form.full_description}
                  onChange={(e) => updateField('full_description', e.target.value)}
                  className="w-full min-h-[220px] rounded-xl border border-slate-200 px-4 py-3"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading">Характеристики</h2>
              <button
                onClick={addSpec}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"
              >
                <Plus className="h-4 w-4" />
                Добавить
              </button>
            </div>

            <div className="space-y-3">
              {specItems.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_44px] gap-3">
                  <input
                    value={item.key}
                    onChange={(e) => updateSpec(index, { key: e.target.value })}
                    placeholder="Название"
                    className="rounded-xl border border-slate-200 px-4 py-3"
                  />
                  <input
                    value={item.value}
                    onChange={(e) => updateSpec(index, { value: e.target.value })}
                    placeholder="Значение"
                    className="rounded-xl border border-slate-200 px-4 py-3"
                  />
                  <button
                    onClick={() => removeSpec(index)}
                    className="rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mx-auto" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading">Изображения</h2>
              <div className="flex gap-2">
                <button
                  onClick={addImage}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"
                >
                  <Plus className="h-4 w-4" />
                  Добавить
                </button>

                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                  Загрузить файл
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadImage(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              {form.images.map((img, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <input
                    value={img.url}
                    onChange={(e) => updateImage(index, { url: e.target.value })}
                    placeholder="URL изображения"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />

                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      checked={Boolean(img.is_main)}
                      onChange={() => setMainImage(index)}
                    />
                    Главное изображение
                  </label>

                  <button
                    onClick={() => removeImage(index)}
                    className="inline-flex items-center gap-2 text-red-600 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    Удалить
                  </button>
                </div>
              ))}

              {form.images.length === 0 && (
                <div className="text-sm text-slate-500">Изображений пока нет.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading">Документы</h2>
              <div className="flex gap-2">
                <button
                  onClick={addDocument}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"
                >
                  <Plus className="h-4 w-4" />
                  Добавить
                </button>

                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                  Загрузить файл
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadDocument(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              {form.documents.map((doc, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <input
                    value={doc.name || ''}
                    onChange={(e) => updateDocument(index, { name: e.target.value })}
                    placeholder="Название документа"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                  <input
                    value={doc.url}
                    onChange={(e) => updateDocument(index, { url: e.target.value })}
                    placeholder="URL PDF/документа"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />

                  <button
                    onClick={() => removeDocument(index)}
                    className="inline-flex items-center gap-2 text-red-600 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    Удалить
                  </button>
                </div>
              ))}

              {form.documents.length === 0 && (
                <div className="text-sm text-slate-500">Документов пока нет.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}