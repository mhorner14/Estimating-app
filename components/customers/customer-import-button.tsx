"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function CustomerImportButton() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const csv = await file.text();
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
      if (data.created > 0) {
        toast({ title: `${data.created} customers imported` });
        router.refresh();
      }
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
        {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        Import CSV
      </Button>
      {result && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-4 min-w-64 text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-800">Import Complete</span>
            <button onClick={() => setResult(null)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
          </div>
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="w-3.5 h-3.5" />
            {result.created} customers created
          </div>
          {result.skipped > 0 && (
            <div className="text-slate-400 mt-1">{result.skipped} rows skipped (no name)</div>
          )}
          {result.errors.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-1.5 text-amber-600 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {result.errors.length} errors
              </div>
              <ul className="text-xs text-slate-500 space-y-0.5 max-h-24 overflow-y-auto">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3">
            Expected columns: name, email, phone, address, city, state, zip, lead_source, notes
          </p>
        </div>
      )}
    </div>
  );
}
