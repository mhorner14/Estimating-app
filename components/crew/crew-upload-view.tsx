"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Trash2, CheckCircle, Loader2, MapPin, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface UploadedPhoto {
  id: string;
  url: string;
  caption: string;
  photoType: string;
}

interface Props {
  token: string;
  estimateNumber: string;
  customerName: string;
  address: string;
  crewNotes: string;
  initialPhotos: UploadedPhoto[];
}

export function CrewUploadView({ token, estimateNumber, customerName, address, crewNotes, initialPhotos }: Props) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [photoType, setPhotoType] = useState("AFTER");
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [completionForm, setCompletionForm] = useState({ startTime: "", endTime: "", materialNotes: "", issuesNotes: "" });
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const [completionSubmitted, setCompletionSubmitted] = useState(false);

  async function submitCompletion() {
    setSubmittingCompletion(true);
    try {
      const res = await fetch(`/api/crew-photos/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completionForm),
      });
      if (!res.ok) throw new Error();
      setCompletionSubmitted(true);
      toast({ title: "Completion report submitted!" });
    } catch {
      toast({ title: "Failed to submit report", variant: "destructive" });
    } finally {
      setSubmittingCompletion(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        const res = await fetch(`/api/crew-photos/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: dataUrl, caption, photoType }),
        });
        if (!res.ok) throw new Error("Upload failed");
        const photo = await res.json();
        setPhotos((prev) => [...prev, { id: photo.id, url: photo.url, caption: photo.caption || "", photoType: photo.photoType }]);
      }
      setCaption("");
      toast({ title: `${files.length} photo${files.length > 1 ? "s" : ""} uploaded` });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const beforePhotos = photos.filter((p) => p.photoType === "BEFORE");
  const afterPhotos = photos.filter((p) => p.photoType === "AFTER");
  const otherPhotos = photos.filter((p) => p.photoType !== "BEFORE" && p.photoType !== "AFTER");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white px-4 py-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Job Sheet</p>
        <h1 className="text-xl font-bold">{customerName}</h1>
        {address && (
          <div className="flex items-center gap-1.5 mt-1 text-slate-300 text-sm">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{address}</span>
          </div>
        )}
        <p className="text-xs text-slate-500 mt-1">{estimateNumber}</p>
      </div>

      {crewNotes && (
        <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <ClipboardList className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-1">Crew Notes</p>
              <p className="text-sm text-amber-700 whitespace-pre-wrap">{crewNotes}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-6 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Camera className="w-4 h-4 text-slate-500" />
            Upload Photos
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Photo Type</Label>
              <Select value={photoType} onValueChange={setPhotoType}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEFORE">Before</SelectItem>
                  <SelectItem value="AFTER">After</SelectItem>
                  <SelectItem value="PROBLEM_AREA">Problem Area</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Caption (optional)</Label>
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Garage floor" className="h-9 text-sm" />
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => { if (fileInputRef.current) { fileInputRef.current.removeAttribute("capture"); fileInputRef.current.click(); } }}
              variant="outline"
              className="h-12 flex-col gap-1 text-xs"
              disabled={uploading}
            >
              <Upload className="w-4 h-4" />
              Choose Photos
            </Button>
            <Button
              onClick={() => { if (fileInputRef.current) { fileInputRef.current.setAttribute("capture", "environment"); fileInputRef.current.click(); } }}
              className="h-12 flex-col gap-1 text-xs bg-slate-900 hover:bg-slate-800"
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Take Photo
            </Button>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
            </div>
          )}
        </div>

        {photos.length > 0 && (
          <div className="space-y-4">
            {[{ label: "Before Photos", items: beforePhotos }, { label: "After Photos", items: afterPhotos }, { label: "Other Photos", items: otherPhotos }]
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <div key={group.label}>
                  <h3 className="text-sm font-semibold text-slate-600 mb-2">{group.label} ({group.items.length})</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((photo) => (
                      <div key={photo.id} className="relative rounded-lg overflow-hidden bg-slate-100 aspect-square">
                        <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                        {photo.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                            {photo.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {photos.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            {photos.length} photo{photos.length > 1 ? "s" : ""} uploaded for this job
          </div>
        )}

        {/* Completion Report */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            Job Completion Report
          </h2>
          {completionSubmitted ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle className="w-4 h-4" /> Report submitted!
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start Time</Label>
                  <Input type="time" value={completionForm.startTime} onChange={(e) => setCompletionForm((f) => ({ ...f, startTime: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Time</Label>
                  <Input type="time" value={completionForm.endTime} onChange={(e) => setCompletionForm((f) => ({ ...f, endTime: e.target.value }))} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Materials Used</Label>
                <Input value={completionForm.materialNotes} onChange={(e) => setCompletionForm((f) => ({ ...f, materialNotes: e.target.value }))} placeholder="e.g. 3 gal epoxy, 2 lbs flake" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Issues / Notes</Label>
                <Input value={completionForm.issuesNotes} onChange={(e) => setCompletionForm((f) => ({ ...f, issuesNotes: e.target.value }))} placeholder="Any problems or things to note..." className="h-9 text-sm" />
              </div>
              <Button
                className="w-full bg-slate-900 hover:bg-slate-800"
                onClick={submitCompletion}
                disabled={submittingCompletion}
              >
                {submittingCompletion ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Submit Completion Report
              </Button>
            </div>
          )}
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
