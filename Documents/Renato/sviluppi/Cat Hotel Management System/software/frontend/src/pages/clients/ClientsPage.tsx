import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserX, UserCheck, Trash2, Eye, Edit } from 'lucide-react';
import { clientsApi } from '@/api/clients';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageSpinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import type { Client } from '@/types';

export function ClientsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [blacklistTarget, setBlacklistTarget] = useState<{ client: Client; add: boolean } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clients', page, search],
    queryFn: () => clientsApi.list({ page, limit: 20, search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setDeleteTarget(null);
    },
  });

  const blacklistMutation = useMutation({
    mutationFn: ({ id, add, reason }: { id: string; add: boolean; reason?: string }) =>
      add ? clientsApi.addToBlacklist(id, reason) : clientsApi.removeFromBlacklist(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setBlacklistTarget(null);
    },
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  if (isLoading) return <PageSpinner />;
  if (isError) return <Alert variant="error">Errore nel caricamento dei clienti.</Alert>;

  const clients = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Clienti</h1>
          <p className="text-sm text-gray-400">{total} clienti totali</p>
        </div>
        <Button onClick={() => navigate('/clients/new')} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Nuovo cliente
        </Button>
      </div>

      {/* Search */}
      <Card>
        <Input
          placeholder="Cerca per nome, cognome, email, telefono..."
          value={search}
          onChange={handleSearchChange}
          prefix={<Search className="w-4 h-4 text-gray-400" />}
        />
      </Card>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sage-100 bg-sage-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Contatti</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Città</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Stato</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-50">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    Nessun cliente trovato
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-sage-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">
                        {client.lastName} {client.firstName}
                      </p>
                      {client.fiscalCode && (
                        <p className="text-xs text-gray-400">{client.fiscalCode}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{client.email || '—'}</p>
                      <p className="text-xs text-gray-400">{client.phone1 || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {client.city || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {client.isBlacklisted && <Badge variant="red">Blacklist</Badge>}
                        {!client.isActive && <Badge variant="gray">Inattivo</Badge>}
                        {client.isActive && !client.isBlacklisted && (
                          <Badge variant="sage">Attivo</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="p-1.5 rounded text-gray-400 hover:text-sage-600 hover:bg-sage-50 transition-colors"
                          title="Dettaglio"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/clients/${client.id}/edit`)}
                          className="p-1.5 rounded text-gray-400 hover:text-sage-600 hover:bg-sage-50 transition-colors"
                          title="Modifica"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setBlacklistTarget({ client, add: !client.isBlacklisted })
                          }
                          className="p-1.5 rounded text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                          title={client.isBlacklisted ? 'Rimuovi da blacklist' : 'Aggiungi a blacklist'}
                        >
                          {client.isBlacklisted ? (
                            <UserCheck className="w-4 h-4" />
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(client)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-sage-100">
            <p className="text-xs text-gray-400">
              Pagina {page} di {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Precedente
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Successiva
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        title="Elimina cliente"
        message={`Sei sicuro di voler eliminare ${deleteTarget?.firstName} ${deleteTarget?.lastName}? L'operazione non può essere annullata.`}
        confirmLabel="Elimina"
      />

      {/* Blacklist confirm */}
      <ConfirmDialog
        open={!!blacklistTarget}
        onClose={() => setBlacklistTarget(null)}
        onConfirm={() =>
          blacklistTarget &&
          blacklistMutation.mutate({
            id: blacklistTarget.client.id,
            add: blacklistTarget.add,
          })
        }
        loading={blacklistMutation.isPending}
        confirmVariant={blacklistTarget?.add ? 'danger' : 'primary'}
        title={blacklistTarget?.add ? 'Aggiungi a blacklist' : 'Rimuovi da blacklist'}
        message={
          blacklistTarget?.add
            ? `Aggiungere ${blacklistTarget.client.firstName} ${blacklistTarget.client.lastName} alla blacklist?`
            : `Rimuovere ${blacklistTarget?.client.firstName} ${blacklistTarget?.client.lastName} dalla blacklist?`
        }
        confirmLabel={blacklistTarget?.add ? 'Metti in blacklist' : 'Rimuovi da blacklist'}
      />
    </div>
  );
}
