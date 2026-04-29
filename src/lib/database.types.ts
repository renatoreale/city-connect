export type UserRole = "citizen" | "manager" | "admin";

export type ReportStatus =
  | "nuova"
  | "in_valutazione"
  | "assegnata"
  | "in_lavorazione"
  | "risolta"
  | "respinta"
  | "archiviata";

export type ReportPriority = "bassa" | "media" | "alta" | "urgente";

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
  created_at: string;
  updated_at: string;
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
      reports: {
        Row: Report;
        Insert: Omit<Report, "id" | "created_at" | "updated_at" | "categoria" | "settore" | "profile" | "foto">;
        Update: Partial<Omit<Report, "id" | "created_at" | "categoria" | "settore" | "profile" | "foto">>;
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
    Functions: {
      get_my_reports: {
        Args: Record<string, never>;
        Returns: Report[];
      };
    };
    Enums: {
      user_role: UserRole;
      report_status: ReportStatus;
      report_priority: ReportPriority;
    };
  };
}
