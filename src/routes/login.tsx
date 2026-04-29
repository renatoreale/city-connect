import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Accedi — CivicVoice" },
      { name: "description", content: "Accedi al tuo profilo CivicVoice." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, role } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Inserisci email e password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Accesso effettuato.");
      // Redirect in base al ruolo
      if (role === "admin") {
        navigate({ to: "/admin" });
      } else if (role === "manager") {
        navigate({ to: "/manager" });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigate({ to: "/mie-segnalazioni" as any });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore di accesso.";
      if (msg.includes("Invalid login credentials")) {
        toast.error("Email o password errati.");
      } else if (msg.includes("Email not confirmed")) {
        toast.error("Conferma prima la tua email prima di accedere.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div
        className="relative hidden flex-col justify-between p-10 text-primary-foreground md:flex"
        style={{ background: "var(--gradient-hero)" }}
      >
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="font-display text-lg font-extrabold">CivicVoice</div>
        </Link>
        <div className="max-w-sm">
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Bentornato. La tua città ti aspetta.
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Accedi per inviare nuove segnalazioni o seguire quelle esistenti.
          </p>
        </div>
        <div className="text-xs text-primary-foreground/60">
          CivicVoice · Piattaforma segnalazioni urbane
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <form
          className="w-full max-w-sm space-y-6"
          onSubmit={handleSubmit}
        >
          <div>
            <h1 className="font-display text-3xl font-bold">Accedi</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Non hai un profilo?{" "}
              <Link
                to="/registrazione"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Registrati
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <Button className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accesso in corso...
              </>
            ) : (
              "Entra"
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            I tuoi dati sono protetti con Supabase e crittografia end-to-end.
          </div>
        </form>
      </div>
    </div>
  );
}
