export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="font-display text-xl font-extrabold">CivicVoice</div>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            La piattaforma civica per segnalare disservizi urbani in modo
            semplice, trasparente e tracciabile.
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-semibold">Piattaforma</div>
          <ul className="space-y-2 text-muted-foreground">
            <li>Segnalazioni</li>
            <li>Categorie</li>
            <li>Stato lavorazione</li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-semibold">Privacy</div>
          <p className="text-muted-foreground">
            I dati personali del segnalatore sono visibili esclusivamente agli
            amministratori autorizzati. I manager vedono le segnalazioni in
            forma anonima.
          </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CivicVoice — Template demo
      </div>
    </footer>
  );
}
