export type ReportStatus = "nuova" | "in_lavorazione" | "risolta" | "respinta";
// Le segnalazioni provengono sempre dal cittadino.
// Il Comune pubblica invece "comunicazioni" (eventi/lavori effettuati) tramite un canale separato.
export type ReportSource = "cittadino";
export type UserRole = "cittadino" | "manager" | "admin";

export type Category =
  | "Strade e marciapiedi"
  | "Illuminazione pubblica"
  | "Rifiuti e decoro urbano"
  | "Verde pubblico"
  | "Viabilità e sosta"
  | "Edilizia"
  | "Sicurezza"
  | "Altro";

export const CATEGORIES: Category[] = [
  "Strade e marciapiedi",
  "Illuminazione pubblica",
  "Rifiuti e decoro urbano",
  "Verde pubblico",
  "Viabilità e sosta",
  "Edilizia",
  "Sicurezza",
  "Altro",
];

export const OFFICES = [
  "Ufficio Lavori Pubblici",
  "Polizia Locale",
  "Ufficio Ambiente",
  "Ufficio Tecnico",
  "Ufficio Verde Pubblico",
  "Protezione Civile",
];

export interface Reporter {
  id: string;
  nome: string;
  cognome: string;
  telefono: string;
  codiceFiscale: string;
  avatarUrl?: string;
}

export interface Report {
  id: string;
  titolo: string;
  descrizione: string;
  via: string;
  civico: string;
  citta: string;
  cap: string;
  /** Foto principale (compatibilità). Usare preferibilmente fotoUrls. */
  fotoUrl: string;
  /** Galleria di una o più foto del disservizio. Se assente si usa fotoUrl. */
  fotoUrls?: string[];
  source: ReportSource;
  status: ReportStatus;
  category?: Category;
  office?: string;
  createdAt: string;
  reporter: Reporter;
}

/** Comunicazione pubblicata dal Comune (eventi o lavori effettuati). */
export interface MunicipalPost {
  id: string;
  titolo: string;
  descrizione: string;
  tipo: "evento" | "lavori_effettuati" | "avviso";
  fotoUrl: string;
  citta: string;
  zona?: string;
  office: string;
  publishedAt: string;
}

