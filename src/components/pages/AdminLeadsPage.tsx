import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Mail, Phone, Building2, Package2, RefreshCw } from 'lucide-react';
import {
  getAdminLeadById,
  getAdminLeads,
  updateAdminLeadStatus,
  type AdminLeadDetails,
  type AdminLeadListItem,
  type AdminLeadStatus,
} from '@/lib/admin-leads-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: Array<{ value: '' | AdminLeadStatus; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: 'new', label: 'Новая' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'closed', label: 'Закрыта' },
  { value: 'spam', label: 'Спам' },
];

function formatLeadStatus(status: AdminLeadStatus): string {
  switch (status) {
    case 'new':
      return 'Новая';
    case 'in_progress':
      return 'В работе';
    case 'closed':
      return 'Закрыта';
    case 'spam':
      return 'Спам';
    default:
      return status;
  }
}

function getStatusBadgeClass(status: AdminLeadStatus): string {
  switch (status) {
    case 'new':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'in_progress':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'closed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'spam':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function formatDate(value: string): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function buildProductLink(productId: string, productSlug: string): string {
  if (productId) {
    return `/product/${productId}`;
  }

  if (productSlug) {
    return `/catalog/${productSlug}`;
  }

  return '#';
}

export default function AdminLeadsPage() {
  const [items, setItems] = useState<AdminLeadListItem[]>([]);
  const [selectedLead, setSelectedLead] = useState<AdminLeadDetails | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | AdminLeadStatus>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const selectedLeadId = selectedLead?.id || '';

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    async function loadLeads() {
      try {
        setIsListLoading(true);

        const result = await getAdminLeads({
          search,
          status,
          page,
          limit,
        });

        if (!active) return;

        setItems(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);

        if (result.items.length === 0) {
          setSelectedLead(null);
          return;
        }

        const stillExists = selectedLeadId
          ? result.items.some((item) => item.id === selectedLeadId)
          : false;

        if (!stillExists) {
          const firstId = result.items[0]?.id || '';
          if (firstId) {
            void loadLeadDetails(firstId);
          } else {
            setSelectedLead(null);
          }
        }
      } catch (error) {
        console.error('Failed to load leads:', error);
        toast.error('Не удалось загрузить заявки');
      } finally {
        if (active) {
          setIsListLoading(false);
        }
      }
    }

    loadLeads();

    return () => {
      active = false;
    };
  }, [search, status, page]);

  async function loadLeadDetails(id: string) {
    try {
      setIsDetailsLoading(true);
      const lead = await getAdminLeadById(id);
      setSelectedLead(lead);
    } catch (error) {
      console.error('Failed to load lead details:', error);
      toast.error('Не удалось загрузить заявку');
    } finally {
      setIsDetailsLoading(false);
    }
  }

  const selectedSummary = useMemo(
    () => items.find((item) => item.id === selectedLeadId) || null,
    [items, selectedLeadId]
  );

  const handleRefresh = async () => {
    try {
      setIsListLoading(true);

      const result = await getAdminLeads({
        search,
        status,
        page,
        limit,
      });

      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);

      if (selectedLeadId) {
        await loadLeadDetails(selectedLeadId);
      } else if (result.items[0]?.id) {
        await loadLeadDetails(result.items[0].id);
      }
    } catch (error) {
      console.error('Failed to refresh leads:', error);
      toast.error('Не удалось обновить список');
    } finally {
      setIsListLoading(false);
    }
  };

  const handleStatusChange = async (nextStatus: AdminLeadStatus) => {
    if (!selectedLead) return;

    try {
      setIsStatusUpdating(true);
      await updateAdminLeadStatus(selectedLead.id, nextStatus);

      setSelectedLead({
        ...selectedLead,
        status: nextStatus,
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedLead.id
            ? {
                ...item,
                status: nextStatus,
              }
            : item
        )
      );

      toast.success('Статус заявки обновлен');
    } catch (error) {
      console.error('Failed to update lead status:', error);
      toast.error('Не удалось обновить статус');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-heading text-graphite">Заявки</h1>
          <p className="mt-2 text-sm text-slate-500">
            Управление входящими заявками с сайта
          </p>
        </div>

        <Button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-5 space-y-4">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Поиск: имя, телефон, email, компания"
            />

            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value as '' | AdminLeadStatus);
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="text-sm text-slate-500">
              Всего заявок: {total}
            </div>
          </div>

          <div className="min-h-[420px]">
            {isListLoading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Заявок пока нет
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const active = item.id === selectedLeadId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void loadLeadDetails(item.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-graphite">
                            {item.customerName || 'Без имени'}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDate(item.createdAt)}
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {formatLeadStatus(item.status)}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-slate-600">
                        <div>{item.phone || 'Телефон не указан'}</div>
                        {item.email && <div className="truncate">{item.email}</div>}
                        {item.company && <div className="truncate">{item.company}</div>}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>Источник: {item.source || 'site'}</span>
                        <span>Товаров: {item.itemsCount}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              Назад
            </Button>

            <div className="text-sm text-slate-500">
              Страница {page} из {Math.max(totalPages, 1)}
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Вперед
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          {isDetailsLoading ? (
            <div className="flex min-h-[600px] items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : !selectedLead ? (
            <div className="flex min-h-[600px] items-center justify-center text-sm text-slate-500">
              Выберите заявку слева
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                <div>
                  <div className="text-sm text-slate-500">ID заявки</div>
                  <div className="mt-1 break-all text-sm text-graphite">
                    {selectedLead.id}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                        selectedLead.status
                      )}`}
                    >
                      {formatLeadStatus(selectedLead.status)}
                    </span>

                    <span className="text-sm text-slate-500">
                      Создана: {formatDate(selectedLead.createdAt)}
                    </span>

                    {selectedLead.updatedAt && (
                      <span className="text-sm text-slate-500">
                        Обновлена: {formatDate(selectedLead.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full max-w-xs">
                  <label className="mb-2 block text-sm text-slate-600">Статус заявки</label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) =>
                      void handleStatusChange(e.target.value as AdminLeadStatus)
                    }
                    disabled={isStatusUpdating}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                  >
                    {STATUS_OPTIONS.filter((item) => item.value).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 text-base font-semibold text-graphite">
                    Контактные данные
                  </div>

                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-slate-500">Телефон</div>
                        <div className="mt-1 text-graphite">
                          {selectedLead.phone || 'Не указан'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-slate-500">Email</div>
                        <div className="mt-1 break-all text-graphite">
                          {selectedLead.email || 'Не указан'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Building2 className="mt-0.5 h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-slate-500">Компания</div>
                        <div className="mt-1 text-graphite">
                          {selectedLead.company || 'Не указана'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 text-base font-semibold text-graphite">
                    Источник заявки
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-slate-500">Источник</div>
                      <div className="mt-1 text-graphite">
                        {selectedLead.source || 'site'}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500">URL страницы</div>
                      {selectedLead.pageUrl ? (
                        <a
                          href={selectedLead.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-2 break-all text-primary hover:underline"
                        >
                          {selectedLead.pageUrl}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <div className="mt-1 text-graphite">Не указан</div>
                      )}
                    </div>

                    <div>
                      <div className="text-slate-500">UTM</div>
                      <div className="mt-1 text-graphite">
                        source: {selectedLead.utmSource || '—'}
                      </div>
                      <div className="text-graphite">
                        medium: {selectedLead.utmMedium || '—'}
                      </div>
                      <div className="text-graphite">
                        campaign: {selectedLead.utmCampaign || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 text-base font-semibold text-graphite">
                  Комментарий
                </div>

                <div className="whitespace-pre-line text-sm leading-6 text-graphite">
                  {selectedLead.comment || 'Комментарий отсутствует'}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2 text-base font-semibold text-graphite">
                  <Package2 className="h-4 w-4" />
                  Товары в заявке
                </div>

                {selectedLead.items.length === 0 ? (
                  <div className="text-sm text-slate-500">Товары не найдены</div>
                ) : (
                  <div className="space-y-3">
                    {selectedLead.items.map((item) => {
                      const productHref = buildProductLink(item.productId, item.productSlug);

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-graphite">
                              {item.productName || 'Без названия'}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              ID товара: {item.productId || '—'}
                            </div>

                            {item.productSlug && (
                              <div className="mt-1 text-xs text-slate-500">
                                Slug: {item.productSlug}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                              Кол-во: {item.quantity}
                            </div>

                            {productHref !== '#' && (
                              <a
                                href={productHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                Открыть товар
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedSummary && (
                <div className="text-xs text-slate-400">
                  Краткая сводка: {selectedSummary.customerName || 'Без имени'} /{' '}
                  {selectedSummary.phone || 'без телефона'} / товаров: {selectedSummary.itemsCount}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}