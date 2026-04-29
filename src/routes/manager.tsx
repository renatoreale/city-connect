import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Report, Category, Sector, ReportStatus } from "@/lib/database.types";

export const Route = createFileRoute("/manager")({
  head: () => ({
    meta: [
      { title: "Area Manager — CivicVoice" },
      {
        name: "description",
        content: "Dashboard manager: categorizzazione e assegnazione delle segnalazioni.",
      },
    ],
  }),
  component: ManagerPage,
});

const STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: "nuova", label: "Nuova" },
  { value: "in_valutazione", label: "In valutazione" },
  { value: "assegnata", label: "Assegnata" },
  { value: "in_lavorazione", label: "In lavorazione" },
  { value: "terminata", label: "Terminata" },
  { value: "risolta", label: "Risolta" },
  { value: "respinta", label: "Respinta" },
  { value: "archiviata", label: "Archiviata" },
];

const STATUS_OPTIONS_SQUADRA: { value: ReportStatus; label: string }[] = [
  { value: "in_lavorazione", label: "In lavorazione" },
  { value: "terminata", label: "Terminata" },
];

const STATUS_COLOR: Record<ReportStatus, string> = {
  nuova: "bg-warning/15 text-warning-foreground",
  in_valutazione: "bg-primary/10 text-primary",
  assegnata: "bg-blue-100 text-blue-700",
  in_lavorazione: "bg-primary/20 text-primary",
  terminata: "bg-teal-100 text-teal-700",
  risolta: "bg-success/15 text-success",
  respinta: "bg-destructive/10 text-destructive",
  archiviata: "bg-secondary text-secondary-foreground",
};

