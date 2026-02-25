import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { priceListApi, type PriceListCreateDto } from '@/api/price-list';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import type { PriceListItem, ExtraServicePricingModel } from '@/types';

// ─── Form state type ──────────────────────────────────────────────────────────

interface ItemForm {
  code: string;
  name: string;
  description: string;
  category: 'accommodation' | 'extra_service';
  unitType: 'per_night' | 'per_day' | 'one_time' | 'per_hour';
  pricingModel: ExtraServicePricingModel | '';
  basePrice: string;
  highSeasonPrice: string;
  sortOrder: string;
  isActive: boolean;
}

function emptyForm(): ItemForm {
  return {
    code: '',
    name: '',
    description: '',
    category: 'extra_service',
    unitType: 'one_time',
    pricingModel: 'standard',
    basePrice: '0',
    highSeasonPrice: '',
    sortOrder: '0',
    isActive: true,
  };
}

function fromItem(item: PriceListItem): ItemForm {
  return {
    code: item.code,
    name: item.name,
    description: item.description ?? '',
    category: item.category,
    unitType: item.unitType,
    pricingModel: (item.pricingModel ?? 'standard') as ExtraServicePricingModel,
    basePrice: String(Number(item.basePrice)),
    highSeasonPrice: item.highSeasonPrice != null ? String(Number(item.highSeasonPrice)) : '',
    sortOrder: String(item.sortOrder),
    isActive: item.isActive,
  };
}

function toDto(form: ItemForm): PriceListCreateDto {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    category: form.category,
    unitType: form.unitType,
    pricingModel: form.category === 'extra_service' && form.pricingModel
      ? (form.pricingModel as ExtraServicePricingModel)
      : null,
    basePrice: parseFloat(form.basePrice) || 0,
    highSeasonPrice: form.category === 'accommodation' && form.highSeasonPrice !== ''
      ? parseFloat(form.highSeasonPrice) || 0
      : null,
    sortOrder: parseInt(form.sortOrder) || 0,
    isActive: form.isActive,
  };
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const categoryLabel: Record<string, string> = {
  accommodation: 'Alloggio',
  extra_service: 'Servizio extra',
};

const unitTypeLabel: Record<string, string> = {
  per_night: '/notte',
  per_day: '/giorno',
  one_time: 'una tantum',
  per_hour: '/ora',
};

const pricingModelLabel: Record<string, string> = {
  standard: 'Standard',
  per_km: 'Per km',
  per_day_per_cat: 'Per giorno/gatto',
  one_time_per_cat: 'Una tantum/gatto',
};

const formatEuro = (v: number | string | null | undefined) =>
  v != null
    ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(v))
    : '—';

// ─── Inline form component ────────────────────────────────────────────────────

interface ItemFormPanelProps {
  form: ItemForm;
  onChange: (f: ItemForm) => void;
  onSave: () => void;
  onCancel: () => void;
  isCreating: boolean;
  isPending: boolean;
  error: string | null;
}

