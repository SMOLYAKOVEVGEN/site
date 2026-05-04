import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  importCatalogResult,
  importProducts,
  type CatalogResultInput,
  type CatalogResultProductInput,
  type ImportProductInput,
} from '@/lib/admin-service';

type ImportMode = 'classic' | 'catalog_result' | null;

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const s = String(value || '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'да' || s === 'y';
}

function isCatalogResultInput(value: unknown): value is CatalogResultInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return 'products' in obj || 'collections' in obj || 'group' in obj || 'stats' in obj;
}

function parseJsonText(text: string): {
  mode: ImportMode;
  classicItems: ImportProductInput[];
  catalogResult: CatalogResultInput | null;
} {
  const data = JSON.parse(text);

  if (Array.isArray(data)) {
    return {
      mode: 'classic',
      classicItems: data as ImportProductInput[],
      catalogResult: null,
    };
  }

  if (isCatalogResultInput(data)) {
    return {
      mode: 'catalog_result',
      classicItems: [],
      catalogResult: data,
    };
  }

  throw new Error(
    'JSON должен быть либо массивом товаров, либо объектом формата catalog_result.json'
  );
}

function parseXlsxRows(rows: Record<string, unknown>[]): ImportProductInput[] {
  return rows.map((row) => ({
    name: String(row.name || row.Name || row.NAME || '').trim(),
    slug: String(row.slug || row.Slug || row.SLUG || '').trim(),
    sku: String(row.sku || row.SKU || '').trim(),
    price: Number(row.price || row.Price || 0),
    brand: String(row.brand || row.Brand || '').trim(),
    group: String(row.group || row.Group || '').trim(),
    subgroup: String(row.subgroup || row.Subgroup || '').trim(),
    short_description: String(
      row.short_description || row.shortDescription || row.ShortDescription || ''
    ).trim(),
    full_description: String(
      row.full_description || row.fullDescription || row.FullDescription || ''
    ).trim(),
    availability_text: String(
      row.availability_text || row.availabilityText || row.AvailabilityText || ''
    ).trim(),
    is_available: normalizeBoolean(
      row.is_available || row.isAvailable || row.IsAvailable || false
    ),
    images: String(row.images || row.Images || '')
      .split('|')
      .map((x) => x.trim())
      .filter(Boolean),
  }));
}

function getCatalogProducts(catalog: CatalogResultInput | null): CatalogResultProductInput[] {
  return Array.isArray(catalog?.products) ? catalog.products : [];
}

function formatPrice(value: unknown, currency?: string) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '—';
  const formatted = num.toLocaleString('ru-RU');
  return currency ? `${formatted} ${currency}` : `${formatted} ₽`;
}

