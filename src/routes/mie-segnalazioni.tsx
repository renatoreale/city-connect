/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Report, ReportStatus } from "@/lib/database.types";

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
    } else {
      setReports((data as Report[]) ?? []);
    }
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
              <ReportRow key={report.id} report={report} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

function ReportRow({ report }: { report: Report }) {
  const cfg = STATUS_CONFIG[report.stato];
  const primaFoto = report.foto?.[0]?.file_url;

  return (
    <div
      className="flex gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/30"
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
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>
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
