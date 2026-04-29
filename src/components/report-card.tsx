import { Calendar, MapPin, Tag, Building2, ShieldAlert, User2 } from "lucide-react";
import {
  STATUS_LABEL,
  type Report,
  type UserRole,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<Report["status"], string> = {
  nuova: "bg-warning/15 text-warning-foreground border-warning/30",
  in_lavorazione: "bg-primary/10 text-primary border-primary/20",
  risolta: "bg-success/15 text-success border-success/30",
  respinta: "bg-destructive/10 text-destructive border-destructive/30",
};

interface Props {
  report: Report;
  viewerRole: UserRole;
}

export function ReportCard({ report, viewerRole }: Props) {
  const showReporter = viewerRole === "admin";
  const date = new Date(report.createdAt).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <article
      className="group overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-0.5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="grid md:grid-cols-[280px_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted md:aspect-auto">
          <img
            src={report.fotoUrl}
            alt={report.titolo}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {report.fotoUrls && report.fotoUrls.length > 1 && (
            <div className="absolute left-3 top-3">
              <span className="rounded-full border border-background/40 bg-background/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
                +{report.fotoUrls.length - 1} foto
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {report.id}
              </div>
              <h3 className="mt-1 font-display text-xl font-bold leading-tight">
                {report.titolo}
              </h3>
            </div>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                STATUS_STYLES[report.status]
              )}
            >
              {STATUS_LABEL[report.status]}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {report.descrizione}
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {report.via}, {report.civico} — {report.cap} {report.citta}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {date}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {report.category ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                <Tag className="h-3 w-3" />
                {report.category}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                <Tag className="h-3 w-3" />
                Da categorizzare
              </span>
            )}
            {report.office && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Building2 className="h-3 w-3" />
                {report.office}
              </span>
            )}

            <div className="ml-auto inline-flex items-center gap-2 text-xs">
              {showReporter ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 font-medium text-destructive">
                  <ShieldAlert className="h-3 w-3" />
                  {report.reporter.nome} {report.reporter.cognome} ·{" "}
                  {report.reporter.codiceFiscale}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
                  <User2 className="h-3 w-3" />
                  Segnalatore anonimo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