export default function AdminImportPage() {
  const [jsonText, setJsonText] = useState('');
  const [classicItems, setClassicItems] = useState<ImportProductInput[]>([]);
  const [catalogResult, setCatalogResult] = useState<CatalogResultInput | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [sourceLabel, setSourceLabel] = useState('JSON');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const previewClassicTop = useMemo(() => classicItems.slice(0, 10), [classicItems]);
  const previewCatalogProducts = useMemo(() => getCatalogProducts(catalogResult), [catalogResult]);
  const previewCatalogTop = useMemo(
    () => previewCatalogProducts.slice(0, 10),
    [previewCatalogProducts]
  );

  const clearPreview = () => {
    setClassicItems([]);
    setCatalogResult(null);
    setImportMode(null);
  };

  const handleBuildPreviewFromJson = () => {
    try {
      const parsed = parseJsonText(jsonText);

      if (parsed.mode === 'classic') {
        setClassicItems(parsed.classicItems);
        setCatalogResult(null);
        setImportMode('classic');
        setSourceLabel('JSON: массив товаров');
        setResult(`Предпросмотр готов: ${parsed.classicItems.length} товаров`);
        return;
      }

      setClassicItems([]);
      setCatalogResult(parsed.catalogResult);
      setImportMode('catalog_result');

      const productsCount = getCatalogProducts(parsed.catalogResult).length;
      const collectionsCount = Array.isArray(parsed.catalogResult?.collections)
        ? parsed.catalogResult.collections.length
        : 0;
      const hasGroup = parsed.catalogResult?.group ? 1 : 0;

      setSourceLabel('JSON: catalog_result');
      setResult(
        `Предпросмотр готов: group=${hasGroup}, collections=${collectionsCount}, products=${productsCount}`
      );
    } catch (e: any) {
      clearPreview();
      setResult(`Ошибка JSON: ${e.message}`);
    }
  };

  const handleFileChange = async (file: File) => {
    try {
      setSelectedFile(file);

      const lower = file.name.toLowerCase();

      if (lower.endsWith('.json')) {
        const text = await file.text();
        setJsonText(text);

        const parsed = parseJsonText(text);

        if (parsed.mode === 'classic') {
          setClassicItems(parsed.classicItems);
          setCatalogResult(null);
          setImportMode('classic');
          setSourceLabel(`Файл JSON: ${file.name} (массив товаров)`);
          setResult(`Предпросмотр готов: ${parsed.classicItems.length} товаров`);
          return;
        }

        setClassicItems([]);
        setCatalogResult(parsed.catalogResult);
        setImportMode('catalog_result');

        const productsCount = getCatalogProducts(parsed.catalogResult).length;
        const collectionsCount = Array.isArray(parsed.catalogResult?.collections)
          ? parsed.catalogResult.collections.length
          : 0;
        const hasGroup = parsed.catalogResult?.group ? 1 : 0;

        setSourceLabel(`Файл JSON: ${file.name} (catalog_result)`);
        setResult(
          `Предпросмотр готов: group=${hasGroup}, collections=${collectionsCount}, products=${productsCount}`
        );
        return;
      }

      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) throw new Error('В Excel нет листов');

        const worksheet = workbook.Sheets[firstSheet];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        const parsed = parseXlsxRows(rows);

        setClassicItems(parsed);
        setCatalogResult(null);
        setImportMode('classic');
        setSourceLabel(`Файл Excel: ${file.name}`);
        setResult(`Предпросмотр готов: ${parsed.length} товаров`);
        return;
      }

      throw new Error('Поддерживаются только .json, .xlsx, .xls');
    } catch (e: any) {
      clearPreview();
      setResult(`Ошибка файла: ${e.message}`);
    }
  };

  const handleImport = async () => {
    if (importMode === 'classic' && !classicItems.length) {
      setResult('Сначала подготовь предпросмотр');
      return;
    }

    if (importMode === 'catalog_result' && !catalogResult) {
      setResult('Сначала подготовь предпросмотр');
      return;
    }

    if (!importMode) {
      setResult('Сначала подготовь предпросмотр');
      return;
    }

    setLoading(true);
    try {
      const res =
        importMode === 'catalog_result'
          ? await importCatalogResult(catalogResult as CatalogResultInput)
          : await importProducts(classicItems);

      setResult(
        [
          `Импорт завершён.`,
          `Создано: ${res.created}`,
          `Обновлено: ${res.updated}`,
          `Пропущено: ${res.skipped}`,
          `Ошибок: ${res.errors.length}`,
          '',
          ...res.errors.slice(0, 100),
        ].join('\n')
      );
    } catch (e: any) {
      setResult(`Ошибка импорта: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderClassicPreview = () => (
    <>
      <div className="grid grid-cols-[1.2fr_220px_220px_140px] gap-4 px-6 py-4 border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500">
        <div>Название</div>
        <div>Бренд</div>
        <div>Подгруппа</div>
        <div>Цена</div>
      </div>

      {previewClassicTop.map((item, index) => (
        <div
          key={`${item.slug}-${index}`}
          className="grid grid-cols-[1.2fr_220px_220px_140px] gap-4 px-6 py-4 border-b border-slate-100 items-center"
        >
          <div>
            <div className="font-medium text-graphite">{item.name || '—'}</div>
            <div className="text-sm text-slate-500 mt-1">{item.slug || '—'}</div>
          </div>
          <div className="text-sm text-slate-700">{item.brand || '—'}</div>
          <div className="text-sm text-slate-700">{item.subgroup || '—'}</div>
          <div className="text-sm text-slate-700">
            {item.price ? `${Number(item.price).toLocaleString('ru-RU')} ₽` : '—'}
          </div>
        </div>
      ))}

      {classicItems.length > 10 && (
        <div className="p-4 text-sm text-slate-500">
          Показаны первые 10 строк из {classicItems.length}.
        </div>
      )}
    </>
  );

  const renderCatalogResultPreview = () => {
    const collectionsCount = Array.isArray(catalogResult?.collections)
      ? catalogResult.collections.length
      : 0;

    return (
      <>
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 text-sm text-slate-700">
          <div>Группа: {catalogResult?.group?.name || '—'}</div>
          <div>Подгрупп: {collectionsCount}</div>
          <div>Товаров: {previewCatalogProducts.length}</div>
        </div>

        <div className="grid grid-cols-[1.2fr_220px_220px_140px] gap-4 px-6 py-4 border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500">
          <div>Название</div>
          <div>Бренд</div>
          <div>Подгруппа</div>
          <div>Цена</div>
        </div>

        {previewCatalogTop.map((item, index) => (
          <div
            key={`${item.url}-${index}`}
            className="grid grid-cols-[1.2fr_220px_220px_140px] gap-4 px-6 py-4 border-b border-slate-100 items-center"
          >
            <div>
              <div className="font-medium text-graphite">{item.name || '—'}</div>
              <div className="text-sm text-slate-500 mt-1">{item.slug || '—'}</div>
            </div>
            <div className="text-sm text-slate-700">{item.brand || '—'}</div>
            <div className="text-sm text-slate-700">{item.subgroup_name || '—'}</div>
            <div className="text-sm text-slate-700">
              {formatPrice(item.price_value, item.currency)}
            </div>
          </div>
        ))}

        {previewCatalogProducts.length > 10 && (
          <div className="p-4 text-sm text-slate-500">
            Показаны первые 10 строк из {previewCatalogProducts.length}.
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading text-graphite mb-2">Импорт товаров</h1>
        <p className="text-slate-500">
          JSON и Excel импортируются напрямую без import job.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <div className="text-sm text-slate-600 mb-2">Загрузка файла</div>
          <input
            type="file"
            accept=".json,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileChange(file);
            }}
            className="block w-full rounded-xl border border-slate-200 px-4 py-3"
          />
          {selectedFile && (
            <div className="mt-2 text-sm text-slate-500">
              Выбран файл: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        <div>
          <div className="text-sm text-slate-600 mb-2">Или вставь JSON вручную</div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='[{"name":"Товар","slug":"tovar-1"}] или {"group":{},"collections":[],"products":[]}'
            className="w-full min-h-[260px] rounded-xl border border-slate-200 px-4 py-3"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleBuildPreviewFromJson}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
          >
            Построить предпросмотр из JSON
          </button>

          <button
            onClick={handleImport}
            disabled={loading}
            className="rounded-xl bg-primary text-white px-5 py-3 disabled:opacity-50"
          >
            {loading ? 'Импорт...' : 'Импортировать'}
          </button>
        </div>

        {result && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 whitespace-pre-line">
            {result}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="text-lg font-heading">Предпросмотр</div>
          <div className="text-sm text-slate-500 mt-1">{sourceLabel}</div>
          <div className="text-sm text-slate-400 mt-1">
            Режим:{' '}
            {importMode === 'catalog_result'
              ? 'catalog_result'
              : importMode === 'classic'
              ? 'classic'
              : 'не выбран'}
          </div>
        </div>

        {importMode === null ? (
          <div className="p-6 text-slate-500">Предпросмотр пока пуст.</div>
        ) : importMode === 'classic' ? (
          classicItems.length === 0 ? (
            <div className="p-6 text-slate-500">Предпросмотр пока пуст.</div>
          ) : (
            renderClassicPreview()
          )
        ) : previewCatalogProducts.length === 0 ? (
          <div className="p-6 text-slate-500">В catalog_result нет товаров.</div>
        ) : (
          renderCatalogResultPreview()
        )}
      </div>
    </div>
  );
}