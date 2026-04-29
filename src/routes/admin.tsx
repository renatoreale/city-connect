/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users, Shield, ClipboardList, Phone, IdCard,
  Loader2, Plus, Trash2, Pencil, MapPin, Building2, Wrench, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type {
  Profile, Report, Category, Sector, UserRole,
  Regione, Comune, Ufficio, SquadraLavoro,
} from "@/lib/database.types";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_STYLES } from "@/lib/database.types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Area Admin — CivicVoice" },
      { name: "description", content: "Dashboard super admin: gestione utenti, ruoli e gerarchia geografica." },
    ],
  }),
  component: AdminPage,
});

const STATUS_LABELS: Record<string, string> = {
  nuova: "Nuova", in_valutazione: "In valutazione", assegnata: "Assegnata",
  in_lavorazione: "In lavorazione", terminata: "Terminata",
  risolta: "Risolta", respinta: "Respinta", archiviata: "Archiviata",
};

function AdminPage() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [regioni, setRegioni] = useState<Regione[]>([]);
  const [comuni, setComuni] = useState<Comune[]>([]);
  const [uffici, setUffici] = useState<Ufficio[]>([]);
  const [squadre, setSquadre] = useState<SquadraLavoro[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog modifica utente
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("cittadino");
  const [editRegioneId, setEditRegioneId] = useState("");
  const [editComuneId, setEditComuneId] = useState("");
  const [editUfficioId, setEditUfficioId] = useState("");
  const [editSquadraId, setEditSquadraId] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  // Dialog entità geografiche
  const [geoDialog, setGeoDialog] = useState<{ type: "regione" | "comune" | "ufficio" | "squadra" } | null>(null);
  const [geoNome, setGeoNome] = useState("");
  const [geoRegioneId, setGeoRegioneId] = useState("");
  const [geoComuneId, setGeoComuneId] = useState("");
  const [geoUfficioId, setGeoUfficioId] = useState("");
  const [savingGeo, setSavingGeo] = useState(false);

  // Dialog lookup (categorie/settori)
  const [catDialog, setCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [sectDialog, setSectDialog] = useState(false);
  const [newSectName, setNewSectName] = useState("");
  const [savingLookup, setSavingLookup] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (!isSuperAdmin) {
      toast.error("Accesso riservato al Super Admin.");
      navigate({ to: "/manager" as any });
      return;
    }
    fetchAll();
  }, [user, isSuperAdmin, authLoading]);

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: reps }, { data: profs }, { data: cats }, { data: sects },
      { data: regs }, { data: coms }, { data: uffs }, { data: sqs },
    ] = await Promise.all([
      supabase.from("reports").select(`*, categoria:categories(id,nome), settore:sectors(id,nome), foto:report_photos(id,file_url), profile:profiles(id,nome,cognome,telefono,codice_fiscale,ruolo)`).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*, regione:regioni(id,nome), comune:comuni(id,nome), ufficio:uffici(id,nome), squadra:squadre_lavoro(id,nome)").order("cognome"),
      supabase.from("categories").select("*").order("nome"),
      supabase.from("sectors").select("*").order("nome"),
      supabase.from("regioni").select("*").order("nome"),
      supabase.from("comuni").select("*, regione:regioni(id,nome)").order("nome"),
      supabase.from("uffici").select("*, comune:comuni(id,nome)").order("nome"),
      supabase.from("squadre_lavoro").select("*, ufficio:uffici(id,nome)").order("nome"),
    ]);
    if (reps) setReports(reps as Report[]);
    if (profs) setProfiles(profs as Profile[]);
    if (cats) setCategories(cats as Category[]);
    if (sects) setSectors(sects as Sector[]);
    if (regs) setRegioni(regs as Regione[]);
    if (coms) setComuni(coms as Comune[]);
    if (uffs) setUffici(uffs as Ufficio[]);
    if (sqs) setSquadre(sqs as SquadraLavoro[]);
    setLoading(false);
  };

  const openEditUser = (p: Profile) => {
    setEditUser(p);
    setEditRole(p.ruolo);
    setEditRegioneId(p.regione_id ?? "");
    setEditComuneId(p.comune_id ?? "");
    setEditUfficioId(p.ufficio_id ?? "");
    setEditSquadraId(p.squadra_id ?? "");
  };

  const saveUser = async () => {
    if (!editUser) return;
    setSavingUser(true);
    const { error } = await supabase.from("profiles").update({
      ruolo: editRole,
      regione_id: editRegioneId || null,
      comune_id: editComuneId || null,
      ufficio_id: editUfficioId || null,
      squadra_id: editSquadraId || null,
    }).eq("id", editUser.id);
    if (error) { toast.error("Errore nell'aggiornamento."); }
    else { toast.success("Utente aggiornato."); setEditUser(null); await fetchAll(); }
    setSavingUser(false);
  };

  const saveGeo = async () => {
    if (!geoDialog || !geoNome.trim()) return;
    setSavingGeo(true);
    let error: any = null;
    if (geoDialog.type === "regione") {
      ({ error } = await supabase.from("regioni").insert({ nome: geoNome.trim() }));
    } else if (geoDialog.type === "comune") {
      ({ error } = await supabase.from("comuni").insert({ nome: geoNome.trim(), regione_id: geoRegioneId }));
    } else if (geoDialog.type === "ufficio") {
      ({ error } = await supabase.from("uffici").insert({ nome: geoNome.trim(), comune_id: geoComuneId }));
    } else if (geoDialog.type === "squadra") {
      ({ error } = await supabase.from("squadre_lavoro").insert({ nome: geoNome.trim(), ufficio_id: geoUfficioId }));
    }
    if (error) { toast.error("Errore nella creazione."); }
    else { toast.success("Creato con successo."); setGeoDialog(null); setGeoNome(""); await fetchAll(); }
    setSavingGeo(false);
  };

  const deleteGeo = async (table: string, id: string) => {
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) toast.error("Impossibile eliminare (potrebbe essere in uso).");
    else { toast.success("Eliminato."); await fetchAll(); }
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingLookup(true);
    const { error } = await supabase.from("categories").insert({ nome: newCatName.trim() });
    if (error) toast.error("Errore nella creazione.");
    else { toast.success("Categoria creata."); setNewCatName(""); setCatDialog(false); await fetchAll(); }
    setSavingLookup(false);
  };

  const addSector = async () => {
    if (!newSectName.trim()) return;
    setSavingLookup(true);
    const { error } = await supabase.from("sectors").insert({ nome: newSectName.trim() });
    if (error) toast.error("Errore nella creazione.");
    else { toast.success("Settore creato."); setNewSectName(""); setSectDialog(false); await fetchAll(); }
    setSavingLookup(false);
  };

  // Ruoli che richiedono scope geografico
  const needsRegione = ["admin_regione"].includes(editRole);
  const needsComune = ["admin_comune", "admin_ufficio", "operatore_ufficio"].includes(editRole);
  const needsUfficio = ["admin_ufficio", "operatore_ufficio"].includes(editRole);
  const needsSquadra = editRole === "squadra_lavoro";

  const comuniFiltrati = editRegioneId
    ? comuni.filter((c) => c.regione_id === editRegioneId)
    : comuni;
  const ufficiFiltrati = editComuneId
    ? uffici.filter((u) => u.comune_id === editComuneId)
    : uffici;
  const squadreFiltrate = editUfficioId
    ? squadre.filter((s) => s.ufficio_id === editUfficioId)
    : squadre;

  const roleCounts = Object.fromEntries(
    (Object.keys(ROLE_LABELS) as UserRole[]).map((r) => [r, profiles.filter((p) => p.ruolo === r).length])
  ) as Record<UserRole, number>;

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
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">Super Admin</div>
          <h1 className="mt-2 font-display text-4xl font-extrabold md:text-5xl">Pannello di controllo</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Gestione completa: utenti, ruoli, gerarchia geografica, categorie e segnalazioni.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <Tabs defaultValue="utenti">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1">
            <TabsTrigger value="utenti" className="gap-2"><Users className="h-4 w-4" />Utenti ({profiles.length})</TabsTrigger>
            <TabsTrigger value="segnalazioni" className="gap-2"><ClipboardList className="h-4 w-4" />Segnalazioni ({reports.length})</TabsTrigger>
            <TabsTrigger value="geografia" className="gap-2"><MapPin className="h-4 w-4" />Gerarchia</TabsTrigger>
            <TabsTrigger value="ruoli" className="gap-2"><Shield className="h-4 w-4" />Ruoli</TabsTrigger>
            <TabsTrigger value="categorie">Categorie ({categories.length})</TabsTrigger>
            <TabsTrigger value="settori">Settori ({sectors.length})</TabsTrigger>
          </TabsList>

          {/* TAB UTENTI */}
          <TabsContent value="utenti" className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Utente</th>
                    <th className="px-4 py-3">Ruolo</th>
                    <th className="px-4 py-3">Scope geografico</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.nome} {p.cognome}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {p.codice_fiscale && <span className="flex items-center gap-1"><IdCard className="h-3 w-3" />{p.codice_fiscale}</span>}
                          {p.telefono && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.telefono}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[p.ruolo]}`}>
                          {ROLE_LABELS[p.ruolo]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.regione && <div>Regione: {(p.regione as any).nome}</div>}
                        {p.comune && <div>Comune: {(p.comune as any).nome}</div>}
                        {p.ufficio && <div>Ufficio: {(p.ufficio as any).nome}</div>}
                        {p.squadra && <div>Squadra: {(p.squadra as any).nome}</div>}
                        {!p.regione_id && !p.comune_id && !p.ufficio_id && !p.squadra_id && <span>—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditUser(p)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />Modifica
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB SEGNALAZIONI */}
          <TabsContent value="segnalazioni" className="mt-6 space-y-4">
            {reports.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">Nessuna segnalazione.</div>
            ) : reports.map((r) => {
              const prof = r.profile as Profile | null;
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-bold">{r.titolo}</span>
                        <Badge variant="secondary">{STATUS_LABELS[r.stato]}</Badge>
                        {r.categoria && <Badge variant="outline">{(r.categoria as any).nome}</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.via}, {r.citta} · {new Date(r.created_at).toLocaleDateString("it-IT")}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{r.descrizione}</p>
                    </div>
                    {r.foto && r.foto.length > 0 && (
                      <img src={r.foto[0].file_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    )}
                  </div>
                  {prof && (
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs">
                      <span className="font-semibold">Segnalatore: {prof.nome} {prof.cognome}</span>
                      {prof.codice_fiscale && <span className="flex items-center gap-1 text-muted-foreground"><IdCard className="h-3 w-3" />{prof.codice_fiscale}</span>}
                      {prof.telefono && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{prof.telefono}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* TAB GERARCHIA GEOGRAFICA */}
          <TabsContent value="geografia" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Regioni */}
              <GeoSection
                title="Regioni" icon={MapPin}
                items={regioni.map((r) => ({ id: r.id, label: r.nome }))}
                onAdd={() => { setGeoDialog({ type: "regione" }); setGeoNome(""); }}
                onDelete={(id) => deleteGeo("regioni", id)}
              />
              {/* Comuni */}
              <GeoSection
                title="Comuni" icon={Building2}
                items={comuni.map((c) => ({ id: c.id, label: `${c.nome}${c.regione ? ` — ${(c.regione as any).nome}` : ""}` }))}
                onAdd={() => { setGeoDialog({ type: "comune" }); setGeoNome(""); setGeoRegioneId(""); }}
                onDelete={(id) => deleteGeo("comuni", id)}
              />
              {/* Uffici */}
              <GeoSection
                title="Uffici" icon={Wrench}
                items={uffici.map((u) => ({ id: u.id, label: `${u.nome}${u.comune ? ` — ${(u.comune as any).nome}` : ""}` }))}
                onAdd={() => { setGeoDialog({ type: "ufficio" }); setGeoNome(""); setGeoComuneId(""); }}
                onDelete={(id) => deleteGeo("uffici", id)}
              />
              {/* Squadre */}
              <GeoSection
                title="Squadre di lavoro" icon={Users}
                items={squadre.map((s) => ({ id: s.id, label: `${s.nome}${s.ufficio ? ` — ${(s.ufficio as any).nome}` : ""}` }))}
                onAdd={() => { setGeoDialog({ type: "squadra" }); setGeoNome(""); setGeoUfficioId(""); }}
                onDelete={(id) => deleteGeo("squadre_lavoro", id)}
              />
            </div>
          </TabsContent>

          {/* TAB RUOLI */}
          <TabsContent value="ruoli" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <div key={r} className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_STYLES[r]}`}>{ROLE_LABELS[r]}</span>
                    <span className="font-display text-2xl font-extrabold">{roleCounts[r] ?? 0}</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB CATEGORIE */}
          <TabsContent value="categorie" className="mt-6">
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => setCatDialog(true)}><Plus className="mr-2 h-4 w-4" />Nuova categoria</Button>
            </div>
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <span className="font-medium">{c.nome}</span>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => supabase.from("categories").delete().eq("id", c.id).then(() => fetchAll())}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB SETTORI */}
          <TabsContent value="settori" className="mt-6">
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => setSectDialog(true)}><Plus className="mr-2 h-4 w-4" />Nuovo settore</Button>
            </div>
            <div className="space-y-2">
              {sectors.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <span className="font-medium">{s.nome}</span>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => supabase.from("sectors").delete().eq("id", s.id).then(() => fetchAll())}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <SiteFooter />

      {/* Dialog modifica utente */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifica utente — {editUser?.nome} {editUser?.cognome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ruolo</label>
              <Select value={editRole} onValueChange={(v) => { setEditRole(v as UserRole); setEditRegioneId(""); setEditComuneId(""); setEditUfficioId(""); setEditSquadraId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[editRole]}</p>
            </div>

            {(needsRegione || needsComune || needsUfficio || needsSquadra) && (
              <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><ChevronRight className="h-3.5 w-3.5" />Scope geografico</p>

                {(needsRegione || needsComune || needsUfficio || needsSquadra) && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Regione</label>
                    <Select value={editRegioneId} onValueChange={(v) => { setEditRegioneId(v); setEditComuneId(""); setEditUfficioId(""); setEditSquadraId(""); }}>
                      <SelectTrigger><SelectValue placeholder="Seleziona regione" /></SelectTrigger>
                      <SelectContent>{regioni.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {(needsComune || needsUfficio || needsSquadra) && editRegioneId && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Comune</label>
                    <Select value={editComuneId} onValueChange={(v) => { setEditComuneId(v); setEditUfficioId(""); setEditSquadraId(""); }}>
                      <SelectTrigger><SelectValue placeholder="Seleziona comune" /></SelectTrigger>
                      <SelectContent>{comuniFiltrati.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {(needsUfficio || needsSquadra) && editComuneId && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Ufficio</label>
                    <Select value={editUfficioId} onValueChange={(v) => { setEditUfficioId(v); setEditSquadraId(""); }}>
                      <SelectTrigger><SelectValue placeholder="Seleziona ufficio" /></SelectTrigger>
                      <SelectContent>{ufficiFiltrati.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {needsSquadra && editUfficioId && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Squadra</label>
                    <Select value={editSquadraId} onValueChange={setEditSquadraId}>
                      <SelectTrigger><SelectValue placeholder="Seleziona squadra" /></SelectTrigger>
                      <SelectContent>{squadreFiltrate.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annulla</Button>
            <Button onClick={saveUser} disabled={savingUser}>
              {savingUser ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog entità geografica */}
      <Dialog open={!!geoDialog} onOpenChange={() => setGeoDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {geoDialog?.type === "regione" && "Nuova Regione"}
              {geoDialog?.type === "comune" && "Nuovo Comune"}
              {geoDialog?.type === "ufficio" && "Nuovo Ufficio"}
              {geoDialog?.type === "squadra" && "Nuova Squadra di lavoro"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {geoDialog?.type === "comune" && (
              <Select value={geoRegioneId} onValueChange={setGeoRegioneId}>
                <SelectTrigger><SelectValue placeholder="Seleziona regione" /></SelectTrigger>
                <SelectContent>{regioni.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {geoDialog?.type === "ufficio" && (
              <Select value={geoComuneId} onValueChange={setGeoComuneId}>
                <SelectTrigger><SelectValue placeholder="Seleziona comune" /></SelectTrigger>
                <SelectContent>{comuni.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {geoDialog?.type === "squadra" && (
              <Select value={geoUfficioId} onValueChange={setGeoUfficioId}>
                <SelectTrigger><SelectValue placeholder="Seleziona ufficio" /></SelectTrigger>
                <SelectContent>{uffici.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Input placeholder="Nome" value={geoNome} onChange={(e) => setGeoNome(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGeoDialog(null)}>Annulla</Button>
            <Button onClick={saveGeo} disabled={savingGeo || !geoNome.trim()}>
              {savingGeo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog categoria */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuova categoria</DialogTitle></DialogHeader>
          <Input placeholder="Nome categoria" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Annulla</Button>
            <Button onClick={addCategory} disabled={savingLookup || !newCatName.trim()}>
              {savingLookup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog settore */}
      <Dialog open={sectDialog} onOpenChange={setSectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo settore</DialogTitle></DialogHeader>
          <Input placeholder="Nome settore / ufficio" value={newSectName} onChange={(e) => setNewSectName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectDialog(false)}>Annulla</Button>
            <Button onClick={addSector} disabled={savingLookup || !newSectName.trim()}>
              {savingLookup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GeoSection({
  title, icon: Icon, items, onAdd, onDelete,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { id: string; label: string }[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-display font-bold">
          <Icon className="h-4 w-4 text-primary" />{title}
          <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd}><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="max-h-48 space-y-1.5 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessun elemento.</p>
        ) : items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <span>{item.label}</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
