import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { catsApi } from '@/api/cats';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageSpinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import type { Cat } from '@/types';

const sizeLabel: Record<string, string> = {
  normale: 'Normale',
  grande: 'Grande',
};

const genderLabel: Record<string, string> = {
  M: 'Maschio',
  F: 'Femmina',
};

export function CatsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Cat | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cats', page, search],
    queryFn: () => catsApi.list({ page, limit: 20, search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => catsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cats'] });
      setDeleteTarget(null);
    },
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  if (isLoading) return <PageSpinner />;
  if (isError) return <Alert variant="error">Errore nel caricamento dei gatti.</Alert>;

  const cats = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Gatti</h1>
          <p className="text-sm text-gray-400">{total} gatti registrati</p>
        </div>
        <Button onClick={() => navigate('/cats/new')} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Nuovo gatto
        </Button>
      </div>

      {/* Search */}
      <Card>
        <Input
          placeholder="Cerca per nome, razza, proprietario..."
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
                <th className="text-left px-4 py-3 font-medium text-gray-500">Gatto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Proprietario</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Caratteristiche</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Stato</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-50">
              {cats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    Nessun gatto trovato
                  </td>
                </tr>
              ) : (
                cats.map((cat) => (
                  <tr key={cat.id} className="hover:bg-sage-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🐱</span>
                        <div>
                          <p className="font-medium text-gray-800">{cat.name}</p>
                          {cat.breed && (
                            <p className="text-xs text-gray-400">{cat.breed}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {cat.client ? (
                        <button
                          onClick={() => navigate(`/clients/${cat.client!.id}`)}
                          className="hover:text-sage-600 hover:underline text-left"
                        >
                          {cat.client.lastName} {cat.client.firstName}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex gap-1.5 flex-wrap">
                        {cat.gender && (
                          <Badge variant="blue">{genderLabel[cat.gender] ?? cat.gender}</Badge>
                        )}
                        {cat.size && (
                          <Badge variant="gray">{sizeLabel[cat.size] ?? cat.size}</Badge>
                        )}
                        {cat.isNeutered && <Badge variant="sage">Sterilizzato</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cat.isBlacklisted ? (
                        <Badge variant="red">Blacklist</Badge>
                      ) : (
                        <Badge variant="sage">Attivo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {cat.client && (
                          <button
                            onClick={() => navigate(`/clients/${cat.client!.id}`)}
                            className="p-1.5 rounded text-gray-400 hover:text-sage-600 hover:bg-sage-50 transition-colors"
                            title="Vedi proprietario"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/cats/${cat.id}/edit`)}
                          className="p-1.5 rounded text-gray-400 hover:text-sage-600 hover:bg-sage-50 transition-colors"
                          title="Modifica"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cat)}
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
        title="Elimina gatto"
        message={`Sei sicuro di voler eliminare ${deleteTarget?.name}? L'operazione non può essere annullata.`}
        confirmLabel="Elimina"
      />
    </div>
  );
}
