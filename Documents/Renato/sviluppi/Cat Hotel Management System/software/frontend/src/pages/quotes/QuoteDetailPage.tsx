import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash2,
  RefreshCw,
  Mail,
  FileDown,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRightLeft,
  Plus,
} from 'lucide-react';
import { quotesApi } from '@/api/quotes';
import { priceListApi } from '@/api/price-list';
import { bookingsApi } from '@/api/bookings';
import { settingsApi } from '@/api/settings';
import type { QuoteStatus, QuoteLineItem, PriceListItem, TaxiConfig } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageSpinner } from '@/components/ui/Spinner';

type BadgeVariant = 'sage' | 'red' | 'orange' | 'blue' | 'gray' | 'yellow';

const STATUS_CONFIG: Record<QuoteStatus, { label: string; variant: BadgeVariant }> = {
  draft:     { label: 'Bozza',      variant: 'gray'   },
  sent:      { label: 'Inviato',    variant: 'blue'   },
  accepted:  { label: 'Accettato',  variant: 'sage'   },
  rejected:  { label: 'Rifiutato',  variant: 'red'    },
  expired:   { label: 'Scaduto',    variant: 'orange' },
  converted: { label: 'Convertito', variant: 'yellow' },
};

const formatEuro = (amount: number | string) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(amount));

