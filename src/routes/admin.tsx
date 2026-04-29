import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  Shield,
  ClipboardList,
  Phone,
  IdCard,
  Loader2,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Profile, Report, Category, Sector, ReportStatus, UserRole } from "@/lib/database.types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Area Admin — CivicVoice" },
      {
        name: "description",
        content: "Dashboard amministratore: gestione utenti, ruoli e accesso completo.",
      },
    ],
  }),
  component: AdminPage,
});

const ROLE_STYLES: Record<UserRole, string> = {
  citizen: "bg-secondary text-secondary-foreground",
  manager: "bg-primary/10 text-primary",
  admin: "bg-destructive/10 text-destructive",
};

const ROLE_LABELS: Record<UserRole, string> = {
  citizen: "Cittadino",
  manager: "Manager",
  admin: "Admin",
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  nuova: "Nuova",
  in_valutazione: "In valutazione",
  assegnata: "Assegnata",
  in_lavorazione: "In lavorazione",
  risolta: "Risolta",
  respinta: "Respinta",
  archiviata: "Archiviata",
};

function AdminPage() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog modifica ruolo
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("citizen");
  const [savingRole, setSavingRole] = useState(false);

  // Dialog nuova categoria/settore
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [sectDialogOpen, setSectDialogOpen] = useState(false);
  const [newSectName, setNewSectName] = useState("");
  const [savingLookup, setSavingLookup] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (role !== "admin") {
      toast.error("Accesso riservato agli amministratori.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: (role === "manager" ? "/manager" : "/mie-segnalazioni") as any });
      return;
    }
    fetchAll();
  }, [user, role, authLoading]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: reps }, { data: profs }, { data: cats }, { data: sects }] = await Promise.all([
      supabase
        .from("reports")
        .select(`*, categoria:categories(id,nome), settore:sectors(id,nome), foto:report_photos(id,file_url), profile:profiles(id,nome,cognome,telefono,codice_fiscale,foto_profilo_url,ruolo)`)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("cognome"),
      supabase.from("categories").select("*").order("nome"),
      supabase.from("sectors").select("*").order("nome"),
    ]);
    if (reps) setReports(reps as Report[]);
    if (profs) setProfiles(profs as Profile[]);
    if (cats) setCategories(cats as Category[]);
    if (sects) setSectors(sects as Sector[]);
    setLoading(false);
  };

  const openEditUser = (p: Profile) => {
    setEditUser(p);
    setNewRole(p.ruolo);
  };

  const saveRole = async () => {
    if (!editUser) return;
    setSavingRole(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ruolo: newRole })
      .eq("id", editUser.id);
    if (error) {
      toast.error("Errore nell'aggiornamento del ruolo.");
    } else {
      toast.success(`Ruolo aggiornato: ${ROLE_LABELS[newRole]}`);
      setEditUser(null);
      await fetchAll();
    }
    setSavingRole(false);
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingLookup(true);
    const { error } = await supabase
      .from("categories")
      .insert({ nome: newCatName.trim() });
    if (error) {
      toast.error("Errore nella creazione della categoria.");
    } else {
      toast.success("Categoria creata.");
      setNewCatName("");
      setCatDialogOpen(false);
      await fetchAll();
    }
    setSavingLookup(false);
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error("Impossibile eliminare la categoria (potrebbe essere in uso).");
    else { toast.success("Categoria eliminata."); await fetchAll(); }
  };

  const addSector = async () => {
    if (!newSectName.trim()) return;
    setSavingLookup(true);
    const { error } = await supabase
      .from("sectors")
      .insert({ nome: newSectName.trim() });
    if (error) {
      toast.error("Errore nella creazione del settore.");
    } else {
      toast.success("Settore creato.");
      setNewSectName("");
      setSectDialogOpen(false);
      await fetchAll();
    }
    setSavingLookup(false);
  };

  const deleteSector = async (id: string) => {
    const { error } = await supabase.from("sectors").delete().eq("id", id);
    if (error) toast.error("Impossibile eliminare il settore (potrebbe essere in uso).");
    else { toast.success("Settore eliminato."); await fetchAll(); }
  };

  const roleCounts: Record<UserRole, number> = { citizen: 0, manager: 0, admin: 0 };
  profiles.forEach((p) => { roleCounts[p.ruolo]++; });

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
            Area Amministratore
          </div>
          <h1 className="mt-2 font-display text-4xl font-extrabold md:text-5xl">
            Controllo completo
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Accesso ai dati personali dei segnalatori, gestione ruoli e
            supervisione di tutte le segnalazioni.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <Tabs defaultValue="segnalazioni">
          <TabsList className="bg-secondary">
            <TabsTrigger value="segnalazioni" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Segnalazioni ({reports.length})
            </TabsTrigger>
            <TabsTrigger value="utenti" className="gap-2">
              <Users className="h-4 w-4" />
              Utenti ({profiles.length})
            </TabsTrigger>
            <TabsTrigger value="categorie" className="gap-2">
              Categorie ({categories.length})
            </TabsTrigger>
            <TabsTrigger value="settori" className="gap-2">
              Settori ({sectors.length})
            </TabsTrigger>
            <TabsTrigger value="ruoli" className="gap-2">
              <Shield className="h-4 w-4" />
              Ruoli
            </TabsTrigger>
          </TabsList>

          {/* TAB SEGNALAZIONI */}
          <TabsContent value="segnalazioni" className="mt-6 space-y-4">
            {reports.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">Nessuna segnalazione.</div>
            ) : (
              reports.map((r) => {
                const prof = r.profile as Profile | null;
                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-border bg-card p-5"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-bold">{r.titolo}</span>
                          <Badge variant="secondary">{STATUS_LABELS[r.stato]}</Badge>
                          {r.categoria && (
                            <Badge variant="outline">
                              {(r.categoria as { nome: string }).nome}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {r.via}, {r.citta} · {new Date(r.created_at).toLocaleDateString("it-IT")}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{r.descrizione}</p>
                      </div>
                      {r.foto && r.foto.length > 0 && (
                        <img
                          src={r.foto[0].file_url}
                          alt=""
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      )}
                    </div>
                    {prof && (
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs">
                        <span className="font-semibold text-foreground">
                          Segnalatore: {prof.nome} {prof.cognome}
                        </span>
                        {prof.codice_fiscale && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <IdCard className="h-3 w-3" /> {prof.codice_fiscale}
                          </span>
                        )}
                        {prof.telefono && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" /> {prof.telefono}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* TAB UTENTI */}
          <TabsContent value="utenti" className="mt-6">
            <div
              className="overflow-hidden rounded-2xl border border-border bg-card"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Utente</th>
                    <th className="px-4 py-3 font-semibold">Codice fiscale</th>
                    <th className="px-4 py-3 font-semibold">Telefono</th>
                    <th className="px-4 py-3 font-semibold">Ruolo</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-border hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.nome} {p.cognome}</div>
                        <div className="text-xs text-muted-foreground">{p.citta ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                          <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.codice_fiscale ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.telefono ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[p.ruolo]}`}>
                          {ROLE_LABELS[p.ruolo]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditUser(p)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Ruolo
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB CATEGORIE */}
          <TabsContent value="categorie" className="mt-6">
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => setCatDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nuova categoria
              </Button>
            </div>
            <div className="space-y-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span className="font-medium">{c.nome}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteCategory(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB SETTORI */}
          <TabsContent value="settori" className="mt-6">
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => setSectDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nuovo settore
              </Button>
            </div>
            <div className="space-y-2">
              {sectors.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span className="font-medium">{s.nome}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteSector(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB RUOLI */}
          <TabsContent value="ruoli" className="mt-6">
            <div className="grid gap-4 md:grid-cols-3">
              {(["citizen", "manager", "admin"] as UserRole[]).map((r) => {
                const info = {
                  citizen: {
                    title: "Cittadino",
                    desc: "Crea segnalazioni e visualizza il feed pubblico in forma anonima.",
                  },
                  manager: {
                    title: "Manager",
                    desc: "Categorizza segnalazioni e assegna gli uffici. Non vede i dati del segnalatore.",
                  },
                  admin: {
                    title: "Admin",
                    desc: "Accesso completo, inclusi dati anagrafici e gestione ruoli.",
                  },
                }[r];
                return (
                  <div
                    key={r}
                    className="rounded-2xl border border-border bg-card p-6"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="font-display text-lg font-bold">{info.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{info.desc}</div>
                    <div className="mt-4 flex items-end justify-between">
                      <div className="font-display text-3xl font-extrabold">{roleCounts[r]}</div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[r]}`}>
                        {ROLE_LABELS[r]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <SiteFooter />

      {/* Dialog modifica ruolo */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Modifica ruolo — {editUser?.nome} {editUser?.cognome}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="citizen">Cittadino</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annulla</Button>
            <Button onClick={saveRole} disabled={savingRole}>
              {savingRole ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog nuova categoria */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuova categoria</DialogTitle></DialogHeader>
          <Input
            placeholder="Nome categoria"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Annulla</Button>
            <Button onClick={addCategory} disabled={savingLookup || !newCatName.trim()}>
              {savingLookup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog nuovo settore */}
      <Dialog open={sectDialogOpen} onOpenChange={setSectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo settore</DialogTitle></DialogHeader>
          <Input
            placeholder="Nome settore / ufficio"
            value={newSectName}
            onChange={(e) => setNewSectName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectDialogOpen(false)}>Annulla</Button>
            <Button onClick={addSector} disabled={savingLookup || !newSectName.trim()}>
              {savingLookup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
