"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Building2, DollarSign, FileText, ImageIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@prisma/client";

interface Props {
  company: Company | null;
}

export function CompanySettings({ company }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: company?.name || "",
    phone: company?.phone || "",
    email: company?.email || "",
    website: company?.website || "",
    address: company?.address || "",
    city: company?.city || "",
    state: company?.state || "",
    zip: company?.zip || "",
    serviceArea: company?.serviceArea || "",
    licenseNumber: company?.licenseNumber || "",
    intakeFormSlug: company?.intakeFormSlug || "",
    googleReviewUrl: (company as any)?.googleReviewUrl || "",
    yelpReviewUrl: (company as any)?.yelpReviewUrl || "",
    webhookUrl: (company as any)?.webhookUrl || "",
    insuranceInfo: company?.insuranceInfo || "",
    defaultTerms: company?.defaultTerms || "",
    defaultPaymentTerms: company?.defaultPaymentTerms || "",
    depositPercentage: company?.depositPercentage?.toString() || "50",
    taxRate: company?.taxRate?.toString() || "0",
    taxEnabled: company?.taxEnabled || false,
    proposalFooter: company?.proposalFooter || "",
    logo: company?.logo || "",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo || null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          depositPercentage: parseFloat(form.depositPercentage),
          taxRate: parseFloat(form.taxRate),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Settings saved" });
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tabs defaultValue="company">
      <TabsList className="mb-6">
        <TabsTrigger value="company"><Building2 className="w-4 h-4 mr-1.5" /> Company Info</TabsTrigger>
        <TabsTrigger value="payment"><DollarSign className="w-4 h-4 mr-1.5" /> Payment</TabsTrigger>
        <TabsTrigger value="proposal"><FileText className="w-4 h-4 mr-1.5" /> Proposal</TabsTrigger>
      </TabsList>

      <TabsContent value="company">
        <Card>
          <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="w-20 h-20 border border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          setLogoPreview(dataUrl);
                          setForm((f) => ({ ...f, logo: dataUrl }));
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Logo
                    </div>
                  </label>
                  <p className="text-xs text-slate-500">PNG, JPG, SVG — shown on proposals</p>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => { setLogoPreview(null); setForm((f) => ({ ...f, logo: "" })); }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Company Name *</Label>
                <Input name="name" value={form.name} onChange={handleChange} placeholder="Phantom Coatings" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input name="phone" value={form.phone} onChange={handleChange} placeholder="(801) 555-0100" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" value={form.email} onChange={handleChange} placeholder="info@company.com" />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input name="website" value={form.website} onChange={handleChange} placeholder="www.company.com" />
              </div>
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input name="licenseNumber" value={form.licenseNumber} onChange={handleChange} placeholder="LIC-12345" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input name="address" value={form.address} onChange={handleChange} placeholder="123 Main St" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input name="city" value={form.city} onChange={handleChange} placeholder="Salt Lake City" />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input name="state" value={form.state} onChange={handleChange} placeholder="UT" />
              </div>
              <div className="space-y-2">
                <Label>ZIP</Label>
                <Input name="zip" value={form.zip} onChange={handleChange} placeholder="84101" />
              </div>
              <div className="space-y-2">
                <Label>Service Area</Label>
                <Input name="serviceArea" value={form.serviceArea} onChange={handleChange} placeholder="Salt Lake County, Utah County" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Insurance Info</Label>
                <Input name="insuranceInfo" value={form.insuranceInfo} onChange={handleChange} placeholder="Fully insured, $2M liability" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Customer Intake Form URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 whitespace-nowrap">/intake/</span>
                  <Input
                    name="intakeFormSlug"
                    value={form.intakeFormSlug}
                    onChange={handleChange}
                    placeholder="your-company-name"
                    className="flex-1"
                  />
                </div>
                {form.intakeFormSlug && (
                  <p className="text-xs text-blue-600">
                    Share this link with leads: {process.env.NEXT_PUBLIC_APP_URL || ""}/intake/{form.intakeFormSlug}
                  </p>
                )}
                <p className="text-xs text-slate-400">Customers fill out this form — their info and project details auto-create a draft estimate.</p>
              </div>
              <div className="space-y-2">
                <Label>Google Review URL</Label>
                <Input name="googleReviewUrl" value={form.googleReviewUrl} onChange={handleChange} placeholder="https://g.page/your-business/review" />
              </div>
              <div className="space-y-2">
                <Label>Yelp Review URL</Label>
                <Input name="yelpReviewUrl" value={form.yelpReviewUrl} onChange={handleChange} placeholder="https://www.yelp.com/biz/your-business" />
                <p className="text-xs text-slate-400">Used for post-job review request emails.</p>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Webhook URL (Zapier / Make)</Label>
                <Input name="webhookUrl" value={form.webhookUrl} onChange={handleChange} placeholder="https://hooks.zapier.com/hooks/catch/..." />
                <p className="text-xs text-slate-400">Fires a POST request with proposal data when a customer accepts a proposal.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payment">
        <Card>
          <CardHeader><CardTitle className="text-base">Payment Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deposit Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    name="depositPercentage"
                    value={form.depositPercentage}
                    onChange={handleChange}
                    placeholder="50"
                    className="w-24"
                  />
                  <span className="text-slate-500">%</span>
                </div>
                <p className="text-xs text-slate-500">Default deposit % for new estimates</p>
              </div>
              <div className="space-y-2">
                <Label>Tax Rate</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="taxEnabled"
                    name="taxEnabled"
                    checked={form.taxEnabled}
                    onChange={handleChange}
                  />
                  <label htmlFor="taxEnabled" className="text-sm">Enable tax</label>
                  <Input
                    type="number"
                    name="taxRate"
                    value={form.taxRate}
                    onChange={handleChange}
                    placeholder="8.1"
                    className="w-20"
                    disabled={!form.taxEnabled}
                  />
                  <span className="text-slate-500">%</span>
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Default Payment Terms</Label>
                <Textarea
                  name="defaultPaymentTerms"
                  value={form.defaultPaymentTerms}
                  onChange={handleChange}
                  placeholder="50% deposit due upon acceptance. 50% balance due upon completion."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="proposal">
        <Card>
          <CardHeader><CardTitle className="text-base">Proposal Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Terms & Conditions</Label>
              <Textarea
                name="defaultTerms"
                value={form.defaultTerms}
                onChange={handleChange}
                placeholder="All work is subject to our standard terms and conditions..."
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Proposal Footer</Label>
              <Textarea
                name="proposalFooter"
                value={form.proposalFooter}
                onChange={handleChange}
                placeholder="Thank you for choosing us. We look forward to working with you."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
          <Save className="mr-2 w-4 h-4" />
          Save Settings
        </Button>
      </div>
    </Tabs>
  );
}