function ManagerPage() {
  const { user, isStaff, isSquadra, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("tutte");
  const [filterCat, setFilterCat] = useState<string>("tutte");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [edits, setEdits] = useState<
    Record<string, { categoriaId?: string; settoreId?: string; stato?: ReportStatus; nota?: string }>
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!isStaff) { navigate({ to: "/mie-segnalazioni" as any }); return; }
    fetchData();
  }, [user, isStaff, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: reps }, { data: cats }, { data: sects }] = await Promise.all([
      supabase
        .from("reports")
        .select(`*, categoria:categories(id, nome), settore:sectors(id, nome), foto:report_photos(id, file_url)`)
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("nome"),
      supabase.from("sectors").select("*").order("nome"),
    ]);
    if (reps) setReports(reps as Report[]);
    if (cats) setCategories(cats as Category[]);
    if (sects) setSectors(sects as Sector[]);
    setLoading(false);
  };

  const patchEdit = (id: string, patch: Partial<(typeof edits)[string]>) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const saveReport = async (report: Report) => {
    const e = edits[report.id] ?? {};
    setSaving((prev) => ({ ...prev, [report.id]: true }));
    try {
      if (e.stato && e.stato !== report.stato) {
        const { error } = await supabase.rpc("update_report_status", {
          p_report_id: report.id,
          p_new_status: e.stato,
          p_note: e.nota ?? null,
        });
        if (error) throw error;
      }
      const patch: Record<string, unknown> = {};
      if (e.categoriaId !== undefined) patch.categoria_id = e.categoriaId || null;
      if (e.settoreId !== undefined) patch.settore_id = e.settoreId || null;
      if (e.nota !== undefined) patch.note_manager = e.nota || null;
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("reports").update(patch).eq("id", report.id);
        if (error) throw error;
      }
      toast.success("Segnalazione aggiornata.");
      await fetchData();
      setEdits((prev) => { const next = { ...prev }; delete next[report.id]; return next; });
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Errore nel salvataggio.");
    } finally {
      setSaving((prev) => ({ ...prev, [report.id]: false }));
    }
  };

  const filtered = useMemo(() => reports.filter((r) => {
    if (filterStatus !== "tutte" && r.stato !== filterStatus) return false;
    if (filterCat === "non_categorizzate") return !r.categoria_id;
    if (filterCat !== "tutte" && r.categoria_id !== filterCat) return false;
    return true;
  }), [reports, filterStatus, filterCat]);

  const stats = useMemo(() => ({
    totale: reports.length,
    nuove: reports.filter((r) => r.stato === "nuova").length,
    lavorazione: reports.filter((r) => ["in_valutazione", "assegnata", "in_lavorazione"].includes(r.stato)).length,
    risolte: reports.filter((r) => r.stato === "risolta").length,
  }), [reports]);

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

      {/* Hero */}
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {isSquadra ? "Area Squadra" : "Area Operativa"}
          </div>
          <h1 className="mt-2 font-display text-4xl font-extrabold md:text-5xl">
            {isSquadra ? "Lavori assegnati" : "Gestione segnalazioni"}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {isSquadra
              ? "Visualizza i lavori assegnati alla tua squadra e aggiorna lo stato di avanzamento."
              : "Seleziona una segnalazione per categorizzarla e assegnarla all'ufficio competente."}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <StatCard icon={ClipboardList} label="Totale" value={stats.totale} />
            <StatCard icon={Inbox} label="Nuove" value={stats.nuove} tone="warning" />
            <StatCard icon={AlertTriangle} label="In lavorazione" value={stats.lavorazione} tone="primary" />
            <StatCard icon={CheckCircle2} label="Risolte" value={stats.risolte} tone="success" />
          </div>
        </div>
      </section>

      {/* Tabella segnalazioni */}
      <section className="mx-auto max-w-6xl px-4 py-10">

        {/* Filtri */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Stato:</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutte">Tutti</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Categoria:</span>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tutte">Tutte</SelectItem>
                <SelectItem value="non_categorizzate">Da categorizzare</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">{filtered.length} risultati</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
            <ClipboardList className="h-10 w-10 opacity-40" />
            <div className="font-medium">Nessuna segnalazione trovata</div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>

            {/* Header colonne */}
            <div className="hidden md:grid md:grid-cols-[130px_1fr_140px_110px_34px] items-center gap-4 border-b border-border bg-secondary/40 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Stato</span>
              <span>Segnalazione</span>
              <span>Categoria</span>
              <span>Data</span>
              <span />
            </div>

            {filtered.map((report, idx) => {
              const e = edits[report.id] ?? {};
              const isExpanded = expandedId === report.id;
              const currentCat   = e.categoriaId !== undefined ? e.categoriaId : (report.categoria_id ?? "");
              const currentSect  = e.settoreId   !== undefined ? e.settoreId   : (report.settore_id ?? "");
              const currentStato = e.stato ?? report.stato;
              const isSaving     = saving[report.id] ?? false;
              const catNome      = report.categoria ? (report.categoria as { nome: string }).nome : null;

              return (
                <div key={report.id} className={idx > 0 ? "border-t border-border" : ""}>

                  {/* ── Riga tabellare ── */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    className="w-full text-left transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  >
                    {/* Desktop: grid a colonne */}
                    <div className="hidden md:grid md:grid-cols-[130px_1fr_140px_110px_34px] items-center gap-4 px-5 py-3.5">
                      {/* Stato */}
                      <span className={`inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[report.stato]}`}>
                        {STATUS_OPTIONS.find(s => s.value === report.stato)?.label}
                      </span>

                      {/* Titolo + indirizzo */}
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-sm">{report.titolo}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {report.via}{report.numero_civico ? `, ${report.numero_civico}` : ""} — {report.citta}{report.provincia ? ` (${report.provincia})` : ""}
                        </div>
                      </div>

                      {/* Categoria */}
                      <span className="truncate text-xs text-muted-foreground">{catNome ?? <span className="italic opacity-50">—</span>}</span>

                      {/* Data */}
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString("it-IT")}
                      </span>

                      {/* Chevron */}
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>

                    {/* Mobile: layout compatto */}
                    <div className="flex items-start justify-between gap-3 px-4 py-3.5 md:hidden">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[report.stato]}`}>
                            {STATUS_OPTIONS.find(s => s.value === report.stato)?.label}
                          </span>
                          <span className="font-semibold text-sm truncate">{report.titolo}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground truncate">
                          {report.via}{report.numero_civico ? `, ${report.numero_civico}` : ""} — {report.citta} · {new Date(report.created_at).toLocaleDateString("it-IT")}
                        </div>
                      </div>
                      <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {/* ── Pannello triage (accordion) ── */}
                  {isExpanded && (
                    <div className="border-t border-dashed border-border bg-secondary/20 px-5 py-5">

                      {/* Descrizione + foto */}
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
                        <p className="flex-1 text-sm text-muted-foreground leading-relaxed">{report.descrizione}</p>
                        {report.foto && report.foto.length > 0 && (
                          <div className="flex shrink-0 gap-2">
                            {(report.foto as { id: string; file_url: string }[]).slice(0, 4).map((f) => (
                              <img key={f.id} src={f.file_url} alt="" className="h-20 w-20 rounded-xl object-cover" />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Controlli triage */}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</label>
                          <Select value={currentCat} onValueChange={(v) => patchEdit(report.id, { categoriaId: v })} disabled={isSaving}>
                            <SelectTrigger className="mt-1 bg-card"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ufficio competente</label>
                          <Select value={currentSect} onValueChange={(v) => patchEdit(report.id, { settoreId: v })} disabled={isSaving}>
                            <SelectTrigger className="mt-1 bg-card"><SelectValue placeholder="Assegna" /></SelectTrigger>
                            <SelectContent>
                              {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stato</label>
                          <Select value={currentStato} onValueChange={(v) => patchEdit(report.id, { stato: v as ReportStatus })} disabled={isSaving}>
                            <SelectTrigger className="mt-1 bg-card"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(isSquadra ? STATUS_OPTIONS_SQUADRA : STATUS_OPTIONS).map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nota interna</label>
                          <Textarea
                            className="mt-1 bg-card"
                            rows={2}
                            placeholder="Nota visibile solo a manager e admin..."
                            value={e.nota ?? report.note_manager ?? ""}
                            onChange={(ev) => patchEdit(report.id, { nota: ev.target.value })}
                            disabled={isSaving}
                          />
                        </div>

                        <div className="sm:col-span-3 flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => saveReport(report)} disabled={isSaving}>
                            {isSaving
                              ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Salvataggio...</>
                              : "Salva modifiche"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const toneClass = {
    default: "bg-card text-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning-foreground",
  }[tone];

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-display text-2xl font-extrabold leading-none">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
