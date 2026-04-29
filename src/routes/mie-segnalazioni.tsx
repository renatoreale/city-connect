/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Report, ReportStatus, ReportPhoto } from "@/lib/database.types";

export const Route = createFileRoute("/mie-segnalazioni")({
  head: () => ({
    meta: [
      { title: "Le mie segnalazioni — CivicVoice" },
      { name: "description", content: "Visualizza e gestisci le tue segnalazioni urbane." },
    ],
  }),
  component: MieSegnalazioniPage,
});

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string }> = {
  nuova: { label: "Nuova", color: "bg-warning/15 text-warning-foreground" },
  in_valutazione: { label: "In valutazione", color: "bg-primary/10 text-primary" },
  assegnata: { label: "Assegnata", color: "bg-blue-100 text-blue-700" },
  in_lavorazione: { label: "In lavorazione", color: "bg-primary/20 text-primary" },
  risolta: { label: "Risolta", color: "bg-success/15 text-success" },
  respinta: { label: "Respinta", color: "bg-destructive/10 text-destructive" },
  archiviata: { label: "Archiviata", color: "bg-secondary text-secondary-foreground" },
};

function MieSegnalazioniPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" as any });
      return;
    }
    fetchMyReports();
  }, [user, authLoading]);

  const fetchMyReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select(`
        *,
        categoria:categories(id, nome),
        settore:sectors(id, nome),
        foto:report_photos(id, file_url, file_path, created_at)
      `)
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Errore nel caricamento delle segnalazioni.");
      setLoading(false);
      return;
    }

    // Genera signed URL per ogni foto (bucket privato)
    const reportsWithSignedUrls = await Promise.all(
      ((data as Report[]) ?? []).map(async (report) => {
        if (!report.foto?.length) return report;
        const signedFoto = await Promise.all(
          report.foto.map(async (f: ReportPhoto) => {
            const { data: signed } = await supabase.storage
              .from("report-photos")
              .createSignedUrl(f.file_path, 3600);
            return { ...f, file_url: signed?.signedUrl ?? f.file_url };
          })
        );
        return { ...report, foto: signedFoto };
      })
    );

    setReports(reportsWithSignedUrls);
    setLoading(false);
  };

  const stats = {
    totale: reports.length,
    nuove: reports.filter((r) => r.stato === "nuova").length,
    in_corso: reports.filter((r) =>
      ["in_valutazione", "assegnata", "in_lavorazione"].includes(r.stato)
    ).length,
    risolte: reports.filter((r) => r.stato === "risolta").length,
  };

  if (authLoading) {
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
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Area cittadino
              </div>
              <h1 className="mt-2 font-display text-4xl font-extrabold">
                Le mie segnalazioni
              </h1>
              {profile && (
                <p className="mt-2 text-muted-foreground">
                  Ciao, {profile.nome} {profile.cognome}
                </p>
              )}
            </div>
            <Button asChild size="lg">
              <Link to="/nuova">
                <Plus className="mr-2 h-4 w-4" />
                Nuova segnalazione
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <StatCard icon={ClipboardList} label="Totale" value={stats.totale} />
            <StatCard icon={AlertTriangle} label="Nuove" value={stats.nuove} tone="warning" />
            <StatCard icon={Clock} label="In corso" value={stats.in_corso} tone="primary" />
            <StatCard icon={CheckCircle2} label="Risolte" value={stats.risolte} tone="success" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <div className="font-display text-lg font-bold">Nessuna segnalazione</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Hai ancora inviato segnalazioni. Inizia ora!
              </div>
            </div>
            <Button asChild>
              <Link to="/nuova">
                <Plus className="mr-2 h-4 w-4" />
                Crea la prima segnalazione
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <ReportRow key={report.id} report={report} onClick={() => setSelected(report)} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />

      {/* Dialog dettaglio segnalazione */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selected.titolo}</DialogTitle>
              </DialogHeader>

              {/* Foto */}
              {selected.foto && selected.foto.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {selected.foto.map((f) => (
                    <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={f.file_url}
                        alt=""
                        className="aspect-square w-full rounded-xl object-cover hover:opacity-90"
                      />
                    </a>
                  ))}
                </div>
              )}

              {/* Stato e priorità */}
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CONFIG[selected.stato].color}`}>
                  {STATUS_CONFIG[selected.stato].label}
                </span>
                <Badge variant="outline" className="text-xs capitalize">{selected.priorita}</Badge>
                {selected.categoria && (
                  <Badge variant="secondary" className="text-xs">
                    {(selected.categoria as { nome: string }).nome}
                  </Badge>
                )}
              </div>

              {/* Descrizione */}
              <p className="text-sm text-muted-foreground">{selected.descrizione}</p>

              {/* Indirizzo */}
              <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div>{selected.via}{selected.numero_civico ? `, ${selected.numero_civico}` : ""}</div>
                  <div className="text-muted-foreground">
                    {[selected.cap, selected.citta, selected.provincia].filter(Boolean).join(" ")}
                  </div>
                  {selected.riferimenti_aggiuntivi && (
                    <div className="mt-1 text-muted-foreground">{selected.riferimenti_aggiuntivi}</div>
                  )}
                </div>
              </div>

              {/* Data */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Inviata il {new Date(selected.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
              </div>

              {/* Motivo respinta */}
              {selected.motivo_respinta && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <strong>Motivo respinta:</strong> {selected.motivo_respinta}
                </div>
              )}

              {/* Note manager */}
              {selected.note_manager && (
                <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                  <strong className="text-xs uppercase tracking-wide text-muted-foreground">Note</strong>
                  <p className="mt-1">{selected.note_manager}</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportRow({ report, onClick }: { report: Report; onClick: () => void }) {
  const cfg = STATUS_CONFIG[report.stato];
  const primaFoto = report.foto?.[0]?.file_url;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-md"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {primaFoto && (
        <div className="hidden shrink-0 sm:block">
          <img
            src={primaFoto}
            alt=""
            className="h-20 w-20 rounded-xl object-cover"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-display font-bold leading-snug">{report.titolo}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {report.via}, {report.citta} — {new Date(report.created_at).toLocaleDateString("it-IT")}
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {report.descrizione}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {report.categoria && (
            <Badge variant="secondary" className="text-xs">
              {(report.categoria as { nome: string }).nome}
            </Badge>
          )}
          {report.settore && (
            <Badge variant="outline" className="text-xs">
              {(report.settore as { nome: string }).nome}
            </Badge>
          )}
          {report.motivo_respinta && (
            <span className="text-xs text-destructive">
              Motivo respinta: {report.motivo_respinta}
            </span>
          )}
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </button>
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
    <div
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
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
