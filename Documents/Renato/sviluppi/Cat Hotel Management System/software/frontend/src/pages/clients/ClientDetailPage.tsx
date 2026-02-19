import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Edit, ArrowLeft, Cat, Phone, Mail, MapPin, AlertTriangle } from 'lucide-react';
import { clientsApi } from '@/api/clients';
import { catsApi } from '@/api/cats';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: client, isLoading, isError } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id!),
    enabled: !!id,
  });

  const { data: cats } = useQuery({
    queryKey: ['cats', 'byClient', id],
    queryFn: () => catsApi.byClient(id!),
    enabled: !!id,
  });

  if (isLoading) return <PageSpinner />;
  if (isError || !client) return <Alert variant="error">Cliente non trovato.</Alert>;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/clients')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Clienti
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">
              {client.lastName} {client.firstName}
            </h1>
            {client.isBlacklisted && <Badge variant="red">Blacklist</Badge>}
            {!client.isActive && <Badge variant="gray">Inattivo</Badge>}
          </div>
          {client.fiscalCode && (
            <p className="text-sm text-gray-400 mt-0.5">{client.fiscalCode}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/clients/${id}/edit`)}
        >
          <Edit className="w-4 h-4 mr-1.5" />
          Modifica
        </Button>
      </div>

      {client.isBlacklisted && client.blacklistReason && (
        <Alert variant="error" title="In blacklist">
          {client.blacklistReason}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contatti */}
        <Card title="Contatti">
          <div className="space-y-3 text-sm">
            {client.email && (
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                {client.email}
              </div>
            )}
            {client.phone1 && (
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                {client.phone1}
                {client.phone1Label && (
                  <span className="text-gray-400">({client.phone1Label})</span>
                )}
              </div>
            )}
            {client.phone2 && (
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                {client.phone2}
                {client.phone2Label && (
                  <span className="text-gray-400">({client.phone2Label})</span>
                )}
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p>{client.address}</p>
                  {(client.city || client.postalCode || client.province) && (
                    <p className="text-gray-500">
                      {[client.postalCode, client.city, client.province]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  )}
                  {(client.intercom || client.floor) && (
                    <p className="text-xs text-gray-400">
                      {[
                        client.intercom && `Citofono: ${client.intercom}`,
                        client.floor && `Piano: ${client.floor}`,
                        client.staircase && `Scala: ${client.staircase}`,
                        client.apartment && `Int. ${client.apartment}`,
                        client.mailbox && `Cassetta: ${client.mailbox}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Contatto emergenza + veterinario */}
        <Card title="Emergenza & Veterinario">
          <div className="space-y-4 text-sm">
            {(client.emergencyContactName || client.emergencyContactPhone) ? (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Contatto emergenza
                </p>
                <p className="text-gray-700">{client.emergencyContactName || '—'}</p>
                {client.emergencyContactPhone && (
                  <p className="text-gray-500">{client.emergencyContactPhone}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Nessun contatto d'emergenza
              </p>
            )}

            {(client.veterinarianName || client.veterinarianPhone) && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Veterinario
                </p>
                <p className="text-gray-700">{client.veterinarianName || '—'}</p>
                {client.veterinarianPhone && (
                  <p className="text-gray-500">{client.veterinarianPhone}</p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Consensi */}
        <Card title="Consensi">
          <div className="space-y-2 text-sm">
            <ConsentRow label="Privacy" value={client.privacyAccepted} />
            <ConsentRow label="Modulo salute" value={client.healthFormAccepted} />
            <ConsentRow label="Regolamento" value={client.rulesAccepted} />
          </div>
        </Card>

        {/* Note */}
        {client.notes && (
          <Card title="Note">
            <p className="text-sm text-gray-700 whitespace-pre-line">{client.notes}</p>
          </Card>
        )}
      </div>

      {/* Gatti */}
      <Card
        title="Gatti"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/cats/new?clientId=${id}`)}
          >
            <Cat className="w-4 h-4 mr-1.5" />
            Aggiungi gatto
          </Button>
        }
      >
        {!cats || cats.length === 0 ? (
          <p className="text-sm text-gray-400">Nessun gatto registrato.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cats.map((cat) => (
              <Link
                key={cat.id}
                to={`/cats/${cat.id}/edit`}
                className="flex items-center gap-3 p-3 rounded-lg border border-sage-100 hover:border-sage-300 hover:bg-sage-50 transition-colors"
              >
                <div className="w-9 h-9 bg-sage-100 rounded-full flex items-center justify-center text-lg shrink-0">
                  🐱
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{cat.name}</p>
                  <p className="text-xs text-gray-400">
                    {cat.breed || 'Razza non specificata'}
                    {cat.birthDate && ` · ${cat.birthDate}`}
                  </p>
                </div>
                {cat.isBlacklisted && (
                  <Badge variant="red" className="ml-auto shrink-0">Blacklist</Badge>
                )}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ConsentRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <Badge variant={value ? 'sage' : 'gray'}>{value ? 'Sì' : 'No'}</Badge>
    </div>
  );
}
