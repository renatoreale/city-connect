import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { clientsApi } from '@/api/clients';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { PageSpinner } from '@/components/ui/Spinner';

const schema = z.object({
  firstName: z.string().min(1, 'Nome obbligatorio'),
  lastName: z.string().min(1, 'Cognome obbligatorio'),
  fiscalCode: z.string().optional(),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  phone1: z.string().optional(),
  phone1Label: z.string().optional(),
  phone2: z.string().optional(),
  phone2Label: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  province: z.string().optional(),
  intercom: z.string().optional(),
  floor: z.string().optional(),
  staircase: z.string().optional(),
  apartment: z.string().optional(),
  mailbox: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  veterinarianName: z.string().optional(),
  veterinarianPhone: z.string().optional(),
  notes: z.string().optional(),
  privacyAccepted: z.boolean().default(false),
  healthFormAccepted: z.boolean().default(false),
  rulesAccepted: z.boolean().default(false),
});
type FormValues = z.infer<typeof schema>;

export function ClientFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const { data: existing, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (existing) {
      reset({
        firstName: existing.firstName ?? '',
        lastName: existing.lastName ?? '',
        fiscalCode: existing.fiscalCode ?? '',
        email: existing.email ?? '',
        phone1: existing.phone1 ?? '',
        phone1Label: existing.phone1Label ?? '',
        phone2: existing.phone2 ?? '',
        phone2Label: existing.phone2Label ?? '',
        address: existing.address ?? '',
        city: existing.city ?? '',
        postalCode: existing.postalCode ?? '',
        province: existing.province ?? '',
        intercom: existing.intercom ?? '',
        floor: existing.floor ?? '',
        staircase: existing.staircase ?? '',
        apartment: existing.apartment ?? '',
        mailbox: existing.mailbox ?? '',
        emergencyContactName: existing.emergencyContactName ?? '',
        emergencyContactPhone: existing.emergencyContactPhone ?? '',
        veterinarianName: existing.veterinarianName ?? '',
        veterinarianPhone: existing.veterinarianPhone ?? '',
        notes: existing.notes ?? '',
        privacyAccepted: existing.privacyAccepted ?? false,
        healthFormAccepted: existing.healthFormAccepted ?? false,
        rulesAccepted: existing.rulesAccepted ?? false,
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit ? clientsApi.update(id!, values) : clientsApi.create(values),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client', id] });
      navigate(`/clients/${saved.id}`);
    },
  });

  if (isEdit && isLoading) return <PageSpinner />;

  return (
    <div className="max-w-3xl space-y-4">
      {/* Back + title */}
      <div>
        <button
          onClick={() => navigate(isEdit ? `/clients/${id}` : '/clients')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEdit ? 'Dettaglio cliente' : 'Clienti'}
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {isEdit ? 'Modifica cliente' : 'Nuovo cliente'}
        </h1>
      </div>

      {mutation.isError && (
        <Alert variant="error">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Errore nel salvataggio'}
        </Alert>
      )}

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        {/* Anagrafica */}
        <Card title="Anagrafica">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cognome *"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
            <Input
              label="Nome *"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Codice fiscale"
              className="sm:col-span-2"
              error={errors.fiscalCode?.message}
              {...register('fiscalCode')}
            />
          </div>
        </Card>

        {/* Contatti */}
        <Card title="Contatti">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              className="sm:col-span-2"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input label="Telefono 1" {...register('phone1')} />
            <Input label="Etichetta telefono 1" placeholder="es. casa, lavoro" {...register('phone1Label')} />
            <Input label="Telefono 2" {...register('phone2')} />
            <Input label="Etichetta telefono 2" {...register('phone2Label')} />
          </div>
        </Card>

        {/* Indirizzo */}
        <Card title="Indirizzo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Via / Piazza"
              className="sm:col-span-2"
              {...register('address')}
            />
            <Input label="Città" {...register('city')} />
            <Input label="CAP" {...register('postalCode')} />
            <Input label="Provincia" {...register('province')} />
            <Input label="Citofono" {...register('intercom')} />
            <Input label="Piano" {...register('floor')} />
            <Input label="Scala" {...register('staircase')} />
            <Input label="Interno" {...register('apartment')} />
            <Input label="Cassetta postale" {...register('mailbox')} />
          </div>
        </Card>

        {/* Emergenza */}
        <Card title="Contatto d'emergenza & Veterinario">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nome contatto emergenza" {...register('emergencyContactName')} />
            <Input label="Tel. contatto emergenza" {...register('emergencyContactPhone')} />
            <Input label="Nome veterinario" {...register('veterinarianName')} />
            <Input label="Tel. veterinario" {...register('veterinarianPhone')} />
          </div>
        </Card>

        {/* Note */}
        <Card title="Note">
          <Textarea
            label="Note interne"
            rows={3}
            placeholder="Note visibili solo al personale..."
            {...register('notes')}
          />
        </Card>

        {/* Consensi */}
        <Card title="Consensi">
          <div className="space-y-3">
            <Checkbox
              label="Informativa privacy"
              description="Il cliente ha firmato l'informativa sulla privacy"
              {...register('privacyAccepted')}
            />
            <Checkbox
              label="Modulo salute"
              description="Il cliente ha compilato il modulo sullo stato di salute del gatto"
              {...register('healthFormAccepted')}
            />
            <Checkbox
              label="Regolamento"
              description="Il cliente ha letto e accettato il regolamento della struttura"
              {...register('rulesAccepted')}
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit ? `/clients/${id}` : '/clients')}
          >
            Annulla
          </Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>
            {isEdit ? 'Salva modifiche' : 'Crea cliente'}
          </Button>
        </div>
      </form>
    </div>
  );
}
