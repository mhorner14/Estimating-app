"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, Trash2, Image as ImageIcon, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface Photo {
  id: string;
  url: string;
  caption?: string | null;
  photoType: string;
}

interface PhotoUploadProps {
  estimateId: string;
  photos: Photo[];
  onUpdate: (photos: Photo[]) => void;
}

async function deletePhoto(estimateId: string, photoId: string): Promise<boolean> {
  const res = await fetch(`/api/estimates/${estimateId}/photos/${photoId}`, { method: "DELETE" });
  return res.ok;
}

const PHOTO_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "BEFORE", label: "Before" },
  { value: "PROBLEM_AREA", label: "Problem Area" },
  { value: "PROPOSAL_VISIBLE", label: "Proposal Photo" },
  { value: "INTERNAL_ONLY", label: "Internal Only" },
];

export function PhotoUpload({ estimateId, photos, onUpdate }: PhotoUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("GENERAL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");

  async function saveCaption(photoId: string) {
    const res = await fetch(`/api/estimates/${estimateId}/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: captionDraft }),
    });
    if (res.ok) {
      onUpdate(photos.map((p) => (p.id === photoId ? { ...p, caption: captionDraft } : p)));
    }
    setEditingCaptionId(null);
  }

  async function handleDelete(photoId: string) {
    setDeletingId(photoId);
    try {
      const ok = await deletePhoto(estimateId, photoId);
      if (ok) {
        onUpdate(photos.filter((p) => p.id !== photoId));
        toast({ title: "Photo deleted" });
      } else {
        throw new Error();
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete photo", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        // Upload via UploadThing or fall back to base64 for demo
        let url: string;
        let key: string | undefined;

        if (process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID) {
          const { generateReactHelpers } = await import("@uploadthing/react");
          const { useUploadThing } = generateReactHelpers<any>();
          // Would use startUpload here
          url = URL.createObjectURL(file);
        } else {
          // Fallback: use object URL (won't persist)
          url = URL.createObjectURL(file);
        }

        // Save to DB
        const res = await fetch(`/api/estimates/${estimateId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, key, photoType: selectedType }),
        });

        if (res.ok) {
          const photo = await res.json();
          onUpdate([...photos, photo]);
        }
      }
      toast({ title: `${files.length} photo${files.length > 1 ? "s" : ""} added` });
    } catch {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const typeLabel = (type: string) => PHOTO_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHOTO_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><Camera className="w-4 h-4" /> Add Photos</>
            )}
          </div>
        </label>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No photos yet — add photos to document the job site</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
              <div className="aspect-square relative">
                <Image
                  src={photo.url}
                  alt={photo.caption || "Photo"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1.5">
                {editingCaptionId === photo.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={captionDraft}
                      onChange={(e) => setCaptionDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveCaption(photo.id); if (e.key === "Escape") setEditingCaptionId(null); }}
                      className="flex-1 bg-transparent outline-none text-xs min-w-0"
                      placeholder="Add caption..."
                    />
                    <button onClick={() => saveCaption(photo.id)} className="shrink-0 text-green-300 hover:text-green-200">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingCaptionId(null)} className="shrink-0 text-slate-300 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span
                      className="truncate cursor-pointer hover:text-blue-300 flex-1"
                      onClick={() => { setEditingCaptionId(photo.id); setCaptionDraft(photo.caption || ""); }}
                    >
                      {photo.caption || typeLabel(photo.photoType)}
                    </span>
                    <div className="flex gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => { setEditingCaptionId(photo.id); setCaptionDraft(photo.caption || ""); }}
                        className="text-blue-300 hover:text-blue-200"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(photo.id)}
                        disabled={deletingId === photo.id}
                        className="text-red-300 hover:text-red-200"
                      >
                        {deletingId === photo.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
