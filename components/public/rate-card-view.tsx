"use client";

import Link from "next/link";
import { Building2, Phone, Mail, Globe, MapPin, Shield, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  pricingType: string;
  minCharge: number;
  category: string;
}

interface Company {
  id: string;
  name: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  licenseNumber: string | null;
  insuranceInfo: string | null;
  accentColor: string | null;
  serviceArea: string | null;
  intakeFormSlug: string | null;
  services: Service[];
}

const PRICING_LABELS: Record<string, string> = {
  PER_SQFT: "per sq ft",
  PER_LINEAR_FT: "per linear ft",
  FLAT_RATE: "flat rate",
  HOURLY: "per hour",
};

const CATEGORY_LABELS: Record<string, string> = {
  EPOXY_GARAGE: "Epoxy Garage Floors",
  POLYASPARTIC: "Polyaspartic Coatings",
  FULL_FLAKE: "Full Flake Systems",
  METALLIC_EPOXY: "Metallic Epoxy",
  CONCRETE_STAIN: "Concrete Staining",
  CRACK_REPAIR: "Crack Repair",
  SURFACE_PREP: "Surface Preparation",
  SEALER: "Sealers & Topcoats",
  OTHER: "Other Services",
};

export function RateCardView({ company, slug }: { company: Company; slug: string }) {
  const accent = company.accentColor || "#2563eb";
  const intakeUrl = `/intake/${slug}`;

  const byCategory: Record<string, Service[]> = {};
  for (const svc of company.services) {
    if (!byCategory[svc.category]) byCategory[svc.category] = [];
    byCategory[svc.category].push(svc);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="text-white py-12 px-4" style={{ backgroundColor: accent }}>
        <div className="max-w-3xl mx-auto text-center">
          {company.logo ? (
            <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center p-2 mx-auto mb-4">
              <img src={company.logo} alt={company.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold mb-2">{company.name}</h1>
          {company.serviceArea && (
            <p className="text-white/80 flex items-center justify-center gap-1.5 text-sm">
              <MapPin className="w-3.5 h-3.5" /> Serving {company.serviceArea}
            </p>
          )}
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-white/80">
            {company.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{company.phone}</span>}
            {company.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{company.email}</span>}
            {company.website && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{company.website}</span>}
          </div>
          {(company.licenseNumber || company.insuranceInfo) && (
            <div className="flex items-center justify-center gap-3 mt-3 text-xs text-white/70">
              <Shield className="w-3.5 h-3.5" />
              {company.licenseNumber && <span>License #{company.licenseNumber}</span>}
              {company.insuranceInfo && <span>{company.insuranceInfo}</span>}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      {company.intakeFormSlug && (
        <div className="max-w-3xl mx-auto px-4 -mt-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Ready for a custom quote?</h2>
            <p className="text-slate-500 text-sm mb-4">Fill out our short form and we&apos;ll send you a detailed proposal — usually within 24 hours.</p>
            <Link
              href={intakeUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Get My Free Estimate <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="max-w-3xl mx-auto px-4 pb-12 space-y-8">
        {company.services.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            <p>No pricing available yet. Contact us for a quote.</p>
          </div>
        ) : (
          Object.entries(byCategory).map(([cat, services]) => (
            <div key={cat}>
              <h2 className="text-lg font-bold text-slate-900 mb-4">{CATEGORY_LABELS[cat] || cat}</h2>
              <div className="space-y-3">
                {services.map((svc) => (
                  <div key={svc.id} className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900">{svc.name}</p>
                        {svc.description && (
                          <p className="text-sm text-slate-500 mt-1">{svc.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-lg" style={{ color: accent }}>
                          {formatCurrency(svc.basePrice)}
                        </p>
                        <p className="text-xs text-slate-400">{PRICING_LABELS[svc.pricingType] || svc.pricingType}</p>
                        {svc.minCharge > 0 && (
                          <p className="text-xs text-slate-400">{formatCurrency(svc.minCharge)} minimum</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <p className="text-center text-xs text-slate-400">
          Prices are starting rates. Final pricing depends on project size, condition, and scope. Contact us for a free on-site estimate.
        </p>

        {company.intakeFormSlug && (
          <div className="text-center">
            <Link
              href={intakeUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm"
              style={{ backgroundColor: accent }}
            >
              Request a Free Quote <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
