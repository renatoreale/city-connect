import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  Loader2,
  LocateFixed,
  MapPin,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Category, Sector } from "@/lib/database.types";

export const Route = createFileRoute("/nuova")({
  head: () => ({
    meta: [
      { title: "Nuova segnalazione — CivicVoice" },
      {
        name: "description",
        content: "Crea una nuova segnalazione: foto, descrizione e indirizzo del disservizio.",
      },
    ],
  }),
  component: NewReportPage,
});

interface PhotoItem {
  id: string;
  url: string;
  file: File;
}

interface DetectedAddress {
  via: string;
  civico: string;
  cap: string;
  citta: string;
  provincia: string;
  lat: number;
  lng: number;
}

const MAX_PHOTOS = 6;
const MAX_PHOTO_SIZE_MB = 10;

const PROVINCE_IT = [
  "AG","AL","AN","AO","AP","AQ","AR","AT","AV","BA","BG","BI","BL","BN","BO",
  "BR","BS","BT","BZ","CA","CB","CE","CH","CL","CN","CO","CR","CS","CT","CZ",
  "EN","FC","FE","FG","FI","FM","FR","GE","GO","GR","IM","IS","KR","LC","LE",
  "LI","LO","LT","LU","MB","MC","ME","MI","MN","MO","MS","MT","NA","NO","NU",
  "OR","PA","PC","PD","PE","PG","PI","PN","PO","PR","PT","PU","PV","PZ","RA",
  "RC","RE","RG","RI","RM","RN","RO","SA","SI","SO","SP","SR","SS","SU","SV",
  "TA","TE","TN","TO","TP","TR","TS","TV","UD","VA","VB","VC","VE","VI","VR",
  "VT","VV",
];

function NewReportPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [via, setVia] = useState("");
  const [civico, setCivico] = useState("");
  const [cap, setCap] = useState("");
  const [citta, setCitta] = useState("");
  const [provincia, setProvincia] = useState<string | undefined>(undefined);
  const [rifAggiuntivi, setRifAggiuntivi] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | undefined>(undefined);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedAddress | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error("Devi accedere per inviare segnalazioni.");
      navigate({ to: "/login" });
      return;
    }
    // Aspetta che il profilo sia caricato prima di decidere
    if (profile === null) return;
    if (!profile.profile_completed) {
      toast.warning("Completa il profilo prima di inviare segnalazioni.");
      navigate({ to: "/registrazione" });
      return;
    }
    loadLookups();
  }, [user, profile, authLoading]);

  const loadLookups = async () => {
    const [{ data: cats }, { data: sects }] = await Promise.all([
      supabase.from("categories").select("*").order("nome"),
      supabase.from("sectors").select("*").order("nome"),
    ]);
    if (cats) setCategories(cats as Category[]);
    if (sects) setSectors(sects as Sector[]);
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: PhotoItem[] = [];
    Array.from(files).forEach((f) => {
      if (photos.length + next.length >= MAX_PHOTOS) return;
      if (f.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
        toast.error(`La foto "${f.name}" supera ${MAX_PHOTO_SIZE_MB}MB.`);
        return;
      }
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: URL.createObjectURL(f),
        file: f,
      });
    });
    setPhotos((prev) => [...prev, ...next]);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const requestGeolocation = () => {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocalizzazione non supportata da questo dispositivo.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);

        // Reverse geocoding con Nominatim (OpenStreetMap, gratuito)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "it" } }
          );
          const data = await res.json();
          const addr = data.address ?? {};
          const mock: DetectedAddress = {
            via: [addr.road, addr.pedestrian, addr.path].find(Boolean) ?? "",
            civico: addr.house_number ?? "",
            cap: addr.postcode ?? "",
            citta: addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? "",
            provincia: (addr.state_code ?? addr.county ?? "").substring(0, 2).toUpperCase(),
            lat: latitude,
            lng: longitude,
          };
          setDetected(mock);
          setConfirmOpen(true);
        } catch {
          // Se Nominatim fallisce, mostra solo le coordinate
          setDetected({
            via: "", civico: "", cap: "", citta: "", provincia: "",
            lat: latitude, lng: longitude,
          });
          setConfirmOpen(true);
        }
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permesso negato. Abilita la posizione per usare questa funzione."
            : "Impossibile rilevare la posizione. Riprova o inserisci i dati manualmente."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const confirmDetected = () => {
    if (!detected) return;
    if (detected.via) setVia(detected.via);
    if (detected.civico) setCivico(detected.civico);
    if (detected.cap) setCap(detected.cap);
    if (detected.citta) setCitta(detected.citta);
    if (detected.provincia) setProvincia(detected.provincia);
    setConfirmOpen(false);
  };

  const uploadPhotos = async (reportId: string): Promise<void> => {
    for (const photo of photos) {
      const ext = photo.file.name.split(".").pop() ?? "jpg";
      const path = `${user!.id}/${reportId}/${photo.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("report-photos")
        .upload(path, photo.file);
      if (uploadError) continue;

      const { data: urlData } = supabase.storage
        .from("report-photos")
        .getPublicUrl(path);

      await supabase.from("report_photos").insert({
        report_id: reportId,
        file_url: urlData.publicUrl,
        file_path: path,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titolo.trim()) { toast.error("Il titolo è obbligatorio."); return; }
    if (!descrizione.trim()) { toast.error("La descrizione è obbligatoria."); return; }
    if (!via.trim()) { toast.error("L'indirizzo è obbligatorio."); return; }
    if (!citta.trim()) { toast.error("La città è obbligatoria."); return; }

    setSubmitting(true);
    try {
      // 1. Inserisci segnalazione
      const { data: report, error: reportError } = await supabase
        .from("reports")
        .insert({
          user_id: user!.id,
          titolo: titolo.trim(),
          descrizione: descrizione.trim(),
          via: via.trim(),
          numero_civico: civico.trim() || null,
          cap: cap.trim() || null,
          citta: citta.trim(),
          provincia: provincia ?? null,
          latitudine: lat,
          longitudine: lng,
          riferimenti_aggiuntivi: rifAggiuntivi.trim() || null,
          categoria_id: categoriaId ?? null,
          stato: "nuova",
          priorita: "media",
        })
        .select("id")
        .single();

      if (reportError) throw reportError;

      // 2. Upload foto (se presenti)
      if (photos.length > 0) {
        await uploadPhotos(report.id);
      }

      toast.success("Segnalazione inviata con successo!");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: "/mie-segnalazioni" as any });
    } catch (err: unknown) {
      // PostgrestError non estende Error: leggiamo .message direttamente
      const msg =
        (err as { message?: string })?.message ?? "Errore nell'invio della segnalazione.";
      console.error("Errore segnalazione:", err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Nuova segnalazione
        </div>
        <h1 className="mt-2 font-display text-4xl font-extrabold md:text-5xl">
          Cosa vuoi segnalare?
        </h1>
        <p className="mt-3 text-muted-foreground">
          Compila tutti i campi. Una buona descrizione e foto chiare aiutano a
          risolvere il problema più rapidamente.
        </p>

        <form
          className="mt-8 space-y-8 rounded-3xl border border-border bg-card p-6 md:p-10"
          style={{ boxShadow: "var(--shadow-card)" }}
          onSubmit={handleSubmit}
        >
          {/* Foto */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Documentazione fotografica</Label>
              <span className="text-xs text-muted-foreground">
                {photos.length}/{MAX_PHOTOS}
              </span>
            </div>

            {photos.length === 0 ? (
              <div className="flex aspect-[16/9] items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/40">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Camera className="h-8 w-8" />
                  <div className="text-sm font-medium">Nessuna foto aggiunta</div>
                  <div className="text-xs">Scatta o carica fino a {MAX_PHOTOS} foto</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                  >
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow transition hover:bg-destructive hover:text-destructive-foreground"
                      aria-label="Rimuovi foto"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="button"
                variant="default"
                onClick={() => cameraInputRef.current?.click()}
                disabled={photos.length >= MAX_PHOTOS || submitting}
              >
                <Camera className="mr-2 h-4 w-4" />
                Scatta foto
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => galleryInputRef.current?.click()}
                disabled={photos.length >= MAX_PHOTOS || submitting}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Carica dalla galleria
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Da mobile potrai usare la fotocamera. Massimo {MAX_PHOTOS} foto, JPG o PNG, max {MAX_PHOTO_SIZE_MB}MB ciascuna.
            </p>
          </section>

          {/* Testo */}
          <section className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Titolo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Breve titolo della segnalazione"
                value={titolo}
                onChange={(e) => setTitolo(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">
                Descrizione <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="desc"
                rows={5}
                placeholder="Descrivi il disservizio: cosa, quando, eventuali rischi..."
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="cat">Categoria</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId} disabled={submitting}>
                  <SelectTrigger id="cat">
                    <SelectValue placeholder="Seleziona categoria (opzionale)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>

          {/* Indirizzo */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="font-display text-lg font-bold">Localizzazione</h2>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={requestGeolocation}
                disabled={geoLoading || submitting}
              >
                {geoLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rilevamento...</>
                ) : (
                  <><LocateFixed className="mr-2 h-4 w-4" />Usa la mia posizione</>
                )}
              </Button>
            </div>

            {geoError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {geoError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-[1fr_120px]">
              <div className="space-y-2">
                <Label htmlFor="via">
                  Via / Piazza <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="via"
                  placeholder="Via Roma"
                  value={via}
                  onChange={(e) => setVia(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="civico">Civico</Label>
                <Input
                  id="civico"
                  placeholder="12"
                  value={civico}
                  onChange={(e) => setCivico(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[120px_1fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="cap">CAP</Label>
                <Input
                  id="cap"
                  placeholder="00100"
                  maxLength={5}
                  value={cap}
                  onChange={(e) => setCap(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="citta">
                  Città <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="citta"
                  placeholder="Roma"
                  value={citta}
                  onChange={(e) => setCitta(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia</Label>
                <Select
                  value={provincia}
                  onValueChange={(v) => setProvincia(v)}
                  disabled={submitting}
                >
                  <SelectTrigger id="provincia">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVINCE_IT.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rif">Riferimenti aggiuntivi</Label>
              <Input
                id="rif"
                placeholder="Es. di fronte alla scuola, vicino al semaforo..."
                value={rifAggiuntivi}
                onChange={(e) => setRifAggiuntivi(e.target.value)}
                disabled={submitting}
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">
              I tuoi dati personali saranno visibili solo agli amministratori.
              I manager riceveranno la segnalazione in forma anonima.
            </p>
            <Button size="lg" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Invio in corso...</>
              ) : (
                "Invia segnalazione"
              )}
            </Button>
          </div>
        </form>
      </section>

      <SiteFooter />

      {/* Dialog conferma posizione */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confermi questa posizione?</DialogTitle>
            <DialogDescription>
              Abbiamo rilevato il seguente indirizzo dalla tua posizione attuale.
              Compileremo i campi solo dopo la tua conferma.
            </DialogDescription>
          </DialogHeader>
          {detected && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              {detected.via ? (
                <div className="font-display text-base font-bold">
                  {detected.via}{detected.civico ? `, ${detected.civico}` : ""}
                </div>
              ) : null}
              {detected.citta ? (
                <div className="text-muted-foreground">
                  {detected.cap} {detected.citta}
                  {detected.provincia ? ` (${detected.provincia})` : ""}
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                Coordinate: {detected.lat.toFixed(5)}, {detected.lng.toFixed(5)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annulla
            </Button>
            <Button onClick={confirmDetected}>Conferma e compila</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
