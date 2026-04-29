import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, MapPin, ShieldCheck, Users, Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import heroCity from "@/assets/hero-city.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicVoice — Segnalazioni urbane per cittadini e Comune" },
      {
        name: "description",
        content:
          "Piattaforma civica per segnalare disservizi urbani con foto, posizione e descrizione. Cittadini, manager e amministratori in un unico flusso.",
      },
      { property: "og:title", content: "CivicVoice — Segnalazioni urbane" },
      {
        property: "og:description",
        content:
          "Segnala disservizi urbani: marciapiedi rotti, sosta selvaggia, illuminazione, rifiuti e molto altro.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "var(--gradient-hero)" }}
        />
        <img
          src={heroCity}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25 mix-blend-overlay"
          width={1600}
          height={900}
        />
        <div className="mx-auto max-w-6xl px-4 py-24 md:py-32">
          <div className="max-w-3xl text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-xs font-medium uppercase tracking-wider backdrop-blur">
              <MapPin className="h-3.5 w-3.5" /> Piattaforma civica
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
              La tua città,
              <br />
              <span style={{ color: "var(--primary-glow)" }}>
                la tua voce.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-primary-foreground/85">
              Segnala disservizi urbani con foto, posizione e descrizione.
              Cittadini e operatori del Comune, insieme, per una città più
              vivibile.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/nuova">
                  Crea segnalazione <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <Link to="/feed">Vedi le segnalazioni</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Come funziona
          </div>
          <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Tre profili, un'unica piattaforma trasparente.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Cittadino",
              text: "Crea il tuo profilo con dati anagrafici e foto. Invia segnalazioni con prove fotografiche e descrizione dettagliata.",
            },
            {
              icon: Building2,
              title: "Manager",
              text: "Vede tutte le segnalazioni in forma anonima. Le categorizza e le assegna all'ufficio competente.",
            },
            {
              icon: ShieldCheck,
              title: "Amministratore",
              text: "Accesso completo, inclusi i dati del segnalatore. Gestione utenti, ruoli e supervisione totale.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STEPS */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display text-4xl font-bold md:text-5xl">
                Segnala in 3 passi.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Pensata per essere chiara e veloce, anche da smartphone.
              </p>
            </div>
            <ol className="space-y-4">
              {[
                {
                  icon: Camera,
                  t: "Scatta una foto",
                  d: "Documenta il disservizio direttamente dal tuo dispositivo.",
                },
                {
                  icon: FileText,
                  t: "Descrivi e localizza",
                  d: "Aggiungi via, civico, città e una breve descrizione.",
                },
                {
                  icon: ShieldCheck,
                  t: "Invia in sicurezza",
                  d: "Le tue informazioni personali restano riservate.",
                },
              ].map((s, i) => (
                <li
                  key={s.t}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      {i + 1}. {s.t}
                    </div>
                    <div className="text-sm text-muted-foreground">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div
          className="overflow-hidden rounded-3xl px-8 py-14 text-center text-primary-foreground md:px-16"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "var(--shadow-elegant)",
          }}
        >
          <h2 className="font-display text-3xl font-extrabold md:text-5xl">
            Pronto a migliorare la tua città?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
            Registrati e invia la tua prima segnalazione. Bastano pochi secondi.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/registrazione">Crea il tuo profilo</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link to="/feed">Esplora le segnalazioni</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
