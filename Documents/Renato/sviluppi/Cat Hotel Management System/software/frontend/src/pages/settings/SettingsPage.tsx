import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Check, ChevronRight, ListOrdered } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { settingsApi } from '@/api/settings';
import type { TenantSettings } from '@/types';

// ─── Shared save hook (one instance per section component) ───────────────────

function useSaveSection() {
  const qc = useQueryClient();
  const [savedOk, setSavedOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: Partial<TenantSettings>) => settingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-settings'] });
      setSavedOk(true);
      setSaveError(null);
      setTimeout(() => setSavedOk(false), 3000);
    },
    onError: (err: any) => {
      setSaveError(err?.response?.data?.message ?? 'Errore nel salvataggio');
    },
  });

  return {
    save: mutation.mutate,
    isPending: mutation.isPending,
    savedOk,
    saveError,
  };
}

// ─── Section wrapper card ─────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  subtitle?: string;
  onSave: () => void;
  isPending: boolean;
  savedOk: boolean;
  saveError: string | null;
  children: ReactNode;
}

function Section({ title, subtitle, onSave, isPending, savedOk, saveError, children }: SectionProps) {
  return (
    <Card
      title={title}
      subtitle={subtitle}
      actions={
        <div className="flex items-center gap-3">
          {savedOk && (
            <span className="flex items-center gap-1 text-xs text-sage-600 font-medium">
              <Check className="w-3.5 h-3.5" /> Salvato
            </span>
          )}
          {saveError && <span className="text-xs text-red-500 max-w-xs truncate">{saveError}</span>}
          <Button size="sm" onClick={onSave} loading={isPending}>
            Salva
          </Button>
        </div>
      }
    >
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

// ─── 1. Sanitarie ─────────────────────────────────────────────────────────────

function SanitarieSection({ settings }: { settings: TenantSettings }) {
  const [fivFelv, setFivFelv] = useState(String(settings.fivFelvValidityMonths));
  const [vaccination, setVaccination] = useState(String(settings.vaccinationValidityMonths));
  const { save, isPending, savedOk, saveError } = useSaveSection();

  useEffect(() => {
    setFivFelv(String(settings.fivFelvValidityMonths));
    setVaccination(String(settings.vaccinationValidityMonths));
  }, [settings]);

  return (
    <Section
      title="Sanitarie"
      subtitle="Validità dei certificati sanitari richiesti ai gatti ospiti"
      onSave={() => save({ fivFelvValidityMonths: Number(fivFelv), vaccinationValidityMonths: Number(vaccination) })}
      isPending={isPending}
      savedOk={savedOk}
      saveError={saveError}
    >
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Validità test FIV/FeLV (mesi)"
          type="number"
          min={1}
          value={fivFelv}
          onChange={e => setFivFelv(e.target.value)}
        />
        <Input
          label="Validità vaccinazione (mesi)"
          type="number"
          min={1}
          value={vaccination}
          onChange={e => setVaccination(e.target.value)}
        />
      </div>
    </Section>
  );
}

// ─── 2. Prenotazioni ─────────────────────────────────────────────────────────

function PrenotazioniSection({ settings }: { settings: TenantSettings }) {
  const [checkInTime, setCheckInTime] = useState(settings.defaultCheckInTime ?? '');
  const [checkOutTime, setCheckOutTime] = useState(settings.defaultCheckOutTime ?? '');
  const [minDays, setMinDays] = useState(String(settings.minBookingDays));
  const [maxDays, setMaxDays] = useState(String(settings.maxBookingDays));
  const { save, isPending, savedOk, saveError } = useSaveSection();

  useEffect(() => {
    setCheckInTime(settings.defaultCheckInTime ?? '');
    setCheckOutTime(settings.defaultCheckOutTime ?? '');
    setMinDays(String(settings.minBookingDays));
    setMaxDays(String(settings.maxBookingDays));
  }, [settings]);

  return (
    <Section
      title="Prenotazioni"
      subtitle="Orari predefiniti e durata minima/massima del soggiorno"
      onSave={() =>
        save({
          defaultCheckInTime: checkInTime || null,
          defaultCheckOutTime: checkOutTime || null,
          minBookingDays: Number(minDays),
          maxBookingDays: Number(maxDays),
        })
      }
      isPending={isPending}
      savedOk={savedOk}
      saveError={saveError}
    >
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Orario check-in predefinito"
          type="time"
          value={checkInTime}
          onChange={e => setCheckInTime(e.target.value)}
        />
        <Input
          label="Orario check-out predefinito"
          type="time"
          value={checkOutTime}
          onChange={e => setCheckOutTime(e.target.value)}
        />
        <Input
          label="Durata minima soggiorno (giorni)"
          type="number"
          min={1}
          value={minDays}
          onChange={e => setMinDays(e.target.value)}
        />
        <Input
          label="Durata massima soggiorno (giorni)"
          type="number"
          min={1}
          value={maxDays}
          onChange={e => setMaxDays(e.target.value)}
        />
      </div>
    </Section>
  );
}

// ─── 3. Preventivi e Pagamenti ────────────────────────────────────────────────

function PreventiviSection({ settings }: { settings: TenantSettings }) {
  const [quoteValidity, setQuoteValidity] = useState(String(settings.quoteValidityDays));
  const [deposit, setDeposit] = useState(String(Number(settings.depositPercentage)));
  const [checkin, setCheckin] = useState(String(Number(settings.checkinPaymentPercentage)));
  const [checkout, setCheckout] = useState(String(Number(settings.checkoutPaymentPercentage)));
  const { save, isPending, savedOk, saveError } = useSaveSection();

  const total = Number(deposit) + Number(checkin) + Number(checkout);
  const sumError = total !== 100 ? `La somma è ${total}%, deve essere 100%` : null;

  useEffect(() => {
    setQuoteValidity(String(settings.quoteValidityDays));
    setDeposit(String(Number(settings.depositPercentage)));
    setCheckin(String(Number(settings.checkinPaymentPercentage)));
    setCheckout(String(Number(settings.checkoutPaymentPercentage)));
  }, [settings]);

  return (
    <Section
      title="Preventivi e Pagamenti"
      subtitle="Validità dei preventivi e ripartizione dei pagamenti"
      onSave={() => {
        if (sumError) return;
        save({
          quoteValidityDays: Number(quoteValidity),
          depositPercentage: Number(deposit),
          checkinPaymentPercentage: Number(checkin),
          checkoutPaymentPercentage: Number(checkout),
        });
      }}
      isPending={isPending}
      savedOk={savedOk}
      saveError={saveError}
    >
      <Input
        label="Validità preventivo (giorni)"
        type="number"
        min={1}
        value={quoteValidity}
        onChange={e => setQuoteValidity(e.target.value)}
        className="max-w-xs"
      />
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Ripartizione pagamenti</p>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Acconto (%)"
            type="number"
            min={0}
            max={100}
            value={deposit}
            onChange={e => setDeposit(e.target.value)}
          />
          <Input
            label="Al check-in (%)"
            type="number"
            min={0}
            max={100}
            value={checkin}
            onChange={e => setCheckin(e.target.value)}
          />
          <Input
            label="Al check-out (%)"
            type="number"
            min={0}
            max={100}
            value={checkout}
            onChange={e => setCheckout(e.target.value)}
          />
        </div>
        {sumError ? (
          <p className="text-xs text-red-500 mt-1.5">{sumError}</p>
        ) : (
          <p className="text-xs text-sage-600 mt-1.5 flex items-center gap-1">
            <Check className="w-3 h-3" /> Totale: 100%
          </p>
        )}
      </div>
    </Section>
  );
}

// ─── 4. Gabbie ────────────────────────────────────────────────────────────────

function GabbieSection({ settings }: { settings: TenantSettings }) {
  const [singole, setSingole] = useState(String(settings.numSingole));
  const [doppie, setDoppie] = useState(String(settings.numDoppie));
  const [occupancyDays, setOccupancyDays] = useState(String(settings.cageOccupancyDays));
  const { save, isPending, savedOk, saveError } = useSaveSection();

  useEffect(() => {
    setSingole(String(settings.numSingole));
    setDoppie(String(settings.numDoppie));
    setOccupancyDays(String(settings.cageOccupancyDays));
  }, [settings]);

  return (
    <Section
      title="Gabbie"
      subtitle="Numero di gabbie disponibili e criteri di occupazione"
      onSave={() =>
        save({
          numSingole: Number(singole),
          numDoppie: Number(doppie),
          cageOccupancyDays: Number(occupancyDays),
        })
      }
      isPending={isPending}
      savedOk={savedOk}
      saveError={saveError}
    >
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Gabbie singole"
          type="number"
          min={0}
          value={singole}
          onChange={e => setSingole(e.target.value)}
        />
        <Input
          label="Gabbie doppie"
          type="number"
          min={0}
          value={doppie}
          onChange={e => setDoppie(e.target.value)}
        />
        <Input
          label="Giorni occupazione gabbia"
          type="number"
          min={1}
          value={occupancyDays}
          onChange={e => setOccupancyDays(e.target.value)}
          hint="Giorni contati per ogni prenotazione"
        />
      </div>
    </Section>
  );
}

// ─── 5. Appuntamenti ──────────────────────────────────────────────────────────

function AppuntamentiSection({ settings }: { settings: TenantSettings }) {
  const [checkInMax, setCheckInMax] = useState(String(settings.checkInMaxPerSlot));
  const [checkOutMax, setCheckOutMax] = useState(String(settings.checkOutMaxPerSlot));
  const [slotDuration, setSlotDuration] = useState(String(settings.appointmentSlotDuration));
  const [sendConfirmation, setSendConfirmation] = useState(settings.sendAppointmentConfirmation);
  const [sendReminder, setSendReminder] = useState(settings.sendAppointmentReminder);
  const [reminderHours, setReminderHours] = useState(String(settings.appointmentReminderHours));
  const { save, isPending, savedOk, saveError } = useSaveSection();

  useEffect(() => {
    setCheckInMax(String(settings.checkInMaxPerSlot));
    setCheckOutMax(String(settings.checkOutMaxPerSlot));
    setSlotDuration(String(settings.appointmentSlotDuration));
    setSendConfirmation(settings.sendAppointmentConfirmation);
    setSendReminder(settings.sendAppointmentReminder);
    setReminderHours(String(settings.appointmentReminderHours));
  }, [settings]);

  return (
    <Section
      title="Appuntamenti"
      subtitle="Capacità degli slot e notifiche automatiche"
      onSave={() =>
        save({
          checkInMaxPerSlot: Number(checkInMax),
          checkOutMaxPerSlot: Number(checkOutMax),
          appointmentSlotDuration: Number(slotDuration),
          sendAppointmentConfirmation: sendConfirmation,
          sendAppointmentReminder: sendReminder,
          appointmentReminderHours: Number(reminderHours),
        })
      }
      isPending={isPending}
      savedOk={savedOk}
      saveError={saveError}
    >
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Max check-in per slot"
          type="number"
          min={1}
          value={checkInMax}
          onChange={e => setCheckInMax(e.target.value)}
        />
        <Input
          label="Max check-out per slot"
          type="number"
          min={1}
          value={checkOutMax}
          onChange={e => setCheckOutMax(e.target.value)}
        />
        <Input
          label="Durata slot (minuti)"
          type="number"
          min={15}
          step={15}
          value={slotDuration}
          onChange={e => setSlotDuration(e.target.value)}
        />
      </div>
      <div className="space-y-3 pt-2 border-t border-sage-100">
        <Checkbox
          label="Invia conferma appuntamento"
          description="Email di conferma quando viene creato un appuntamento"
          checked={sendConfirmation}
          onChange={e => setSendConfirmation(e.target.checked)}
        />
        <Checkbox
          label="Invia promemoria appuntamento"
          description="Email di promemoria prima della data dell'appuntamento"
          checked={sendReminder}
          onChange={e => setSendReminder(e.target.checked)}
        />
        {sendReminder && (
          <Input
            label="Ore prima per il promemoria"
            type="number"
            min={1}
            value={reminderHours}
            onChange={e => setReminderHours(e.target.value)}
            className="max-w-xs"
          />
        )}
      </div>
    </Section>
  );
}

// ─── 6. Pagamenti operativi ───────────────────────────────────────────────────

function PagamentiOperativiSection({ settings }: { settings: TenantSettings }) {
  const [requireCheckin, setRequireCheckin] = useState(settings.requireCheckinPaymentAtCheckin);
  const [requireCheckout, setRequireCheckout] = useState(settings.requireCheckoutPaymentAtCheckout);
  const { save, isPending, savedOk, saveError } = useSaveSection();

  useEffect(() => {
    setRequireCheckin(settings.requireCheckinPaymentAtCheckin);
    setRequireCheckout(settings.requireCheckoutPaymentAtCheckout);
  }, [settings]);

  return (
    <Section
      title="Pagamenti Operativi"
      subtitle="Obbligatorietà dei pagamenti durante check-in e check-out"
      onSave={() =>
        save({
          requireCheckinPaymentAtCheckin: requireCheckin,
          requireCheckoutPaymentAtCheckout: requireCheckout,
        })
      }
      isPending={isPending}
      savedOk={savedOk}
      saveError={saveError}
    >
      <div className="space-y-3">
        <Checkbox
          label="Richiedi pagamento check-in al momento del check-in"
          description="Il sistema bloccherà il check-in se il pagamento non è ancora registrato"
          checked={requireCheckin}
          onChange={e => setRequireCheckin(e.target.checked)}
        />
        <Checkbox
          label="Richiedi pagamento check-out al momento del check-out"
          description="Il sistema bloccherà il check-out se il pagamento non è ancora registrato"
          checked={requireCheckout}
          onChange={e => setRequireCheckout(e.target.checked)}
        />
      </div>
    </Section>
  );
}

// ─── 7. Notifiche ─────────────────────────────────────────────────────────────

function NotificheSection({ settings }: { settings: TenantSettings }) {
  const [sendBookingConf, setSendBookingConf] = useState(settings.sendBookingConfirmation);
  const [sendCheckInReminder, setSendCheckInReminder] = useState(settings.sendCheckInReminder);
  const [reminderDays, setReminderDays] = useState(String(settings.checkInReminderDays));
  const { save, isPending, savedOk, saveError } = useSaveSection();

  useEffect(() => {
    setSendBookingConf(settings.sendBookingConfirmation);
    setSendCheckInReminder(settings.sendCheckInReminder);
    setReminderDays(String(settings.checkInReminderDays));
  }, [settings]);

  return (
    <Section
      title="Notifiche"
      subtitle="Email automatiche inviate ai clienti"
      onSave={() =>
        save({
          sendBookingConfirmation: sendBookingConf,
          sendCheckInReminder,
          checkInReminderDays: Number(reminderDays),
        })
      }
      isPending={isPending}
      savedOk={savedOk}
      saveError={saveError}
    >
      <div className="space-y-3">
        <Checkbox
          label="Invia conferma prenotazione"
          description="Email automatica al cliente quando la prenotazione viene confermata"
          checked={sendBookingConf}
          onChange={e => setSendBookingConf(e.target.checked)}
        />
        <Checkbox
          label="Invia promemoria check-in"
          description="Email di promemoria giorni prima della data di arrivo"
          checked={sendCheckInReminder}
          onChange={e => setSendCheckInReminder(e.target.checked)}
        />
        {sendCheckInReminder && (
          <Input
            label="Giorni prima del check-in per il promemoria"
            type="number"
            min={1}
            value={reminderDays}
            onChange={e => setReminderDays(e.target.value)}
            className="max-w-xs"
          />
        )}
      </div>
    </Section>
  );
}

// ─── 8. Cat Taxi ──────────────────────────────────────────────────────────────

function CatTaxiSection({ settings }: { settings: TenantSettings }) {
  const [baseKm, setBaseKm] = useState(String(settings.taxiBaseKm));
  const [basePrice, setBasePrice] = useState(String(Number(settings.taxiBasePrice)));
  const [extraKmPrice, setExtraKmPrice] = useState(String(Number(settings.taxiExtraKmPrice)));
  const { save, isPending, savedOk, saveError } = useSaveSection();

  useEffect(() => {
    setBaseKm(String(settings.taxiBaseKm));
    setBasePrice(String(Number(settings.taxiBasePrice)));
    setExtraKmPrice(String(Number(settings.taxiExtraKmPrice)));
  }, [settings]);

  const base = Number(baseKm) || 0;
  const price = Number(basePrice) || 0;
  const extra = Number(extraKmPrice) || 0;
  const previewKm = Math.max(base + 10, 20);
  const previewFare = previewKm <= base ? price : price + (previewKm - base) * extra;

  return (
    <Section
      title="Cat Taxi"
      subtitle="Tariffa per il servizio di trasporto gatti a domicilio"
      onSave={() =>
        save({
          taxiBaseKm: Number(baseKm),
          taxiBasePrice: Number(basePrice),
          taxiExtraKmPrice: Number(extraKmPrice),
        })
      }
      isPending={isPending}
      savedOk={savedOk}
      saveError={saveError}
    >
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Km inclusi nella tariffa base"
          type="number"
          min={0}
          value={baseKm}
          onChange={e => setBaseKm(e.target.value)}
        />
        <Input
          label="Tariffa base (€)"
          type="number"
          min={0}
          step={0.5}
          value={basePrice}
          onChange={e => setBasePrice(e.target.value)}
        />
        <Input
          label="Costo km extra (€/km)"
          type="number"
          min={0}
          step={0.1}
          value={extraKmPrice}
          onChange={e => setExtraKmPrice(e.target.value)}
        />
      </div>
      <div className="bg-sage-50 rounded-lg px-4 py-3 text-sm text-sage-700">
        <span className="font-medium">Esempio — {previewKm} km:</span>{' '}
        <span className="font-semibold">€ {previewFare.toFixed(2)}</span>
        <span className="text-sage-500 ml-1">
          {previewKm > base
            ? `(€${price.toFixed(2)} base + ${previewKm - base} km × €${extra.toFixed(2)})`
            : `(nei ${base} km inclusi nella tariffa base)`}
        </span>
      </div>
    </Section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery<TenantSettings>({
    queryKey: ['tenant-settings'],
    queryFn: () => settingsApi.getAll(),
  });

  if (user?.role !== 'admin' && user?.role !== 'titolare') {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <Alert variant="error" title="Accesso negato">
          Questa sezione è riservata agli utenti con ruolo{' '}
          <strong>Amministratore</strong> o <strong>Titolare</strong>.
        </Alert>
      </div>
    );
  }

  if (isLoading) return <PageSpinner />;

  if (error || !settings) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <Alert variant="error" title="Errore caricamento">
          Impossibile caricare le impostazioni. Riprova più tardi.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Impostazioni Pensione</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configura i parametri operativi della pensione. Ogni sezione si salva indipendentemente.
        </p>
      </div>

      <SanitarieSection settings={settings} />
      <PrenotazioniSection settings={settings} />
      <PreventiviSection settings={settings} />
      <GabbieSection settings={settings} />
      <AppuntamentiSection settings={settings} />
      <PagamentiOperativiSection settings={settings} />
      <NotificheSection settings={settings} />
      <CatTaxiSection settings={settings} />

      {/* Link to price list */}
      <button
        onClick={() => navigate('/settings/price-list')}
        className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-sage-200 shadow-sm hover:border-sage-400 hover:shadow-md transition-all text-left group"
      >
        <div className="w-10 h-10 rounded-lg bg-sage-100 flex items-center justify-center shrink-0">
          <ListOrdered className="w-5 h-5 text-sage-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Listino Prezzi</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestisci le voci di alloggio e i servizi extra — incluso il modello <strong>Per km</strong> per il Cat Taxi
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-sage-600 shrink-0 transition-colors" />
      </button>
    </div>
  );
}
