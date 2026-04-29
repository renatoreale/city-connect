import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/registrazione")({
  head: () => ({
    meta: [
      { title: "Registrazione — CivicVoice" },
      {
        name: "description",
        content:
          "Crea il tuo profilo CivicVoice con dati anagrafici e foto per iniziare a segnalare disservizi urbani.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { user, profile, signUp, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isAlreadyLoggedIn = !!user;

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [nome, setNome] = useState(profile?.nome ?? "");
  const [cognome, setCognome] = useState(profile?.cognome ?? "");
  const [cf, setCf] = useState(profile?.codice_fiscale ?? "");
  const [telefono, setTelefono] = useState(profile?.telefono ?? "");
  const [citta, setCitta] = useState(profile?.citta ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La foto profilo non può superare 5MB.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAlreadyLoggedIn) {
      // Utente già autenticato: completa solo il profilo
      if (!nome || !cognome) {
        toast.error("Nome e cognome sono obbligatori.");
        return;
      }
      if (cf && cf.length !== 16) {
        toast.error("Il codice fiscale deve essere di 16 caratteri.");
        return;
      }

      setLoading(true);
      try {
        const userId = user!.id;
        let fotoUrl: string | null = profile?.foto_profilo_url ?? null;
        if (photoFile) {
          fotoUrl = await uploadAvatar(userId, photoFile);
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            nome,
            cognome,
            telefono: telefono || null,
            codice_fiscale: cf.toUpperCase() || null,
            citta: citta || null,
            foto_profilo_url: fotoUrl,
            profile_completed: true,
          })
          .eq("id", userId);

        if (error) throw error;

        await refreshProfile();
        toast.success("Profilo completato! Ora puoi inviare segnalazioni.");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigate({ to: "/nuova" as any });
      } catch (err: unknown) {
        const msg = (err as { message?: string })?.message ?? "Errore nell'aggiornamento del profilo.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Nuovo utente: crea account + profilo
    if (!nome || !cognome || !email || !password) {
      toast.error("Compila tutti i campi obbligatori.");
      return;
    }
    if (password.length < 8) {
      toast.error("La password deve essere di almeno 8 caratteri.");
      return;
    }
    if (cf && cf.length !== 16) {
      toast.error("Il codice fiscale deve essere di 16 caratteri.");
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        toast.info(
          "Account creato. Controlla la tua email per confermare l'account, poi accedi per completare il profilo."
        );
        navigate({ to: "/login" });
        return;
      }

      let fotoUrl: string | null = null;
      if (photoFile) {
        fotoUrl = await uploadAvatar(userId, photoFile);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          nome,
          cognome,
          telefono: telefono || null,
          codice_fiscale: cf.toUpperCase() || null,
          citta: citta || null,
          foto_profilo_url: fotoUrl,
          profile_completed: true,
        })
        .eq("id", userId);

      if (profileError) {
        toast.error("Profilo creato ma errore nell'aggiornamento dati. Completa dal profilo.");
      }

      await refreshProfile();
      toast.success("Profilo creato con successo! Benvenuto in CivicVoice.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: "/mie-segnalazioni" as any });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Errore durante la registrazione.";
      if (msg.includes("User already registered")) {
        toast.error("Email già registrata. Prova ad accedere.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <MapPin className="h-4 w-4" /> CivicVoice
        </Link>

        <div className="mt-6">
          <h1 className="font-display text-4xl font-extrabold">
            {isAlreadyLoggedIn ? "Completa il tuo profilo" : "Crea il tuo profilo"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isAlreadyLoggedIn
              ? "Aggiungi nome e cognome per poter inviare segnalazioni."
              : "Per inviare segnalazioni servono dati anagrafici verificabili e una foto profilo."}
          </p>
        </div>

        <form
          className="mt-10 space-y-8 rounded-3xl border border-border bg-card p-6 md:p-10"
          style={{ boxShadow: "var(--shadow-card)" }}
          onSubmit={handleSubmit}
        >
          {/* Foto */}
          <section>
            <h2 className="font-display text-lg font-bold">Foto profilo</h2>
            <div className="mt-4 flex items-center gap-5">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted transition hover:border-primary"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera className="h-7 w-7 text-muted-foreground" />
                )}
              </button>
              <div>
                <Label
                  htmlFor="photo"
                  className="inline-flex cursor-pointer items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  Carica foto
                </Label>
                <input
                  ref={photoInputRef}
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  JPG o PNG, max 5MB. (opzionale)
                </p>
              </div>
            </div>
          </section>

          {/* Anagrafica */}
          <section>
            <h2 className="font-display text-lg font-bold">Dati anagrafici</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  placeholder="Mario"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cognome">
                  Cognome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cognome"
                  placeholder="Rossi"
                  value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf">Codice fiscale</Label>
                <Input
                  id="cf"
                  placeholder="RSSMRA80A01H501Z"
                  maxLength={16}
                  className="uppercase"
                  value={cf}
                  onChange={(e) => setCf(e.target.value.toUpperCase())}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tel">Telefono</Label>
                <Input
                  id="tel"
                  type="tel"
                  placeholder="+39 333 1234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="citta">Città di residenza</Label>
                <Input
                  id="citta"
                  placeholder="Roma"
                  value={citta}
                  onChange={(e) => setCitta(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </section>

          {/* Account — solo per nuovi utenti */}
          {!isAlreadyLoggedIn && (
            <section>
              <h2 className="font-display text-lg font-bold">Account</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@esempio.it"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 8 caratteri"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">
              Registrandoti accetti l'informativa sulla privacy. I tuoi dati
              saranno visibili solo agli amministratori autorizzati.
            </p>
            <Button size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione in corso...
                </>
              ) : (
                "Crea profilo"
              )}
            </Button>
          </div>
        </form>

        {!isAlreadyLoggedIn && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Hai già un profilo?{" "}
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Accedi
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
