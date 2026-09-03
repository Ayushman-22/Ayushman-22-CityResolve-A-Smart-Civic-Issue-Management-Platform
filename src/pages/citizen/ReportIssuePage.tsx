import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Camera, MapPin, Loader2, Check, ScanSearch } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Button, Input, Textarea, Select } from "@/components/ui";
import { CATEGORIES, PRIORITIES, PRIORITY_LABELS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";
import type { Priority } from "@/types";

type Coordinates = { latitude: number; longitude: number };

const formatCoordinates = ({ latitude, longitude }: Coordinates) =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

// Photos from phone cameras commonly store their capture position in the JPEG EXIF
// metadata. Read it before the image is resized for AI analysis, as canvas removes EXIF.
const readPhotoGps = async (file: File): Promise<Coordinates | null> => {
  if (!file.type.includes("jpeg")) return null;
  const bytes = new DataView(await file.arrayBuffer());
  if (bytes.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 <= bytes.byteLength) {
    if (bytes.getUint8(offset) !== 0xff) break;
    const marker = bytes.getUint8(offset + 1);
    const length = bytes.getUint16(offset + 2);
    if (marker === 0xe1 && offset + 10 + length <= bytes.byteLength &&
      String.fromCharCode(...Array.from({ length: 4 }, (_, index) => bytes.getUint8(offset + 4 + index))) === "Exif") {
      const tiff = offset + 10;
      const littleEndian = bytes.getUint16(tiff) === 0x4949;
      const uint16 = (position: number) => bytes.getUint16(position, littleEndian);
      const uint32 = (position: number) => bytes.getUint32(position, littleEndian);
      const readIfd = (position: number) => {
        const entries = new Map<number, number>();
        const count = uint16(position);
        for (let index = 0; index < count; index += 1) {
          const entry = position + 2 + index * 12;
          entries.set(uint16(entry), entry);
        }
        return entries;
      };
      const ifd = readIfd(tiff + uint32(tiff + 4));
      const gpsEntry = ifd.get(0x8825);
      if (!gpsEntry) return null;
      const gps = readIfd(tiff + uint32(gpsEntry + 8));
      const latitudeEntry = gps.get(2);
      const longitudeEntry = gps.get(4);
      if (!latitudeEntry || !longitudeEntry) return null;
      const readCoordinate = (entry: number) => {
        const coordinateOffset = tiff + uint32(entry + 8);
        const values = [0, 1, 2].map((index) => {
          const valueOffset = coordinateOffset + index * 8;
          const denominator = uint32(valueOffset + 4);
          return denominator ? uint32(valueOffset) / denominator : 0;
        });
        return values[0] + values[1] / 60 + values[2] / 3600;
      };
      const latitudeRef = gps.get(1);
      const longitudeRef = gps.get(3);
      let latitude = readCoordinate(latitudeEntry);
      let longitude = readCoordinate(longitudeEntry);
      if (latitudeRef && String.fromCharCode(bytes.getUint8(latitudeRef + 8)) === "S") latitude *= -1;
      if (longitudeRef && String.fromCharCode(bytes.getUint8(longitudeRef + 8)) === "W") longitude *= -1;
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
    }
    if (length < 2) break;
    offset += length + 2;
  }
  return null;
};

export default function ReportIssuePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [priority, setPriority] = useState<Priority>("medium");
  const [location, setLocation] = useState("");
  const [ward, setWard] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoData, setPhotoData] = useState("");
  const [uploading, setUploading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const [aiReason, setAiReason] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationSource, setLocationSource] = useState<"photo" | "device" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      const imageData = await readImageForAnalysis(file);
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("issue-photos").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("issue-photos").getPublicUrl(path);
      setPhotoUrl(urlData.publicUrl);
      setPhotoData(imageData);
      void detectPhotoLocation(file);
      toast("Photo uploaded — AI is detecting issue details", "success");
      await handleAISuggest(imageData);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to upload photo", "error");
    }
    setUploading(false);
  };

  const applyCoordinates = (coordinates: Coordinates, source: "photo" | "device") => {
    setLatitude(coordinates.latitude);
    setLongitude(coordinates.longitude);
    setLocation(formatCoordinates(coordinates));
    setLocationSource(source);
  };

  const detectPhotoLocation = async (file: File) => {
    try {
      const coordinates = await readPhotoGps(file);
      if (coordinates) {
        applyCoordinates(coordinates, "photo");
        toast("Location detected from the photo", "success");
      }
    } catch {
      // Missing or malformed EXIF is normal; the visual AI analysis can still proceed.
    }
  };

  const readImageForAnalysis = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => reject(new Error("Could not read image"));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });

  const handleAISuggest = async (imageData = photoData) => {
    if (description.length < 10 && !imageData) {
      toast("Please write a longer description first", "info");
      return;
    }
    setSuggesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ description, photoData: imageData || null }),
      });
      if (!res.ok) {
        const failure = await res.json().catch(() => null);
        throw new Error(failure?.error || "AI request failed");
      }
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.category) setCategory(data.category);
      if (data.priority) setPriority(data.priority as Priority);
      if (data.location && !locationSource) setLocation(data.location);
      if (data.ward) setWard(data.ward);
      if (data.reason) setAiReason(data.reason);
      if (data.recommendedAction) setRecommendedAction(data.recommendedAction);
      setSuggested(true);
      toast("AI suggestions applied — feel free to adjust", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "AI suggestion unavailable, please pick manually", "error");
    }
    setSuggesting(false);
  };

  const handleGetLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      toast("Geolocation not supported on this device", "error");
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoordinates({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, "device");
        toast("Location captured", "success");
        setGettingLocation(false);
      },
      () => {
        toast("Location permission denied — you can enter it manually", "error");
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    const { error } = await supabase.from("issues").insert({
      reporter_id: profile.id,
      title,
      description,
      category,
      priority,
      location: location || null,
      ward: ward || null,
      latitude,
      longitude,
      photo_url: photoUrl || null,
    });
    setSubmitting(false);
    if (error) {
      toast("Failed to submit issue", "error");
      return;
    }
    toast("Issue reported successfully!", "success");
    navigate("/citizen/issues");
  };

  return (
    <AppShell role="citizen">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Report an Issue</h1>
          <p className="mt-1 text-sm text-slate-500">Upload a photo and AI will detect the issue title, category, and any visible location details.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo */}
          <Card className="p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Photo (optional)</label>
            {photoUrl ? (
              <div className="relative">
                <img src={photoUrl} alt="Issue" className="w-full h-48 object-cover rounded-xl border border-slate-200" />
                {suggesting && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-slate-950/55 text-sm font-semibold text-white">
                    <ScanSearch className="h-5 w-5 animate-pulse" /> Analyzing photo with AI…
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setPhotoUrl(""); setPhotoData(""); }}
                  className="absolute top-2 right-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-red-600 shadow-sm hover:bg-white"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-8 cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-all">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-400" />
                )}
                <span className="text-sm text-slate-500">{uploading ? "Uploading..." : "Click to upload a photo"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <Input label="Title" value={title} onChange={setTitle} placeholder="e.g. Large pothole on Main Street" required />

            <div>
              <Textarea
                label="Description"
                value={description}
                onChange={setDescription}
                placeholder="Describe the issue in detail. What's wrong? How long has it been there? Is it dangerous?"
                required
                rows={4}
              />
              <button
                type="button"
                onClick={() => handleAISuggest()}
                disabled={suggesting}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 px-3 py-1.5 text-sm font-semibold text-teal-700 hover:from-teal-100 hover:to-blue-100 transition-all disabled:opacity-50"
              >
                {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {suggesting ? "Analyzing..." : "Suggest Category & Priority with AI"}
              </button>
              {suggested && (
                <div className="mt-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <p className="flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3" /> AI suggestions applied — you can still edit them below
                  </p>
                  {aiReason && <p className="mt-1">Why: {aiReason}</p>}
                  {recommendedAction && <p className="mt-1 font-medium">Recommended action: {recommendedAction}</p>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                value={category}
                onChange={setCategory}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                required
              />
              <Select
                label="Priority"
                value={priority}
                onChange={(v) => setPriority(v as Priority)}
                options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
                required
              />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <Input label="Location (optional)" value={location} onChange={(value) => { setLocation(value); setLocationSource(null); }} placeholder="e.g. Near City Mall, MG Road" />
            <Input label="Ward / Area (optional)" value={ward} onChange={setWard} placeholder="e.g. Ward 7" />
            <div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={gettingLocation}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                {gettingLocation ? "Getting location..." : "Use My Current Location"}
              </button>
              {latitude !== null && longitude !== null && (
                <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Location {locationSource === "photo" ? "detected from photo" : "captured"}: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </p>
              )}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/citizen")} full>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !title || !description} full>
              {submitting ? "Submitting..." : "Submit Issue"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
