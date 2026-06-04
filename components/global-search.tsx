"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Users, X } from "lucide-react";

interface SearchResult {
  type: "estimate" | "customer";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
      setSelected(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      navigate(results[selected].href);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="hidden lg:flex items-center gap-2 text-slate-400 hover:text-white text-sm px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 w-full max-w-[200px]"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search customers, estimates..."
            className="flex-1 outline-none text-slate-900 placeholder:text-slate-400 text-sm"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {results.length > 0 && (
          <div className="max-h-72 overflow-y-auto py-2">
            {results.map((result, i) => (
              <button
                key={result.href}
                onClick={() => navigate(result.href)}
                onMouseEnter={() => setSelected(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${selected === i ? "bg-blue-50" : "hover:bg-slate-50"}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${result.type === "estimate" ? "bg-blue-100" : "bg-purple-100"}`}>
                  {result.type === "estimate"
                    ? <FileText className="w-4 h-4 text-blue-600" />
                    : <Users className="w-4 h-4 text-purple-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{result.title}</p>
                  <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {query && !loading && results.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">No results found</div>
        )}

        {loading && (
          <div className="py-10 text-center text-sm text-slate-400">Searching...</div>
        )}

        {!query && (
          <div className="py-8 text-center text-xs text-slate-400">
            Type to search customers and estimates<br />
            <span className="text-slate-300">↑↓ navigate · Enter to open · Esc to close</span>
          </div>
        )}
      </div>
    </div>
  );
}
