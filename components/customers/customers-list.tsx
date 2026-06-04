"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Search, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  projectAddress: string | null;
  leadSource: string | null;
  tags: string[];
  createdAt: string;
  _count: { projects: number };
}

interface Props {
  customers: Customer[];
}

export function CustomersList({ customers }: Props) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = Array.from(new Set(customers.flatMap((c) => c.tags))).sort();

  const filtered = customers.filter((c) => {
    if (activeTag && !c.tags.includes(activeTag)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.projectAddress?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, email, or address..."
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                activeTag === tag
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">No customers match &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600 hover:underline truncate block"
                    >
                      {customer.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {customer._count.projects} project{customer._count.projects !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" asChild className="shrink-0 ml-2">
                    <Link href={`/estimates/new?customerId=${customer.id}`}>+ Estimate</Link>
                  </Button>
                </div>
                <div className="space-y-1.5 text-sm text-slate-600">
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.projectAddress && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.projectAddress}</span>
                    </div>
                  )}
                </div>
                {customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {customer.tags.map((tag) => (
                      <span key={tag} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-3">Added {formatDate(customer.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {search && (
        <p className="text-xs text-slate-500 text-center">
          Showing {filtered.length} of {customers.length} customers
        </p>
      )}
    </div>
  );
}
