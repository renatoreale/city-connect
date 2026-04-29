export type UserRole =
  | "super_admin"
  | "admin_regione"
  | "admin_comune"
  | "admin_ufficio"
  | "operatore_ufficio"
  | "squadra_lavoro"
  | "cittadino";

export type ReportStatus =
  | "nuova"
  | "in_valutazione"
  | "assegnata"
  | "in_lavorazione"
  | "terminata"
  | "risolta"
  | "respinta"
  | "archiviata";

export type ReportPriority = "bassa" | "media" | "alta" | "urgente";

export interface Regione {
  id: string;
  nome: string;
  created_at: string;
}

export interface Comune {
  id: string;
  nome: string;
  regione_id: string;
  provincia: string | null;
  created_at: string;
  regione?: Regione;
}

export interface Ufficio {
  id: string;
  nome: string;
  comune_id: string;
  created_at: string;
  comune?: Comune;
}

export interface SquadraLavoro {
  id: string;
  nome: string;
  ufficio_id: string;
  created_at: string;
  ufficio?: Ufficio;
}

export interface Profile {
  id: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  codice_fiscale: string | null;
  foto_profilo_url: string | null;
  ruolo: UserRole;
  citta: string | null;
  profile_completed: boolean;
  regione_id: string | null;
  comune_id: string | null;
  ufficio_id: string | null;
  squadra_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  regione?: Regione | null;
  comune?: Comune | null;
  ufficio?: Ufficio | null;
  squadra?: SquadraLavoro | null;
}

export interface Category {
  id: string;
  nome: string;
  icona: string | null;
  created_at: string;
}

export interface Sector {
  id: string;
  nome: string;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  titolo: string;
  descrizione: string;
  citta: string;
  provincia: string | null;
  cap: string | null;
  via: string;
  numero_civico: string | null;
  latitudine: number | null;
  longitudine: number | null;
  riferimenti_aggiuntivi: string | null;
  categoria_id: string | null;
  settore_id: string | null;
  comune_id: string | null;
  ufficio_id: string | null;
  squadra_id: string | null;
  stato: ReportStatus;
  priorita: ReportPriority;
  presa_in_carico_da: string | null;
  note_manager: string | null;
  note_admin: string | null;
  motivo_respinta: string | null;
  data_chiusura: string | null;
  created_at: string;
  updated_at: string;
  // joined
  categoria?: Category | null;
  settore?: Sector | null;
  profile?: Profile | null;
  foto?: ReportPhoto[];
  comune?: Comune | null;
  ufficio?: Ufficio | null;
  squadra?: SquadraLavoro | null;
}

export interface ReportPhoto {
  id: string;
  report_id: string;
  file_url: string;
  file_path: string;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  report_id: string;
  old_status: ReportStatus | null;
  new_status: ReportStatus;
  changed_by: string;
  note: string | null;
  created_at: string;
}

// Helpers di tipo per i ruoli
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:       "Super Admin",
  admin_regione:     "Admin Regione",
  admin_comune:      "Admin Comune",
  admin_ufficio:     "Admin Ufficio",
  operatore_ufficio: "Operatore Ufficio",
  squadra_lavoro:    "Squadra Lavoro",
  cittadino:         "Cittadino",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin:       "Accesso completo a tutta l'app.",
  admin_regione:     "Gestione completa della propria regione. Non può cancellare segnalazioni.",
  admin_comune:      "Gestione completa del proprio comune. Non può cancellare segnalazioni.",
  admin_ufficio:     "Gestione del proprio ufficio e comune. Non può cancellare segnalazioni.",
  operatore_ufficio: "Smistamento segnalazioni, assegnazione uffici e squadre, chiusura per il proprio ufficio.",
  squadra_lavoro:    "Visualizza segnalazioni assegnate, imposta in lavorazione e terminata.",
  cittadino:         "Crea segnalazioni e visualizza le proprie.",
};

export const ROLE_STYLES: Record<UserRole, string> = {
  super_admin:       "bg-destructive/10 text-destructive",
  admin_regione:     "bg-orange-100 text-orange-700",
  admin_comune:      "bg-amber-100 text-amber-700",
  admin_ufficio:     "bg-yellow-100 text-yellow-700",
  operatore_ufficio: "bg-primary/10 text-primary",
  squadra_lavoro:    "bg-blue-100 text-blue-700",
  cittadino:         "bg-secondary text-secondary-foreground",
};

// Gruppi di ruolo per i controlli di accesso
export const RUOLI_STAFF: UserRole[] = [
  "super_admin", "admin_regione", "admin_comune",
  "admin_ufficio", "operatore_ufficio", "squadra_lavoro",
];
export const RUOLI_ADMIN: UserRole[] = [
  "super_admin", "admin_regione", "admin_comune", "admin_ufficio",
];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at">;
        Update: Partial<Omit<Category, "id" | "created_at">>;
      };
      sectors: {
        Row: Sector;
        Insert: Omit<Sector, "id" | "created_at">;
        Update: Partial<Omit<Sector, "id" | "created_at">>;
      };
      regioni: {
        Row: Regione;
        Insert: Omit<Regione, "id" | "created_at">;
        Update: Partial<Omit<Regione, "id" | "created_at">>;
      };
      comuni: {
        Row: Comune;
        Insert: Omit<Comune, "id" | "created_at">;
        Update: Partial<Omit<Comune, "id" | "created_at">>;
      };
      uffici: {
        Row: Ufficio;
        Insert: Omit<Ufficio, "id" | "created_at">;
        Update: Partial<Omit<Ufficio, "id" | "created_at">>;
      };
      squadre_lavoro: {
        Row: SquadraLavoro;
        Insert: Omit<SquadraLavoro, "id" | "created_at">;
        Update: Partial<Omit<SquadraLavoro, "id" | "created_at">>;
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, "id" | "created_at" | "updated_at" | "categoria" | "settore" | "profile" | "foto" | "comune" | "ufficio" | "squadra">;
        Update: Partial<Omit<Report, "id" | "created_at" | "categoria" | "settore" | "profile" | "foto" | "comune" | "ufficio" | "squadra">>;
      };
      report_photos: {
        Row: ReportPhoto;
        Insert: Omit<ReportPhoto, "id" | "created_at">;
        Update: Partial<Omit<ReportPhoto, "id" | "created_at">>;
      };
      status_history: {
        Row: StatusHistory;
        Insert: Omit<StatusHistory, "id" | "created_at">;
        Update: never;
      };
    };
    Views: {
      reports_for_manager: {
        Row: Omit<Report, "profile"> & { profile: null };
      };
    };
    Enums: {
      user_role: UserRole;
      report_status: ReportStatus;
      report_priority: ReportPriority;
    };
  };
}
