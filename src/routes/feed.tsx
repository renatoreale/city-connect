import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Report, ReportStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Segnalazioni — CivicVoice" },
      {
        name: "description",
        content:
          "Esplora tutte le segnalazioni urbane in forma anonima: stato, categoria e ufficio competente.",
      },
    ],
  }),
  component: FeedPage,
});

const STATUS_OPTIONS: { value: ReportStatus | "tutte"; label: string }[] = [
  { value: "tutte", label: "Tutte" },
  { value: "nuova", label: "Nuova" },
  { value: "in_valutazione", label: "In valutazione" },
  { value: "in_lavorazione", label: "In lavorazione" },
  { value: "risolta", label: "Risolta" },
  { value: "respinta", label: "Respinta" },
];

const STATUS_COLOR: Record<ReportStatus, string> = {
  nuova: "bg-warning/15 text-warning-foreground",
  in_valutazione: "bg-primary/10 text-primary",
  assegnata: "bg-blue-100 text-blue-700",
  in_lavorazione: "bg-primary/20 text-primary",
  risolta: "bg-success/15 text-success",
  respinta: "bg-destructive/10 text-destructive",
  archiviata: "bg-secondary text-secondary-foreground",
};

function FeedPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ReportStatus | "tutte">("tutte");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select(`
        id, titolo, descrizione, via, numero_civico, citta, provincia, stato, priorita, created_at,
        categoria:categories(id, nome),
        settore:sectors(id, nome),
        foto:report_photos(id, file_url)
      `)
      .order("created_at", { ascending: false })
      .limit(100);
    setReports((data as unknown as Report[]) ?? []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (status !== "tutte" && r.stato !== status) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        r.titolo.toLowerCase().includes(q) ||
        r.descrizione.toLowerCase().includes(q) ||
        r.via.toLowerCase().includes(q) ||
        r.citta.toLowerCase().includes(q)
      );
    });
  }, [query, status, reports]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Feed pubblico
          </div>
          <h1 className="mt-2 font-display text-4xl font-extrabold md:text-5xl">
            Segnalazioni dalla città
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Ogni segnalazione è visibile in forma anonima. Solo gli
            amministratori autorizzati possono vedere chi l'ha inviata.
          </p>

          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca per titolo, via, città..."
                className="h-11 bg-card pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    status === s.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {loading ? "Caricamento..." : `${filtered.length} segnalazion${filtered.length === 1 ? "e" : "i"}`}
          </div>
          <Button asChild>
            <Link to="/nuova">Nuova segnalazione</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => <PublicReportCard key={r.id} report={r} />)}
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                Nessuna segnalazione trovata.
              </div>
            )}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

function PublicReportCard({ report }: { report: Report }) {
  const cfg = STATUS_COLOR[report.stato];
  const primaFoto = report.foto?.[0]?.file_url;
  const catNome = report.categoria ? (report.categoria as { nome: string }).nome : null;
  const settNome = report.settore ? (report.settore as { nome: string }).nome : null;

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
            className="h-24 w-24 rounded-xl object-cover"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-display font-bold leading-snug">{report.titolo}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {report.via}{report.numero_civico ? `, ${report.numero_civico}` : ""} — {report.citta}
              {report.provincia ? ` (${report.provincia})` : ""} ·{" "}
              {new Date(report.created_at).toLocaleDateString("it-IT")}
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg}`}>
            {STATUS_OPTIONS.find((s) => s.value === report.stato)?.label ?? report.stato}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{report.descrizione}</p>
        <div className="flex flex-wrap gap-2">
          {catNome && <Badge variant="secondary" className="text-xs">{catNome}</Badge>}
          {settNome && <Badge variant="outline" className="text-xs">{settNome}</Badge>}
        </div>
      </div>
    </div>
  );
}