function ItemFormPanel({ form, onChange, onSave, onCancel, isCreating, isPending, error }: ItemFormPanelProps) {
  const set = (field: keyof ItemForm, value: string | boolean) =>
    onChange({ ...form, [field]: value });

  return (
    <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 space-y-4">
      <p className="text-sm font-semibold text-sage-800">
        {isCreating ? 'Nuovo voce listino' : 'Modifica voce'}
      </p>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Codice *"
          value={form.code}
          onChange={e => set('code', e.target.value.toUpperCase())}
          disabled={!isCreating}
          placeholder="ES. CAT_TAXI"
          hint={isCreating ? 'Maiuscolo, univoco, non modificabile' : undefined}
        />
        <Input
          label="Nome *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Es. Cat Taxi"
        />
      </div>

      <Input
        label="Descrizione"
        value={form.description}
        onChange={e => set('description', e.target.value)}
        placeholder="Descrizione opzionale..."
      />

      <div className="grid grid-cols-2 gap-3">
        {/* Categoria */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Categoria *</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className="border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          >
            <option value="accommodation">Alloggio</option>
            <option value="extra_service">Servizio extra</option>
          </select>
        </div>

        {/* Tipo unità */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Tipo unità *</label>
          <select
            value={form.unitType}
            onChange={e => set('unitType', e.target.value)}
            className="border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          >
            <option value="per_night">Per notte</option>
            <option value="per_day">Per giorno</option>
            <option value="one_time">Una tantum</option>
            <option value="per_hour">Per ora</option>
          </select>
        </div>

        {/* Modello prezzo (solo extra_service) */}
        {form.category === 'extra_service' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Modello prezzo</label>
            <select
              value={form.pricingModel}
              onChange={e => set('pricingModel', e.target.value)}
              className="border border-sage-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
            >
              <option value="standard">Standard</option>
              <option value="per_km">Per km (Cat Taxi)</option>
              <option value="per_day_per_cat">Per giorno / gatto</option>
              <option value="one_time_per_cat">Una tantum / gatto</option>
            </select>
          </div>
        )}

        {/* Prezzo base */}
        <Input
          label="Prezzo base (€) *"
          type="number"
          min={0}
          step={0.01}
          value={form.basePrice}
          onChange={e => set('basePrice', e.target.value)}
          hint={form.category === 'extra_service' && form.pricingModel === 'per_km'
            ? 'Tariffa base per km inclusi (configurare km in Impostazioni)'
            : undefined}
        />

        {/* Prezzo alta stagione (solo accommodation) */}
        {form.category === 'accommodation' && (
          <Input
            label="Prezzo alta stagione (€)"
            type="number"
            min={0}
            step={0.01}
            value={form.highSeasonPrice}
            onChange={e => set('highSeasonPrice', e.target.value)}
            placeholder="lascia vuoto se uguale al base"
          />
        )}

        <Input
          label="Ordine"
          type="number"
          min={0}
          value={form.sortOrder}
          onChange={e => set('sortOrder', e.target.value)}
        />
      </div>

      <Checkbox
        label="Attivo"
        description="Se disattivato, non compare nella selezione preventivi"
        checked={form.isActive}
        onChange={e => set('isActive', e.target.checked)}
      />

      <div className="flex gap-2 justify-end pt-2 border-t border-sage-200">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Annulla
        </Button>
        <Button size="sm" onClick={onSave} loading={isPending}>
          <Check className="w-3.5 h-3.5 mr-1" />
          {isCreating ? 'Crea voce' : 'Salva modifiche'}
        </Button>
      </div>
    </div>
  );
}

// ─── Item row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: PriceListItem;
  isEditing: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function ItemRow({ item, isEditing, canEdit, onEdit, onDelete }: ItemRowProps) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto_auto_auto_auto] gap-3 items-center px-3 py-2.5 text-sm rounded-lg
        ${isEditing ? 'bg-sage-100 border border-sage-300' : 'hover:bg-gray-50'}`}
    >
      <span className="font-mono text-xs text-gray-500">{item.code}</span>
      <span className="font-medium text-gray-800 truncate">{item.name}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
        item.category === 'accommodation'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-purple-100 text-purple-700'
      }`}>
        {categoryLabel[item.category]}
      </span>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {formatEuro(item.basePrice)}
        {item.highSeasonPrice != null && (
          <span className="text-orange-500 ml-1">/ {formatEuro(item.highSeasonPrice)}</span>
        )}
        {' '}
        <span className="text-gray-400">{unitTypeLabel[item.unitType]}</span>
        {item.pricingModel && item.pricingModel !== 'standard' && (
          <span className="ml-1 text-sage-600 font-medium">· {pricingModelLabel[item.pricingModel]}</span>
        )}
      </span>
      <span className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-green-400' : 'bg-gray-300'}`} title={item.isActive ? 'Attivo' : 'Inattivo'} />
      {canEdit ? (
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-sage-600 transition-colors"
            title="Modifica"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Elimina"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <span />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PriceListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const canEdit = user?.role === 'admin' || user?.role === 'ceo';

  const [editingId, setEditingId] = useState<string | null>(null); // null | 'new' | uuid
  const [form, setForm] = useState<ItemForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mutError, setMutError] = useState<string | null>(null);

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['price-list-all'],
    queryFn: () => priceListApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: PriceListCreateDto) => priceListApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-list-all'] });
      qc.invalidateQueries({ queryKey: ['price-list'] });
      setEditingId(null);
      setMutError(null);
    },
    onError: (err: any) => {
      setMutError(err?.response?.data?.message ?? 'Errore nella creazione');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PriceListCreateDto> }) =>
      priceListApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-list-all'] });
      qc.invalidateQueries({ queryKey: ['price-list'] });
      setEditingId(null);
      setMutError(null);
    },
    onError: (err: any) => {
      setMutError(err?.response?.data?.message ?? 'Errore nel salvataggio');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => priceListApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-list-all'] });
      qc.invalidateQueries({ queryKey: ['price-list'] });
      setDeleteId(null);
    },
    onError: (err: any) => {
      setMutError(err?.response?.data?.message ?? 'Errore nella eliminazione');
    },
  });

  const startEdit = (item: PriceListItem) => {
    setForm(fromItem(item));
    setEditingId(item.id);
    setMutError(null);
  };

  const startCreate = () => {
    setForm(emptyForm());
    setEditingId('new');
    setMutError(null);
  };

  const cancel = () => {
    setEditingId(null);
    setMutError(null);
  };

  const handleSave = () => {
    if (!form.code || !form.name) {
      setMutError('Codice e nome sono obbligatori');
      return;
    }
    const dto = toDto(form);
    if (editingId === 'new') {
      createMutation.mutate(dto);
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, data: dto });
    }
  };

  const items: PriceListItem[] = itemsData?.data ?? [];
  const accomItems = items.filter(i => i.category === 'accommodation').sort((a, b) => a.sortOrder - b.sortOrder);
  const extraItems = items.filter(i => i.category === 'extra_service').sort((a, b) => a.sortOrder - b.sortOrder);

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Impostazioni
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Listino Prezzi</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gestisci alloggi e servizi extra. Imposta il modello prezzo <strong>Per km</strong> sul servizio Cat Taxi.
            </p>
          </div>
          {canEdit && editingId !== 'new' && (
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={startCreate}>
              Aggiungi voce
            </Button>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <Alert variant="warning" title="Conferma eliminazione">
          <p className="mb-2">Eliminare questa voce? Le righe già generate nei preventivi/prenotazioni non saranno modificate.</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteId)}
            >
              Elimina
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeleteId(null)}>
              Annulla
            </Button>
          </div>
        </Alert>
      )}

      {mutError && editingId === null && (
        <Alert variant="error" onClose={() => setMutError(null)}>{mutError}</Alert>
      )}

      {/* Create form at top */}
      {editingId === 'new' && (
        <ItemFormPanel
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={cancel}
          isCreating
          isPending={isPending}
          error={mutError}
        />
      )}

      {/* Accommodation */}
      <div className="bg-white rounded-xl border border-sage-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-blue-50 border-b border-sage-200">
          <h3 className="text-sm font-semibold text-blue-800">Alloggio</h3>
          <p className="text-xs text-blue-600 mt-0.5">Prezzi per il soggiorno in gabbia (bassa / alta stagione)</p>
        </div>
        <div className="p-2 space-y-1">
          {accomItems.length === 0 && (
            <p className="text-sm text-gray-400 px-3 py-4 text-center">Nessuna voce alloggio</p>
          )}
          {accomItems.map(item => (
            <div key={item.id}>
              <ItemRow
                item={item}
                isEditing={editingId === item.id}
                canEdit={canEdit}
                onEdit={() => editingId === item.id ? cancel() : startEdit(item)}
                onDelete={() => setDeleteId(item.id)}
              />
              {editingId === item.id && (
                <div className="mt-1 mb-2 px-2">
                  <ItemFormPanel
                    form={form}
                    onChange={setForm}
                    onSave={handleSave}
                    onCancel={cancel}
                    isCreating={false}
                    isPending={isPending}
                    error={mutError}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Extra services */}
      <div className="bg-white rounded-xl border border-sage-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-purple-50 border-b border-sage-200">
          <h3 className="text-sm font-semibold text-purple-800">Servizi Extra</h3>
          <p className="text-xs text-purple-600 mt-0.5">
            Servizi aggiuntivi — usa il modello <strong>Per km</strong> per il Cat Taxi
          </p>
        </div>
        <div className="p-2 space-y-1">
          {extraItems.length === 0 && (
            <p className="text-sm text-gray-400 px-3 py-4 text-center">Nessun servizio extra</p>
          )}
          {extraItems.map(item => (
            <div key={item.id}>
              <ItemRow
                item={item}
                isEditing={editingId === item.id}
                canEdit={canEdit}
                onEdit={() => editingId === item.id ? cancel() : startEdit(item)}
                onDelete={() => setDeleteId(item.id)}
              />
              {editingId === item.id && (
                <div className="mt-1 mb-2 px-2">
                  <ItemFormPanel
                    form={form}
                    onChange={setForm}
                    onSave={handleSave}
                    onCancel={cancel}
                    isCreating={false}
                    isPending={isPending}
                    error={mutError}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {!canEdit && (
        <Alert variant="info">
          La modifica del listino prezzi è riservata agli utenti con ruolo <strong>Admin</strong> o <strong>CEO</strong>.
        </Alert>
      )}
    </div>
  );
}
