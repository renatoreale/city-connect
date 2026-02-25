import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { quotesApi } from '@/api/quotes';
import { clientsApi } from '@/api/clients';
import { catsApi } from '@/api/cats';
import { priceListApi } from '@/api/price-list';
import { settingsApi } from '@/api/settings';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { PageSpinner } from '@/components/ui/Spinner';
import type { PriceListItem, AccommodationSegmentInput, TaxiConfig } from '@/types';

const schema = z.object({
  clientId: z.string().min(1, 'Cliente obbligatorio'),
  checkInDate: z.string().min(1, 'Data check-in obbligatoria'),
  checkOutDate: z.string().min(1, 'Data check-out obbligatoria'),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface SelectedExtra {
  itemCode: string;
  quantity: number;
  appliesToCatCount?: number;
  km?: number;
  unitPrice?: number;
}

const formatEuro = (amount: number | string) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(amount));

function countDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0;
  return (
    Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24),
    ) + 1
  );
}

function checkCoverage(
  checkIn: string,
  checkOut: string,
  segments: Array<{ startDate?: string | null; endDate?: string | null }>,
): { gapCount: number; overlapCount: number } {
  if (!checkIn || !checkOut || segments.length === 0) return { gapCount: 0, overlapCount: 0 };
  const coverage = new Map<string, number>();
  const cur = new Date(checkIn + 'T00:00:00');
  const end = new Date(checkOut + 'T00:00:00');
  while (cur <= end) {
    coverage.set(cur.toISOString().substring(0, 10), 0);
    cur.setDate(cur.getDate() + 1);
  }
  for (const seg of segments) {
    if (!seg.startDate || !seg.endDate) continue;
    const s = new Date(String(seg.startDate).substring(0, 10) + 'T00:00:00');
    const e = new Date(String(seg.endDate).substring(0, 10) + 'T00:00:00');
    while (s <= e) {
      const key = s.toISOString().substring(0, 10);
      if (coverage.has(key)) coverage.set(key, (coverage.get(key) ?? 0) + 1);
      s.setDate(s.getDate() + 1);
    }
  }
  let gapCount = 0;
  let overlapCount = 0;
  for (const count of coverage.values()) {
    if (count === 0) gapCount++;
    if (count > 1) overlapCount++;
  }
  return { gapCount, overlapCount };
}

// ─── Shared segment form ───────────────────────────────────────────────────

interface SegmentFormProps {
  accomItems: PriceListItem[];
  minDate?: string;
  maxDate?: string;
  onAdd: (seg: { itemCode: string; startDate: string; endDate: string; seasonType: 'high' | 'low' }) => void;
  loading?: boolean;
}