export const MOCK_REPORTS: Report[] = [
  {
    id: "RPT-0001",
    titolo: "Marciapiede dissestato vicino alla scuola",
    descrizione:
      "Il marciapiede presenta diverse mattonelle rotte e sconnessioni che rendono il passaggio pericoloso, soprattutto per anziani e passeggini.",
    via: "Via Garibaldi",
    civico: "42",
    citta: "Milano",
    cap: "20121",
    fotoUrl:
      "https://images.unsplash.com/photo-1597100437884-7e3b6d6ce96d?w=1200&q=80",
    source: "cittadino",
    status: "nuova",
    createdAt: "2026-04-26T09:12:00Z",
    reporter: {
      id: "u-001",
      nome: "Marco",
      cognome: "Rossi",
      telefono: "+39 333 1234567",
      codiceFiscale: "RSSMRC85A01F205X",
    },
  },
  {
    id: "RPT-0002",
    titolo: "Auto in doppia fila davanti al passo carrabile",
    descrizione:
      "Vettura parcheggiata da oltre due ore davanti al passo carrabile, impedendo l'uscita dal cortile condominiale.",
    via: "Corso Vittorio Emanuele",
    civico: "118",
    citta: "Torino",
    cap: "10121",
    fotoUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=80",
    source: "cittadino",
    status: "in_lavorazione",
    category: "Viabilità e sosta",
    office: "Polizia Locale",
    createdAt: "2026-04-25T17:34:00Z",
    reporter: {
      id: "u-002",
      nome: "Giulia",
      cognome: "Bianchi",
      telefono: "+39 340 9876543",
      codiceFiscale: "BNCGLI90B41L219K",
    },
  },
  {
    id: "RPT-0003",
    titolo: "Lampione spento in piazza centrale",
    descrizione:
      "Da tre giorni il lampione lato nord della piazza non si accende, creando una zona buia.",
    via: "Piazza del Popolo",
    civico: "1",
    citta: "Roma",
    cap: "00187",
    fotoUrl:
      "https://images.unsplash.com/photo-1519575706483-221027bfbb31?w=1200&q=80",
    source: "cittadino",
    status: "risolta",
    category: "Illuminazione pubblica",
    office: "Ufficio Lavori Pubblici",
    createdAt: "2026-04-22T20:05:00Z",
    reporter: {
      id: "u-003",
      nome: "Luca",
      cognome: "Verdi",
      telefono: "+39 348 1112223",
      codiceFiscale: "VRDLCU78C12H501Z",
    },
  },
  {
    id: "RPT-0004",
    titolo: "Rifiuti abbandonati a bordo strada",
    descrizione:
      "Cumulo di sacchi e ingombranti abbandonati sul ciglio della strada provinciale.",
    via: "Via dei Pini",
    civico: "s.n.",
    citta: "Napoli",
    cap: "80121",
    fotoUrl:
      "https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=1200&q=80",
    source: "cittadino",
    status: "nuova",
    createdAt: "2026-04-26T11:48:00Z",
    reporter: {
      id: "u-004",
      nome: "Sara",
      cognome: "Conti",
      telefono: "+39 351 5556677",
      codiceFiscale: "CNTSRA92D55F839Y",
    },
  },
  {
    id: "RPT-0005",
    titolo: "Albero pericolante nel parco comunale",
    descrizione:
      "Grosso ramo spezzato dopo il temporale, rischio di caduta sull'area giochi.",
    via: "Viale delle Querce",
    civico: "10",
    citta: "Bologna",
    cap: "40121",
    fotoUrl:
      "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1200&q=80",
    source: "cittadino",
    status: "in_lavorazione",
    office: "Ufficio Verde Pubblico",
    createdAt: "2026-04-24T08:20:00Z",
    reporter: {
      id: "u-005",
      nome: "Andrea",
      cognome: "Moretti",
      telefono: "+39 339 4445566",
      codiceFiscale: "MRTNDR80E15A944J",
    },
  },
];

export const STATUS_LABEL: Record<ReportStatus, string> = {
  nuova: "Nuova",
  in_lavorazione: "In lavorazione",
  risolta: "Risolta",
  respinta: "Respinta",
};

export const MOCK_MUNICIPAL_POSTS: MunicipalPost[] = [
  {
    id: "COM-0001",
    titolo: "Riasfaltatura di Via Manzoni completata",
    descrizione:
      "I lavori di riasfaltatura del tratto compreso tra Via Manzoni e Piazza Cavour sono stati ultimati. La strada è di nuovo percorribile.",
    tipo: "lavori_effettuati",
    fotoUrl:
      "https://images.unsplash.com/photo-1545158535-c3f7168c28b6?w=1200&q=80",
    citta: "Milano",
    zona: "Centro",
    office: "Ufficio Lavori Pubblici",
    publishedAt: "2026-04-26T08:00:00Z",
  },
  {
    id: "COM-0002",
    titolo: "Festa di primavera al parco comunale",
    descrizione:
      "Domenica 3 maggio, dalle 10 alle 19, attività per famiglie, food truck e musica dal vivo nel parco.",
    tipo: "evento",
    fotoUrl:
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80",
    citta: "Milano",
    zona: "Parco Sempione",
    office: "Ufficio Cultura ed Eventi",
    publishedAt: "2026-04-25T14:30:00Z",
  },
  {
    id: "COM-0003",
    titolo: "Sostituzione lampioni LED in zona stazione",
    descrizione:
      "Completata l'installazione di 42 nuovi lampioni LED a basso consumo lungo le vie circostanti la stazione.",
    tipo: "lavori_effettuati",
    fotoUrl:
      "https://images.unsplash.com/photo-1519575706483-221027bfbb31?w=1200&q=80",
    citta: "Roma",
    zona: "Termini",
    office: "Ufficio Lavori Pubblici",
    publishedAt: "2026-04-23T09:15:00Z",
  },
];
