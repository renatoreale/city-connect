import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { catsApi } from '@/api/cats';
import { clientsApi } from '@/api/clients';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { PageSpinner } from '@/components/ui/Spinner';

const schema = z.object({
  name: z.string().min(1, 'Nome obbligatorio'),
  clientId: z.string().min(1, 'Proprietario obbligatorio'),
  breed: z.string().optional(),
  gender: z.enum(['M', 'F', '']).optional(),
  size: z.enum(['normale', 'grande', '']).optional(),
  birthDate: z.string().optional(),
  microchipNumber: z.string().optional(),
  coatColor: z.string().optional(),
  weightKg: z.coerce.number().positive().optional().or(z.literal('')),
  isNeutered: z.boolean().default(false),
  vaccinationDate: z.string().optional(),
  fivFelvTestDate: z.string().optional(),
  fivFelvResult: z.string().optional(),
  requiresMedication: z.boolean().default(false),
  medicationNotes: z.string().optional(),
  dietaryNotes: z.string().optional(),
  allergies: z.string().optional(),
  temperament: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CatFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const preselectedClientId = searchParams.get('clientId') ?? '';

  const { data: existing, isLoading } = useQuery({
    queryKey: ['cat', id],
    queryFn: () => catsApi.get(id!),
    enabled: isEdit,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 1, ''],
    queryFn: () => clientsApi.list({ page: 1, limit: 200 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { clientId: preselectedClientId },
  });

  const requiresMedication = watch('requiresMedication');

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name ?? '',
        clientId: existing.client?.id ?? '',
        breed: existing.breed ?? '',
        gender: (existing.gender as 'M' | 'F' | '') ?? '',
        size: (existing.size as 'normale' | 'grande' | '') ?? '',
        birthDate: existing.birthDate ?? '',
        microchipNumber: existing.microchipNumber ?? '',
        coatColor: existing.coatColor ?? '',
        weightKg: existing.weightKg ?? '',
        isNeutered: existing.isNeutered ?? false,
        vaccinationDate: existing.vaccinationDate ?? '',
        fivFelvTestDate: existing.fivFelvTestDate ?? '',
        fivFelvResult: existing.fivFelvResult ?? '',
        requiresMedication: existing.requiresMedication ?? false,
        medicationNotes: existing.medicationNotes ?? '',
        dietaryNotes: existing.dietaryNotes ?? '',
        allergies: existing.allergies ?? '',
        temperament: existing.temperament ?? '',
        notes: existing.notes ?? '',
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        gender: (values.gender || undefined) as 'M' | 'F' | undefined,
        size: (values.size || 'normale') as 'normale' | 'grande',
        weightKg: values.weightKg === '' ? undefined : Number(values.weightKg),
      };
      return isEdit ? catsApi.update(id!, payload) : catsApi.create(payload);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['cats'] });
      qc.invalidateQueries({ queryKey: ['cat', id] });
      qc.invalidateQueries({ queryKey: ['cats', 'byClient'] });
      const backClientId = saved.client?.id ?? preselectedClientId;
      if (backClientId) {
        navigate(`/clients/${backClientId}`);
      } else {
        navigate('/cats');
      }
    },
  });

  if (isEdit && isLoading) return <PageSpinner />;

  const clientOptions = (clientsData?.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.lastName} ${c.firstName}`,
  }));

  const backTarget =
    existing?.client?.id
      ? `/clients/${existing.client.id}`
      : preselectedClientId
      ? `/clients/${preselectedClientId}`
      : '/cats';

  return (
    <div className="max-w-2xl space-y-4">
      {/* Back + title */}
      <div>
        <button
          onClick={() => navigate(backTarget)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {existing?.client
            ? `${existing.client.lastName} ${existing.client.firstName}`
            : 'Gatti'}
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {isEdit ? `Modifica ${existing?.name ?? 'gatto'}` : 'Nuovo gatto'}
        </h1>
      </div>

      {mutation.isError && (
        <Alert variant="error">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Errore nel salvataggio'}
        </Alert>
      )}

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        {/* Dati base */}
        <Card title="Dati anagrafici">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome *"
              error={errors.name?.message}
              {...register('name')}
            />
            <Select
              label="Proprietario *"
              options={clientOptions}
              placeholder="Seleziona cliente..."
              error={errors.clientId?.message}
              {...register('clientId')}
            />
            <Input label="Razza" {...register('breed')} />
            <Input label="Colore mantello" {...register('coatColor')} />
            <Select
              label="Sesso"
              options={[
                { value: 'M', label: 'Maschio' },
                { value: 'F', label: 'Femmina' },
              ]}
              placeholder="Non specificato"
              {...register('gender')}
            />
            <Select
              label="Taglia"
              options={[
                { value: 'normale', label: 'Normale' },
                { value: 'grande', label: 'Grande' },
              ]}
              placeholder="Normale"
              {...register('size')}
            />
            <Input
              label="Data di nascita"
              type="date"
              {...register('birthDate')}
            />
            <Input
              label="Peso (kg)"
              type="number"
              step="0.1"
              min="0"
              {...register('weightKg')}
            />
            <Input
              label="N° microchip"
              placeholder="Codice microchip"
              {...register('microchipNumber')}
            />
          </div>
        </Card>

        {/* Salute */}
        <Card title="Salute & Vaccinazioni">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Checkbox
                label="Sterilizzato/a"
                {...register('isNeutered')}
              />
              <Checkbox
                label="Richiede medicazioni"
                {...register('requiresMedication')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Data ultima vaccinazione"
                type="date"
                {...register('vaccinationDate')}
              />
              <Input
                label="Data test FIV/FeLV"
                type="date"
                {...register('fivFelvTestDate')}
              />
              <Input
                label="Risultato FIV/FeLV"
                placeholder="es. Negativo"
                {...register('fivFelvResult')}
              />
            </div>

            {requiresMedication && (
              <Textarea
                label="Note medicazioni"
                rows={2}
                placeholder="Farmaci, dosaggi, orari..."
                {...register('medicationNotes')}
              />
            )}

            <Input
              label="Allergie"
              placeholder="Allergie note"
              {...register('allergies')}
            />
          </div>
        </Card>

        {/* Gestione */}
        <Card title="Alimentazione & Comportamento">
          <div className="space-y-4">
            <Textarea
              label="Istruzioni alimentari"
              rows={2}
              placeholder="Tipo di cibo, quantità, orari, preferenze..."
              {...register('dietaryNotes')}
            />
            <Textarea
              label="Temperamento / Comportamento"
              rows={2}
              placeholder="Carattere, abitudini, cose importanti da sapere..."
              {...register('temperament')}
            />
          </div>
        </Card>

        {/* Note generali */}
        <Card title="Note interne">
          <Textarea
            label="Note"
            rows={2}
            placeholder="Note visibili solo al personale..."
            {...register('notes')}
          />
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end pb-4">
          <Button type="button" variant="outline" onClick={() => navigate(backTarget)}>
            Annulla
          </Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            {isEdit ? 'Salva modifiche' : 'Crea gatto'}
          </Button>
        </div>
      </form>
    </div>
  );
}