const formatDate = (date?: string) =>
  date ? new Date(date + 'T00:00:00').toLocaleDateString('it-IT') : '—';

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

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [statusAction, setStatusAction] = useState<{
    status: QuoteStatus;
    label: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removeLineId, setRemoveLineId] = useState<string | null>(null);

  // Extra service add form
  const [addServiceCode, setAddServiceCode] = useState('');
  const [addServiceQty, setAddServiceQty] = useState(1);
  const [addServiceKm, setAddServiceKm] = useState(1);
  const [addServiceOverridePrice, setAddServiceOverridePrice] = useState('');
  const [addServiceDays, setAddServiceDays] = useState(1);
  const [addServiceCatsCount, setAddServiceCatsCount] = useState(0); // 0 = all cats

  // Accommodation segment add form
  const [addAccomCode, setAddAccomCode] = useState('');
  const [addAccomStart, setAddAccomStart] = useState('');
  const [addAccomEnd, setAddAccomEnd] = useState('');
  const [addAccomSeason, setAddAccomSeason] = useState<'high' | 'low'>('low');

  const { data: quote, isLoading, isError } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => quotesApi.get(id!),
    enabled: !!id,
  });

  const isDraft = quote?.status === 'draft';

  // Load price list items for DRAFT quotes
  const { data: accomItemsData } = useQuery({
    queryKey: ['price-list', 'accommodation'],
    queryFn: () => priceListApi.list({ category: 'accommodation', isActive: true }),
    enabled: isDraft,
  });
  const { data: extraServicesData } = useQuery({
    queryKey: ['price-list', 'extra_service'],
    queryFn: () => priceListApi.list({ category: 'extra_service', isActive: true }),
    enabled: isDraft,
  });
  const { data: taxiConfig } = useQuery<TaxiConfig>({
    queryKey: ['taxi-config'],
    queryFn: () => settingsApi.getTaxiConfig(),
    enabled: isDraft,
  });

  const deleteMutation = useMutation({
    mutationFn: () => quotesApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      navigate('/quotes');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => quotesApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setStatusAction(null);
      setActionError(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setActionError(err?.response?.data?.message || 'Errore nel cambio di stato');
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => bookingsApi.convert({ quoteId: id! }),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      navigate(`/bookings/${booking.id}`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setActionError(err?.response?.data?.message || 'Errore nella conversione in prenotazione');
    },
  });

  const recalcMutation = useMutation({
    mutationFn: () => quotesApi.recalculate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setActionError(err?.response?.data?.message || 'Errore nel ricalcolo');
    },
  });

  const emailMutation = useMutation({
    mutationFn: () => quotesApi.sendEmail(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setActionError(err?.response?.data?.message || "Errore nell'invio email");
    },
  });

  const pdfMutation = useMutation({
    mutationFn: () => quotesApi.generatePdf(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setActionError(err?.response?.data?.message || 'Errore nella generazione PDF');
    },
  });

  const addAccomMutation = useMutation({
    mutationFn: () =>
      quotesApi.addLineItem(id!, {
        itemCode: addAccomCode,
        startDate: addAccomStart,
        endDate: addAccomEnd,
        seasonType: addAccomSeason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      setAddAccomCode('');
      setAddAccomStart('');
      setAddAccomEnd('');
      setAddAccomSeason('low');
      setActionError(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setActionError(err?.response?.data?.message || "Errore nell'aggiunta del periodo");
    },
  });

  const addExtraMutation = useMutation({
    mutationFn: () => {
      const selectedItem = (extraServicesData?.data ?? []).find((i) => i.code === addServiceCode);
      const pm = selectedItem?.pricingModel;
      const catsArg = addServiceCatsCount > 0 ? addServiceCatsCount : undefined;
      if (pm === 'per_km') {
        const overrideVal = addServiceOverridePrice !== '' ? parseFloat(addServiceOverridePrice) : NaN;
        return quotesApi.addLineItem(id!, {
          itemCode: addServiceCode,
          km: addServiceKm,
          unitPrice: !isNaN(overrideVal) && overrideVal >= 0 ? overrideVal : undefined,
        });
      } else if (pm === 'per_day_per_cat') {
        return quotesApi.addLineItem(id!, {
          itemCode: addServiceCode,
          quantity: addServiceDays,
          appliesToCatCount: catsArg,
        });
      } else if (pm === 'one_time_per_cat') {
        return quotesApi.addLineItem(id!, {
          itemCode: addServiceCode,
          quantity: 1,
          appliesToCatCount: catsArg,
        });
      }
      // standard (default)
      return quotesApi.addLineItem(id!, {
        itemCode: addServiceCode,
        quantity: addServiceQty,
        appliesToCatCount: catsArg,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      setAddServiceCode('');
      setAddServiceQty(1);
      setAddServiceKm(1);
      setAddServiceOverridePrice('');
      setAddServiceDays(1);
      setAddServiceCatsCount(0);
      setActionError(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setActionError(err?.response?.data?.message || "Errore nell'aggiunta del servizio");
    },
  });

  const removeLineItemMutation = useMutation({
    mutationFn: (lineId: string) => quotesApi.removeLineItem(id!, lineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      setRemoveLineId(null);
      setActionError(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setActionError(err?.response?.data?.message || 'Errore nella rimozione');
    },
  });

  if (isLoading) return <PageSpinner />;
  if (isError || !quote) return <Alert variant="error">Preventivo non trovato.</Alert>;

  const sc = STATUS_CONFIG[quote.status] ?? { label: quote.status, variant: 'gray' as BadgeVariant };
  const lineItems = [...(quote.lineItems ?? [])].sort((a, b) => a.lineOrder - b.lineOrder);

  // Accommodation sorted by startDate (more reliable than lineOrder after manual edits)
  const accommodationItems = lineItems
    .filter((li) => li.category === 'accommodation')
    .sort((a, b) => {
      const da = a.startDate ? String(a.startDate).substring(0, 10) : '';
      const db = b.startDate ? String(b.startDate).substring(0, 10) : '';
      return da < db ? -1 : da > db ? 1 : 0;
    });

  const extraItems = lineItems.filter((li) => li.category === 'extra_service');

  const coverageIssues = checkCoverage(
    (quote.checkInDate ?? '').substring(0, 10),
    (quote.checkOutDate ?? '').substring(0, 10),
    accommodationItems.map((li) => ({ startDate: li.startDate, endDate: li.endDate })),
  );

  const accomItems: PriceListItem[] = accomItemsData?.data ?? [];
  const extraServices: PriceListItem[] = extraServicesData?.data ?? [];

  // Validate accommodation segment form
  const accomFormValid =
    addAccomCode &&
    addAccomStart &&
    addAccomEnd &&
    addAccomEnd >= addAccomStart;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate('/quotes')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Preventivi
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-800 font-mono">{quote.quoteNumber}</h1>
            <Badge variant={sc.variant}>{sc.label}</Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {formatDate(quote.checkInDate)} → {formatDate(quote.checkOutDate)}
            {quote.validUntil && ` · Valido fino al ${formatDate(quote.validUntil)}`}
          </p>
        </div>

        {isDraft && (
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/quotes/${id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Modifica
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={recalcMutation.isPending}
              onClick={() => { setActionError(null); recalcMutation.mutate(); }}
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Ricalcola prezzi
            </Button>
          </div>
        )}
      </div>

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Cliente">
          {quote.client ? (
            <div className="text-sm space-y-1">
              <p className="font-medium text-gray-800">
                {quote.client.lastName} {quote.client.firstName}
              </p>
              {quote.client.email && <p className="text-gray-500">{quote.client.email}</p>}
              {quote.client.phone1 && <p className="text-gray-500">{quote.client.phone1}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </Card>

        <Card title="Gatti">
          {quote.quoteCats && quote.quoteCats.length > 0 ? (
            <div className="space-y-1">
              {quote.quoteCats.map((quoteCat) => (
                <div key={quoteCat.catId} className="flex items-center gap-2 text-sm">
                  <span className="text-base shrink-0">🐱</span>
                  <div>
                    <span className="text-gray-800">{quoteCat.cat?.name ?? quoteCat.catId}</span>
                    {quoteCat.cat?.breed && (
                      <span className="text-xs text-gray-400 ml-1.5">{quoteCat.cat.breed}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </Card>

        <Card title="Riepilogo economico">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotale</span>
              <span>{formatEuro(quote.subtotalBeforeDiscounts)}</span>
            </div>
            {Number(quote.totalDiscounts) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Sconti</span>
                <span>− {formatEuro(quote.totalDiscounts)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-sage-100 pt-2 font-semibold text-gray-800 text-base">
              <span>Totale</span>
              <span>{formatEuro(quote.totalAmount)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Line items table */}
      {lineItems.length > 0 && (
        <Card title="Voci del preventivo" padding={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sage-100 bg-sage-50">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Voce</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Periodo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Q.tà</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Prezzo unit.</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Sconto</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Totale</th>
                {isDraft && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-50">
              {accommodationItems.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={isDraft ? 7 : 6}
                      className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50"
                    >
                      Soggiorno
                    </td>
                  </tr>
                  {accommodationItems.map((li) => (
                    <LineItemRow
                      key={li.id}
                      item={li}
                      isDraft={isDraft}
                      onRemove={() => setRemoveLineId(li.id)}
                    />
                  ))}
                </>
              )}
              {extraItems.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={isDraft ? 7 : 6}
                      className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50"
                    >
                      Servizi extra
                    </td>
                  </tr>
                  {extraItems.map((li) => (
                    <LineItemRow
                      key={li.id}
                      item={li}
                      isDraft={isDraft}
                      onRemove={() => setRemoveLineId(li.id)}
                    />
                  ))}
                </>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Alert copertura segmenti */}
      {(coverageIssues.gapCount > 0 || coverageIssues.overlapCount > 0) && (
        <Alert variant="warning" title="Verifica copertura periodi del soggiorno">
          {coverageIssues.gapCount > 0 && (
            <p>
              {coverageIssues.gapCount}{' '}
              {coverageIssues.gapCount === 1 ? 'giorno non coperto' : 'giorni non coperti'} da
              alcun periodo del soggiorno.
            </p>
          )}
          {coverageIssues.overlapCount > 0 && (
            <p>
              {coverageIssues.overlapCount}{' '}
              {coverageIssues.overlapCount === 1 ? 'giorno sovrapposto' : 'giorni sovrapposti'} tra
              più periodi.
            </p>
          )}
        </Alert>
      )}

      {/* Aggiungi periodi del soggiorno (solo bozza) */}
      {isDraft && accomItems.length > 0 && (
        <Card title="Aggiungi i periodi del soggiorno">
          <div className="space-y-3">
            {/* Tipo voce */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo soggiorno</label>
              <select
                value={addAccomCode}
                onChange={(e) => setAddAccomCode(e.target.value)}
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

            {/* Date e stagione */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data inizio</label>
                <input
                  type="date"
                  value={addAccomStart}
                  min={quote.checkInDate?.substring(0, 10)}
                  max={quote.checkOutDate?.substring(0, 10)}
                  onChange={(e) => {
                    setAddAccomStart(e.target.value);
                    if (addAccomEnd && e.target.value && addAccomEnd < e.target.value)
                      setAddAccomEnd('');
                  }}
                  className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data fine</label>
                <input
                  type="date"
                  value={addAccomEnd}
                  min={addAccomStart || quote.checkInDate?.substring(0, 10)}
                  max={quote.checkOutDate?.substring(0, 10)}
                  onChange={(e) => setAddAccomEnd(e.target.value)}
                  className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stagione</label>
                <select
                  value={addAccomSeason}
                  onChange={(e) => setAddAccomSeason(e.target.value as 'high' | 'low')}
                  className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                >
                  <option value="low">Bassa stagione</option>
                  <option value="high">Alta stagione</option>
                </select>
              </div>
            </div>

            {/* Preview giorni */}
            {addAccomStart && addAccomEnd && addAccomEnd >= addAccomStart && (
              <p className="text-xs text-gray-400">
                Giorni: {
                  Math.ceil(
                    (new Date(addAccomEnd).getTime() - new Date(addAccomStart).getTime()) /
                    (1000 * 60 * 60 * 24)
                  ) + 1
                } · per {quote.numberOfCats} gatt{quote.numberOfCats === 1 ? 'o' : 'i'}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!accomFormValid}
                loading={addAccomMutation.isPending}
                onClick={() => { setActionError(null); addAccomMutation.mutate(); }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Aggiungi periodo
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Aggiungi servizio extra (solo bozza) */}
      {isDraft && extraServices.length > 0 && (
        <Card title="Aggiungi servizio extra">
          <div className="space-y-3">
            {/* Service selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Servizio</label>
              <select
                value={addServiceCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setAddServiceCode(code);
                  setAddServiceOverridePrice('');
                  setAddServiceKm(1);
                  const found = extraServices.find((i) => i.code === code);
                  if (found) {
                    // default days = stay duration
                    if (quote.checkInDate && quote.checkOutDate) {
                      const ci = new Date(String(quote.checkInDate).substring(0, 10) + 'T00:00:00');
                      const co = new Date(String(quote.checkOutDate).substring(0, 10) + 'T00:00:00');
                      const days = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      setAddServiceDays(Math.max(1, days));
                    }
                    setAddServiceCatsCount(0);
                  }
                }}
                className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="">Seleziona servizio...</option>
                {extraServices.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.name} — {formatEuro(item.basePrice)}
                    {item.pricingModel === 'per_km' ? '/km' : item.unitType === 'per_day' ? '/giorno' : item.unitType === 'per_night' ? '/notte' : item.unitType === 'per_hour' ? '/ora' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic fields based on pricingModel */}
            {(() => {
              const selectedItem = extraServices.find((i) => i.code === addServiceCode);
              const pm = selectedItem?.pricingModel;
              if (!addServiceCode) return null;

              if (pm === 'per_km') {
                const computedFare = taxiConfig
                  ? addServiceKm <= taxiConfig.taxiBaseKm
                    ? Number(taxiConfig.taxiBasePrice)
                    : Number(taxiConfig.taxiBasePrice) + (addServiceKm - taxiConfig.taxiBaseKm) * Number(taxiConfig.taxiExtraKmPrice)
                  : null;
                const overrideVal = addServiceOverridePrice !== '' ? parseFloat(addServiceOverridePrice) : NaN;
                const effectiveFare = !isNaN(overrideVal) && overrideVal >= 0 ? overrideVal : (computedFare ?? 0);
                return (
                  <div className="space-y-3">
                    <div className="flex gap-3 items-end flex-wrap">
                      <div className="w-28">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Km da percorrere</label>
                        <input
                          type="number"
                          min={1}
                          value={addServiceKm}
                          onChange={(e) => setAddServiceKm(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 text-center"
                        />
                      </div>
                      {taxiConfig && computedFare !== null && (
                        <div className="self-end pb-2">
                          <p className="text-xs text-gray-500">
                            Tariffa: <strong className="text-gray-800">{formatEuro(computedFare)}</strong>
                          </p>
                          <p className="text-xs text-gray-300">
                            (base {formatEuro(taxiConfig.taxiBasePrice)} per i primi {taxiConfig.taxiBaseKm} km
                            {addServiceKm > taxiConfig.taxiBaseKm
                              ? `, poi ${formatEuro(taxiConfig.taxiExtraKmPrice)}/km`
                              : ''})
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="w-40">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Importo personalizzato{' '}
                        <span className="text-gray-400 font-normal">(lascia vuoto per usare la tariffa calcolata)</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder={computedFare !== null ? computedFare.toFixed(2) : ''}
                        value={addServiceOverridePrice}
                        onChange={(e) => setAddServiceOverridePrice(e.target.value)}
                        className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 text-center"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Totale corsa: <strong className="text-gray-800">{formatEuro(effectiveFare)}</strong>
                    </p>
                  </div>
                );
              }

              if (pm === 'per_day_per_cat') {
                return (
                  <div className="flex gap-3 items-end flex-wrap">
                    <div className="w-24">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Giorni</label>
                      <input
                        type="number"
                        min={1}
                        value={addServiceDays}
                        onChange={(e) => setAddServiceDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 text-center"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs font-medium text-gray-600 mb-1">N° gatti (0 = tutti)</label>
                      <input
                        type="number"
                        min={0}
                        max={quote.numberOfCats}
                        value={addServiceCatsCount}
                        onChange={(e) => setAddServiceCatsCount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 text-center"
                      />
                    </div>
                    <p className="text-xs text-gray-400 self-end pb-2">
                      Subtotale: {formatEuro(Number(selectedItem?.basePrice ?? 0) * addServiceDays * (addServiceCatsCount || quote.numberOfCats))}
                    </p>
                  </div>
                );
              }

              if (pm === 'one_time_per_cat') {
                return (
                  <div className="flex gap-3 items-end flex-wrap">
                    <div className="w-28">
                      <label className="block text-xs font-medium text-gray-600 mb-1">N° gatti (0 = tutti)</label>
                      <input
                        type="number"
                        min={0}
                        max={quote.numberOfCats}
                        value={addServiceCatsCount}
                        onChange={(e) => setAddServiceCatsCount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 text-center"
                      />
                    </div>
                    <p className="text-xs text-gray-400 self-end pb-2">
                      Subtotale: {formatEuro(Number(selectedItem?.basePrice ?? 0) * (addServiceCatsCount || quote.numberOfCats))}
                    </p>
                  </div>
                );
              }

              // standard
              return (
                <div className="flex gap-3 items-end flex-wrap">
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantità</label>
                    <input
                      type="number"
                      min={1}
                      value={addServiceQty}
                      onChange={(e) => setAddServiceQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 text-center"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-600 mb-1">N° gatti (0 = tutti)</label>
                    <input
                      type="number"
                      min={0}
                      max={quote.numberOfCats}
                      value={addServiceCatsCount}
                      onChange={(e) => setAddServiceCatsCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 text-center"
                    />
                  </div>
                  <p className="text-xs text-gray-400 self-end pb-2">
                    Subtotale: {formatEuro(Number(selectedItem?.basePrice ?? 0) * addServiceQty * (addServiceCatsCount || quote.numberOfCats))}
                  </p>
                </div>
              );
            })()}

            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!addServiceCode}
                loading={addExtraMutation.isPending}
                onClick={() => { setActionError(null); addExtraMutation.mutate(); }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Aggiungi
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Applied discounts */}
      {quote.appliedDiscounts && quote.appliedDiscounts.length > 0 && (
        <Card title="Sconti applicati">
          <div className="space-y-2">
            {quote.appliedDiscounts.map((discount) => (
              <div key={discount.ruleId} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-700">{discount.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    ({discount.isPercentage ? `${discount.value}%` : formatEuro(discount.value)})
                  </span>
                </div>
                <span className="text-red-600 font-medium">− {formatEuro(discount.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Notes */}
      {quote.notes && (
        <Card title="Note">
          <p className="text-sm text-gray-700 whitespace-pre-line">{quote.notes}</p>
        </Card>
      )}

      {/* Actions */}
      <Card title="Azioni">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            loading={pdfMutation.isPending}
            onClick={() => { setActionError(null); pdfMutation.mutate(); }}
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            {quote.pdfPath ? 'Rigenera PDF' : 'Genera PDF'}
          </Button>

          {quote.pdfPath && (
            <a
              href={`/api/v1/quotes/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sage-200 text-xs font-medium text-sage-700 hover:bg-sage-50 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Scarica PDF
            </a>
          )}

          {(quote.status === 'draft' || quote.status === 'sent') && (
            <Button
              variant="outline"
              size="sm"
              loading={emailMutation.isPending}
              onClick={() => { setActionError(null); emailMutation.mutate(); }}
            >
              <Mail className="w-4 h-4 mr-1.5" />
              Invia email
            </Button>
          )}

          <div className="w-px bg-sage-200 mx-1 self-stretch" />

          {quote.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => setStatusAction({ status: 'sent', label: 'Segna come Inviato' })}
            >
              Segna come Inviato
            </Button>
          )}

          {quote.status === 'sent' && (
            <>
              <Button
                size="sm"
                onClick={() => setStatusAction({ status: 'accepted', label: 'Segna come Accettato' })}
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Segna come Accettato
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusAction({ status: 'rejected', label: 'Segna come Rifiutato' })}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Segna come Rifiutato
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusAction({ status: 'expired', label: 'Segna come Scaduto' })}
              >
                <Clock className="w-4 h-4 mr-1.5" />
                Segna come Scaduto
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusAction({ status: 'draft', label: 'Riporta in bozza' })}
              >
                Riporta in bozza
              </Button>
            </>
          )}

          {quote.status === 'expired' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusAction({ status: 'draft', label: 'Riporta in bozza' })}
            >
              Riporta in bozza
            </Button>
          )}

          {quote.status === 'accepted' && (
            <Button
              size="sm"
              loading={convertMutation.isPending}
              onClick={() => { setActionError(null); convertMutation.mutate(); }}
            >
              <ArrowRightLeft className="w-4 h-4 mr-1.5" />
              Converti in prenotazione
            </Button>
          )}

          {quote.status === 'draft' && (
            <>
              <div className="w-px bg-sage-200 mx-1 self-stretch" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-1.5 text-red-500" />
                <span className="text-red-500">Elimina</span>
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Dialogs */}
      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Elimina preventivo"
        message={`Eliminare il preventivo ${quote.quoteNumber}? L'operazione non può essere annullata.`}
        confirmLabel="Elimina"
      />

      <ConfirmDialog
        open={!!statusAction}
        onClose={() => { setStatusAction(null); setActionError(null); }}
        onConfirm={() => statusAction && statusMutation.mutate(statusAction.status)}
        loading={statusMutation.isPending}
        confirmVariant="primary"
        title={statusAction?.label ?? ''}
        message="Confermi il cambio di stato del preventivo?"
        confirmLabel="Conferma"
      />

      <ConfirmDialog
        open={!!removeLineId}
        onClose={() => setRemoveLineId(null)}
        onConfirm={() => removeLineId && removeLineItemMutation.mutate(removeLineId)}
        loading={removeLineItemMutation.isPending}
        title="Rimuovi voce"
        message="Rimuovere questa voce dal preventivo?"
        confirmLabel="Rimuovi"
      />
    </div>
  );
}

function LineItemRow({
  item,
  isDraft,
  onRemove,
}: {
  item: QuoteLineItem;
  isDraft: boolean;
  onRemove?: () => void;
}) {
  const fmtDate = (date?: string) =>
    date
      ? new Date(date + 'T00:00:00').toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
        })
      : '';

  const formatEuro = (amount: number | string) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(amount));

  return (
    <tr className="hover:bg-sage-50/50">
      <td className="px-4 py-2.5">
        <p className="font-medium text-gray-800">{item.itemName}</p>
        <p className="text-xs text-gray-400">
          {item.appliesToCatCount
            ? `${item.appliesToCatCount} gatt${item.appliesToCatCount === 1 ? 'o' : 'i'}`
            : 'tutti i gatti'}
          {item.seasonType === 'high'
            ? ' · Alta stagione'
            : item.seasonType === 'low'
            ? ' · Bassa stagione'
            : ''}
        </p>
      </td>
      <td className="px-4 py-2.5 text-gray-600 text-xs whitespace-nowrap">
        {item.startDate && item.endDate
          ? `${fmtDate(item.startDate)} – ${fmtDate(item.endDate)}`
          : '—'}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-700">
        {item.pricingModel === 'per_km'
          ? `${item.km ?? Number(item.quantity)} km`
          : item.pricingModel === 'per_day_per_cat'
          ? `${Number(item.quantity)} gg`
          : item.pricingModel === 'one_time_per_cat'
          ? '1×'
          : Number(item.quantity)}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-700">{formatEuro(item.unitPrice)}</td>
      <td className="px-4 py-2.5 text-right text-red-600">
        {Number(item.discountAmount) > 0 ? `− ${formatEuro(item.discountAmount)}` : '—'}
      </td>
      <td className="px-4 py-2.5 text-right font-medium text-gray-800">
        {formatEuro(item.total)}
      </td>
      {isDraft && (
        <td className="px-2 py-2.5">
          <button
            onClick={onRemove}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
            title="Rimuovi"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
    </tr>
  );
}
