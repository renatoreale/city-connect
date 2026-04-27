/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { MapPin, Menu, LogOut, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function SiteHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Uscita effettuata.");
    navigate({ to: "/" });
    setOpen(false);
  };

  // Navigazione adattiva al ruolo
  const navLinks = buildNav(role);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <MapPin className="h-5 w-5" />
          </div>
          <div className="leading-none">
            <div className="font-display text-lg font-extrabold tracking-tight">
              CivicVoice
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Segnalazioni urbane
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {profile?.nome ? `${profile.nome} ${profile.cognome}` : user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1.5 h-4 w-4" />
                Esci
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Accedi</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/registrazione">Registrati</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {navLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to as any}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              {user ? (
                <Button variant="outline" size="sm" className="flex-1" onClick={handleSignOut}>
                  <LogOut className="mr-1.5 h-4 w-4" />
                  Esci
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to="/login" onClick={() => setOpen(false)}>Accedi</Link>
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <Link to="/registrazione" onClick={() => setOpen(false)}>Registrati</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function buildNav(role: string | null): { to: string; label: string }[] {
  const base = [{ to: "/feed", label: "Segnalazioni" }];
  if (!role) return base;
  if (role === "citizen") {
    return [
      ...base,
      { to: "/mie-segnalazioni", label: "Le mie segnalazioni" },
      { to: "/nuova", label: "Nuova segnalazione" },
    ];
  }
  if (role === "manager") {
    return [...base, { to: "/manager", label: "Area Manager" }];
  }
  if (role === "admin") {
    return [
      ...base,
      { to: "/manager", label: "Manager" },
      { to: "/admin", label: "Admin" },
    ];
  }
  return base;
}