function SegmentForm({ accomItems, minDate, maxDate, onAdd, loading }: SegmentFormProps) {
  const [code, setCode] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [season, setSeason] = useState<'high' | 'low'>('low');

  const valid = !!code && !!start && !!end && end >= start;

  const handleAdd = () => {
    if (!valid) return;
    onAdd({ itemCode: code, startDate: start, endDate: end, seasonType: season });
    setStart('');
    setEnd('');
    setSeason('low');
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo soggiorno</label>
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
        >
          <option value="">Seleziona tipo...</option>
          {accomItems.map((item) => (
            <option key={item.id} value={item.code}>
              {item.name} — bassa: {formatEuro(item.basePrice)}
              {item.highSeasonPrice ? ` / alta: ${formatEuro(item.highSeasonPrice)}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data inizio</label>
          <input
            type="date"
            value={start}
            min={minDate || undefined}
            max={maxDate || undefined}
            onChange={(e) => {
              setStart(e.target.value);
              // reset end if it falls outside bounds
              if (end && e.target.value && end < e.target.value) setEnd('');
            }}
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data fine</label>
          <input
            type="date"
            value={end}
            min={start || minDate || undefined}
            max={maxDate || undefined}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Stagione</label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value as 'high' | 'low')}
            className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          >
            <option value="low">Bassa stagione</option>
            <option value="high">Alta stagione</option>
          </select>
        </div>
      </div>

      {start && end && end >= start && (
        <p className="text-xs text-gray-400">Giorni: {countDays(start, end)}</p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!valid}
          loading={loading}
          onClick={handleAdd}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Aggiungi periodo
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function QuoteFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;
  const hasPopulated = useRef(false);
  const prevClientIdRef = useRef('');

  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [catError, setCatError] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [segmentError, setSegmentError] = useState<string | null>(null);

  // Create mode: local segment list passed in DTO
  const [accomSegments, setAccomSegments] = useState<AccommodationSegmentInput[]>([]);

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => quotesApi.get(id!),
    enabled: isEdit,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 1, ''],
    queryFn: () => clientsApi.list({ page: 1, limit: 200 }),
  });

  const { data: accomItemsData } = useQuery({
    queryKey: ['price-list', 'accommodation'],
    queryFn: () => priceListApi.list({ category: 'accommodation', isActive: true }),
  });

  const { data: extraServicesData } = useQuery({
    queryKey: ['price-list', 'extra_service'],
    queryFn: () => priceListApi.list({ category: 'extra_service', isActive: true }),
    enabled: !isEdit,
  });
  const { data: taxiConfig } = useQuery<TaxiConfig>({
    queryKey: ['taxi-config'],
    queryFn: () => settingsApi.getTaxiConfig(),
    enabled: !isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const clientId = watch('clientId');
  const checkInDate = watch('checkInDate');
  const checkOutDate = watch('checkOutDate');

  const { data: clientCats } = useQuery({
    queryKey: ['cats', 'byClient', clientId],
    queryFn: () => catsApi.byClient(clientId),
    enabled: !!clientId,
  });

  // Populate form in edit mode
  useEffect(() => {
    if (existing && !hasPopulated.current) {
      hasPopulated.current = true;
      reset({
        clientId: existing.clientId,
        checkInDate: existing.checkInDate?.substring(0, 10) ?? '',
        checkOutDate: existing.checkOutDate?.substring(0, 10) ?? '',
        validUntil: existing.validUntil?.substring(0, 10) ?? '',
        notes: existing.notes ?? '',
      });
      const catIds = existing.quoteCats?.map((qc) => qc.catId) ?? [];
      setSelectedCatIds(catIds);
    }
  }, [existing, reset]);

  // Clear selected cats when client changes (not on initial populate)
  useEffect(() => {
    if (!clientId) return;
    if (prevClientIdRef.current && prevClientIdRef.current !== clientId) {
      setSelectedCatIds([]);
    }
    prevClientIdRef.current = clientId;
  }, [clientId]);

  // Edit mode: add line item directly
  const addLineItemMutation = useMutation({
    mutationFn: (seg: AccommodationSegmentInput) =>
      quotesApi.addLineItem(id!, {
        itemCode: seg.itemCode,
        startDate: seg.startDate,
        endDate: seg.endDate,
        seasonType: seg.seasonType,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', id] });
      setSegmentError(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setSegmentError(err?.response?.data?.message || "Errore nell'aggiunta del periodo");
    },
  });

  // Edit mode: remove line item directly
  const removeLineItemMutation = useMutation({
    mutationFn: (lineId: string) => quotesApi.removeLineItem(id!, lineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quote', id] });
      setSegmentError(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setSegmentError(err?.response?.data?.message || 'Errore nella rimozione del periodo');
    },
  });

  // Save basic data
  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (isEdit) {
        return quotesApi.update(id!, {
          clientId: values.clientId,
          catIds: selectedCatIds,
          checkInDate: values.checkInDate,
          checkOutDate: values.checkOutDate,
          validUntil: values.validUntil || undefined,
          notes: values.notes || undefined,
        });
      }
      return quotesApi.create({
        clientId: values.clientId,
        catIds: selectedCatIds,
        checkInDate: values.checkInDate,
        checkOutDate: values.checkOutDate,
        validUntil: values.validUntil || undefined,
        notes: values.notes || undefined,
        accommodationSegments: accomSegments.length > 0 ? accomSegments : undefined,
        extraServices: selectedExtras.length > 0
          ? selectedExtras.map((e) => ({
              itemCode: e.itemCode,
              quantity: e.quantity,
              appliesToCatCount: e.appliesToCatCount,
              km: e.km,
              unitPrice: e.unitPrice,
            }))
          : undefined,
      });
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['quote', id] });
      navigate(`/quotes/${saved.id}`);
    },
  });

  if (isEdit && existingLoading) return <PageSpinner />;

  if (isEdit && existing && existing.status !== 'draft') {
    return <Navigate to={`/quotes/${id}`} replace />;
  }

  const clientOptions = (clientsData?.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.lastName} ${c.firstName}`,
  }));

  const cats = clientCats ?? [];
  const accomItems: PriceListItem[] = accomItemsData?.data ?? [];
  const extraServices: PriceListItem[] = extraServicesData?.data ?? [];

  // In edit mode, existing accommodation line items sorted by startDate
  const existingAccomItems = (existing?.lineItems ?? [])
    .filter((li) => li.category === 'accommodation')
    .sort((a, b) => {
      const da = a.startDate ? String(a.startDate).substring(0, 10) : '';
      const db = b.startDate ? String(b.startDate).substring(0, 10) : '';
      return da < db ? -1 : da > db ? 1 : 0;
    });

  const coverageIssues = isEdit
    ? checkCoverage(
        (existing?.checkInDate ?? '').substring(0, 10),
        (existing?.checkOutDate ?? '').substring(0, 10),
        existingAccomItems.map((li) => ({ startDate: li.startDate, endDate: li.endDate })),
      )
    : checkInDate && checkOutDate && accomSegments.length > 0
    ? checkCoverage(checkInDate, checkOutDate, accomSegments)
    : { gapCount: 0, overlapCount: 0 };

  const toggleCat = (catId: string) => {
    setCatError(false);
    setSelectedCatIds((prev) =>
      prev.includes(catId) ? prev.filter((cid) => cid !== catId) : [...prev, catId],
    );
  };

  const toggleExtra = (item: PriceListItem) => {
    setSelectedExtras((prev) => {
      const exists = prev.find((e) => e.itemCode === item.code);
      if (exists) return prev.filter((e) => e.itemCode !== item.code);
      const pm = item.pricingModel;
      return [...prev, {
        itemCode: item.code,
        quantity: 1,
        km: pm === 'per_km' ? 1 : undefined,
        unitPrice: undefined,
        appliesToCatCount: undefined,
      }];
    });
  };

  const updateExtraQty = (itemCode: string, qty: number) => {
    setSelectedExtras((prev) =>
      prev.map((e) => (e.itemCode === itemCode ? { ...e, quantity: Math.max(1, qty) } : e)),
    );
  };

  const updateExtraCatsCount = (itemCode: string, cats: number) => {
    setSelectedExtras((prev) =>
      prev.map((e) => (e.itemCode === itemCode ? { ...e, appliesToCatCount: cats > 0 ? cats : undefined } : e)),
    );
  };

  const updateExtraKm = (itemCode: string, km: number) => {
    setSelectedExtras((prev) =>
      prev.map((e) => (e.itemCode === itemCode ? { ...e, km: Math.max(1, km) } : e)),
    );
  };

  const updateExtraUnitPrice = (itemCode: string, price: string) => {
    setSelectedExtras((prev) =>
      prev.map((e) => (e.itemCode === itemCode ? { ...e, unitPrice: price !== '' ? Math.max(0, parseFloat(price) || 0) : undefined } : e)),
    );
  };

  const isExtraSelected = (code: string) => selectedExtras.some((e) => e.itemCode === code);

  const accomItemByCode = (code: string) => accomItems.find((i) => i.code === code);

  const onSubmit = (values: FormValues) => {
    if (selectedCatIds.length === 0) {
      setCatError(true);
      return;
    }
    mutation.mutate(values);
  };

  return (
    <div className="max-w-2xl space-y-4">
      {/* Back + title */}
      <div>
        <button
          onClick={() => navigate(isEdit ? `/quotes/${id}` : '/quotes')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEdit ? 'Dettaglio preventivo' : 'Preventivi'}
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {isEdit ? `Modifica ${existing?.quoteNumber ?? ''}` : 'Nuovo preventivo'}
        </h1>
      </div>

      {mutation.isError && (
        <Alert variant="error">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Errore nel salvataggio'}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Dati principali */}
        <Card title="Dati preventivo">
          <div className="space-y-4">
            <Select
              label="Cliente *"
              options={clientOptions}
              placeholder="Seleziona cliente..."
              error={errors.clientId?.message}
              {...register('clientId')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Data check-in *"
                type="date"
                error={errors.checkInDate?.message}
                {...register('checkInDate')}
              />
              <Input
                label="Data check-out *"
                type="date"
                error={errors.checkOutDate?.message}
                {...register('checkOutDate')}
              />
              <Input
                label="Valido fino al"
                type="date"
                {...register('validUntil')}
              />
            </div>
            <Textarea
              label="Note"
              rows={2}
              placeholder="Note interne o per il cliente..."
              {...register('notes')}
            />
          </div>
        </Card>

        {/* Selezione gatti */}
        <Card title="Gatti inclusi *">
          {!clientId ? (
            <p className="text-sm text-gray-400">
              Seleziona prima un cliente per scegliere i gatti.
            </p>
          ) : cats.length === 0 ? (
            <p className="text-sm text-gray-400">
              Nessun gatto registrato per questo cliente.
            </p>
          ) : (
            <div className="space-y-2">
              {cats.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-sage-100 hover:border-sage-300 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCatIds.includes(cat.id)}
                    onChange={() => toggleCat(cat.id)}
                    className="w-4 h-4 accent-sage-500"
                  />
                  <span className="text-lg">🐱</span>
                  <div>
                    <p className="font-medium text-gray-800">{cat.name}</p>
                    {cat.breed && <p className="text-xs text-gray-400">{cat.breed}</p>}
                  </div>
                </label>
              ))}
              {catError && (
                <p className="text-xs text-red-500 mt-1">Seleziona almeno un gatto</p>
              )}
            </div>
          )}
        </Card>

        {/* ── SEGMENTI SOGGIORNO ─────────────────────────────────────────── */}
        {accomItems.length > 0 && (
          <Card title="Periodi del soggiorno">
            <div className="space-y-4">

              {/* EDIT MODE: lista segmenti esistenti con rimozione */}
              {isEdit && existingAccomItems.length > 0 && (
                <div className="space-y-2">
                  {existingAccomItems.map((li) => {
                    const fmtD = (d?: string) =>
                      d
                        ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                          })
                        : '—';
                    return (
                      <div
                        key={li.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-sage-200 bg-sage-50"
                      >
                        <div className="flex-1 min-w-0 text-sm">
                          <span className="font-medium text-gray-800">{li.itemName}</span>
                          <span className="text-gray-500 mx-1.5">·</span>
                          <span className="text-gray-600">
                            {fmtD(li.startDate as string | undefined)} – {fmtD(li.endDate as string | undefined)}
                          </span>
                          <span className="text-gray-400 ml-1.5 text-xs">
                            ({Number(li.quantity)} gg ·{' '}
                            {li.seasonType === 'high' ? 'Alta stagione' : 'Bassa stagione'})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLineItemMutation.mutate(li.id)}
                          disabled={removeLineItemMutation.isPending}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                          title="Rimuovi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CREATE MODE: lista segmenti locali */}
              {!isEdit && accomSegments.length > 0 && (
                <div className="space-y-2">
                  {accomSegments.map((seg, i) => {
                    const item = accomItemByCode(seg.itemCode);
                    const days = countDays(seg.startDate, seg.endDate);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-sage-200 bg-sage-50"
                      >
                        <div className="flex-1 min-w-0 text-sm">
                          <span className="font-medium text-gray-800">
                            {item?.name ?? seg.itemCode}
                          </span>
                          <span className="text-gray-500 mx-1.5">·</span>
                          <span className="text-gray-600">
                            {new Date(seg.startDate + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                            {' – '}
                            {new Date(seg.endDate + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                          </span>
                          <span className="text-gray-400 ml-1.5 text-xs">
                            ({days} gg · {seg.seasonType === 'high' ? 'Alta stagione' : 'Bassa stagione'})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAccomSegments((prev) => prev.filter((_, j) => j !== i))}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Coverage alert */}
              {(coverageIssues.gapCount > 0 || coverageIssues.overlapCount > 0) && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 space-y-0.5">
                  {coverageIssues.gapCount > 0 && (
                    <p>
                      ⚠ {coverageIssues.gapCount}{' '}
                      {coverageIssues.gapCount === 1 ? 'giorno non coperto' : 'giorni non coperti'} da
                      alcun periodo.
                    </p>
                  )}
                  {coverageIssues.overlapCount > 0 && (
                    <p>
                      ⚠ {coverageIssues.overlapCount}{' '}
                      {coverageIssues.overlapCount === 1 ? 'giorno sovrapposto' : 'giorni sovrapposti'}{' '}
                      tra più periodi.
                    </p>
                  )}
                </div>
              )}

              {/* Divider + hint */}
              <div className={`${(isEdit && existingAccomItems.length > 0) || (!isEdit && accomSegments.length > 0) ? 'border-t border-sage-100 pt-3' : ''}`}>
                {!isEdit && accomSegments.length === 0 && (
                  <p className="text-xs text-gray-400 mb-3">
                    Definisci i periodi manualmente, oppure lascia vuoto per il calcolo automatico.
                  </p>
                )}
                {segmentError && (
                  <p className="text-xs text-red-500 mb-3">{segmentError}</p>
                )}
                <SegmentForm
                  accomItems={accomItems}
                  minDate={checkInDate || undefined}
                  maxDate={checkOutDate || undefined}
                  loading={isEdit ? addLineItemMutation.isPending : false}
                  onAdd={(seg) => {
                    if (isEdit) {
                      addLineItemMutation.mutate(seg);
                    } else {
                      setAccomSegments((prev) => [...prev, seg]);
                    }
                  }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Servizi extra (solo creazione) */}
        {!isEdit && extraServices.length > 0 && (
          <Card title="Servizi extra">
            <div className="space-y-2">
              {extraServices.map((item) => {
                const selected = isExtraSelected(item.code);
                const extra = selectedExtras.find((e) => e.itemCode === item.code);
                const pm = item.pricingModel;
                const numCats = selectedCatIds.length || 1;
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-sage-100 hover:border-sage-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleExtra(item)}
                        className="w-4 h-4 accent-sage-500 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          {formatEuro(item.basePrice)}{' '}
                          {pm === 'per_km' ? '/km' : pm === 'per_day_per_cat' ? '/giorno/gatto' : pm === 'one_time_per_cat' ? '/gatto' : item.unitType === 'per_day' ? '/giorno' : item.unitType === 'per_night' ? '/notte' : item.unitType === 'per_hour' ? '/ora' : 'una tantum'}
                        </p>
                      </div>
                    </div>
                    {selected && (
                      <div className="px-3 pb-3 space-y-2 border-t border-sage-100 pt-2">
                        {pm === 'per_km' ? (
                          <div className="space-y-2">
                            <div className="flex gap-3 items-end flex-wrap">
                              <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Km</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={extra?.km ?? 1}
                                  onChange={(e) => updateExtraKm(item.code, parseInt(e.target.value) || 1)}
                                  className="w-20 text-sm border border-sage-200 rounded px-2 py-1 text-center"
                                />
                              </div>
                              {taxiConfig && (() => {
                                const km = extra?.km ?? 1;
                                const fare = km <= taxiConfig.taxiBaseKm
                                  ? Number(taxiConfig.taxiBasePrice)
                                  : Number(taxiConfig.taxiBasePrice) + (km - taxiConfig.taxiBaseKm) * Number(taxiConfig.taxiExtraKmPrice);
                                return (
                                  <p className="text-xs text-gray-400 self-end pb-1">
                                    tariffa: <strong className="text-gray-600">{formatEuro(fare)}</strong>
                                  </p>
                                );
                              })()}
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">
                                Importo personalizzato <span className="text-gray-300">(opz.)</span>
                              </label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder="lascia vuoto per tariffa calcolata"
                                value={extra?.unitPrice !== undefined ? extra.unitPrice : ''}
                                onChange={(e) => updateExtraUnitPrice(item.code, e.target.value)}
                                className="w-40 text-sm border border-sage-200 rounded px-2 py-1 text-center"
                              />
                            </div>
                          </div>
                        ) : pm === 'per_day_per_cat' ? (
                          <div className="flex gap-3 items-end flex-wrap">
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Giorni</label>
                              <input
                                type="number"
                                min={1}
                                value={extra?.quantity ?? 1}
                                onChange={(e) => updateExtraQty(item.code, parseInt(e.target.value) || 1)}
                                className="w-20 text-sm border border-sage-200 rounded px-2 py-1 text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Gatti (0=tutti)</label>
                              <input
                                type="number"
                                min={0}
                                max={numCats}
                                value={extra?.appliesToCatCount ?? 0}
                                onChange={(e) => updateExtraCatsCount(item.code, parseInt(e.target.value) || 0)}
                                className="w-20 text-sm border border-sage-200 rounded px-2 py-1 text-center"
                              />
                            </div>
                            <p className="text-xs text-gray-400 self-end pb-1">
                              = {formatEuro(Number(item.basePrice) * (extra?.quantity ?? 1) * (extra?.appliesToCatCount || numCats))}
                            </p>
                          </div>
                        ) : pm === 'one_time_per_cat' ? (
                          <div className="flex gap-3 items-end flex-wrap">
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Gatti (0=tutti)</label>
                              <input
                                type="number"
                                min={0}
                                max={numCats}
                                value={extra?.appliesToCatCount ?? 0}
                                onChange={(e) => updateExtraCatsCount(item.code, parseInt(e.target.value) || 0)}
                                className="w-20 text-sm border border-sage-200 rounded px-2 py-1 text-center"
                              />
                            </div>
                            <p className="text-xs text-gray-400 self-end pb-1">
                              = {formatEuro(Number(item.basePrice) * (extra?.appliesToCatCount || numCats))}
                            </p>
                          </div>
                        ) : (
                          <div className="flex gap-3 items-end flex-wrap">
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Qtà</label>
                              <input
                                type="number"
                                min={1}
                                value={extra?.quantity ?? 1}
                                onChange={(e) => updateExtraQty(item.code, parseInt(e.target.value) || 1)}
                                className="w-20 text-sm border border-sage-200 rounded px-2 py-1 text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Gatti (0=tutti)</label>
                              <input
                                type="number"
                                min={0}
                                max={numCats}
                                value={extra?.appliesToCatCount ?? 0}
                                onChange={(e) => updateExtraCatsCount(item.code, parseInt(e.target.value) || 0)}
                                className="w-20 text-sm border border-sage-200 rounded px-2 py-1 text-center"
                              />
                            </div>
                            <p className="text-xs text-gray-400 self-end pb-1">
                              = {formatEuro(Number(item.basePrice) * (extra?.quantity ?? 1) * (extra?.appliesToCatCount || numCats))}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit ? `/quotes/${id}` : '/quotes')}
          >
            Annulla
          </Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            {isEdit ? 'Salva modifiche' : 'Crea preventivo'}
          </Button>
        </div>
      </form>
    </div>
  );
}
