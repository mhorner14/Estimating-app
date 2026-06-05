import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function JobSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      project: { include: { customer: true } },
      lineItems: { include: { service: true }, orderBy: { sortOrder: "asc" } },
      company: { select: { name: true, phone: true, email: true } },
      photos: { where: { photoType: "BEFORE" }, take: 4, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!estimate) notFound();

  const c = estimate.project.customer;
  const address = estimate.project.address || c.projectAddress;
  const fullAddress = [address, c.city, c.state, c.zip].filter(Boolean).join(", ");

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-4 font-sans">
      {/* Print button — hidden when printing */}
      <div className="print:hidden mb-6 flex items-center justify-between">
        <a href={`/estimates/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Back to Estimate</a>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Job Work Order</h1>
            <p className="text-slate-500 text-sm mt-0.5">{estimate.company.name}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-900">{estimate.estimateNumber}</p>
            {estimate.scheduledDate && (
              <p className="text-sm text-slate-600 mt-0.5">
                <span className="font-medium">Scheduled:</span> {formatDate(estimate.scheduledDate)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Customer & Job Info */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Customer</h2>
          <p className="font-bold text-slate-900 text-lg">{c.name}</p>
          {c.phone && <p className="text-slate-600 text-sm mt-0.5">{c.phone}</p>}
          {c.email && <p className="text-slate-600 text-sm">{c.email}</p>}
          {fullAddress && <p className="text-slate-600 text-sm mt-1">{fullAddress}</p>}
        </div>
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Job Details</h2>
          <div className="space-y-1 text-sm">
            {estimate.squareFootage && <p><span className="text-slate-500">Sq Ft:</span> <span className="font-medium">{estimate.squareFootage.toLocaleString()}</span></p>}
            {estimate.colorSelection && <p><span className="text-slate-500">Color:</span> <span className="font-medium">{estimate.colorSelection}</span></p>}
            {estimate.surfaceCondition && <p><span className="text-slate-500">Surface:</span> <span className="font-medium">{estimate.surfaceCondition}</span></p>}
            {estimate.existingCoating && <p className="text-amber-700 font-medium">⚠ Existing coating — prep required</p>}
            {estimate.crackRepairNeeded && <p className="text-amber-700 font-medium">⚠ Crack repair needed</p>}
            {estimate.moistureConcerns && <p className="text-amber-700 font-medium">⚠ Moisture concerns noted</p>}
          </div>
        </div>
      </div>

      {/* Crew Notes */}
      {estimate.crewNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h2 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-2">Crew Notes / Special Instructions</h2>
          <p className="text-amber-900 text-sm whitespace-pre-wrap">{estimate.crewNotes}</p>
        </div>
      )}

      {/* Scope */}
      {estimate.prepSteps && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Prep Steps</h2>
          <p className="text-slate-700 text-sm whitespace-pre-wrap">{estimate.prepSteps}</p>
        </div>
      )}

      {/* Line Items */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Line Items</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 text-slate-600 font-medium">Description</th>
              <th className="text-right py-2 text-slate-600 font-medium w-20">Qty</th>
              <th className="text-right py-2 text-slate-600 font-medium w-24">Price</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lineItems.map((li: any) => (
              <tr key={li.id} className={`border-b border-slate-100 ${li.isOptional ? "text-slate-400 italic" : ""}`}>
                <td className="py-2">
                  {li.description}
                  {li.isOptional && <span className="ml-1 text-xs">(optional)</span>}
                </td>
                <td className="py-2 text-right">{Number(li.quantity)} {li.unit}</td>
                <td className="py-2 text-right">{formatCurrency(Number(li.totalPrice))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900">
              <td colSpan={2} className="py-2 font-bold text-right pr-4">Total</td>
              <td className="py-2 font-bold text-right">{formatCurrency(Number(estimate.totalAmount))}</td>
            </tr>
            {estimate.depositAmount > 0 && (
              <tr>
                <td colSpan={2} className="py-1 text-right text-slate-500 pr-4">Deposit</td>
                <td className="py-1 text-right text-slate-500">{formatCurrency(Number(estimate.depositAmount))}</td>
              </tr>
            )}
            {estimate.balanceDue > 0 && (
              <tr>
                <td colSpan={2} className="py-1 font-medium text-right pr-4">Balance Due</td>
                <td className="py-1 font-bold text-right text-amber-700">{formatCurrency(Number(estimate.balanceDue))}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Products */}
      {estimate.productsIncluded && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Products / Materials</h2>
          <p className="text-slate-700 text-sm whitespace-pre-wrap">{estimate.productsIncluded}</p>
        </div>
      )}

      {/* Before Photos */}
      {estimate.photos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Before Photos</h2>
          <div className="grid grid-cols-4 gap-2">
            {estimate.photos.map((p: any) => (
              <img key={p.id} src={p.url} alt={p.caption || "Before"} className="rounded aspect-square object-cover w-full" />
            ))}
          </div>
        </div>
      )}

      {/* Signature / Sign-off */}
      <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8">
        <div>
          <p className="text-xs text-slate-400 mb-6">Crew Lead Signature</p>
          <div className="border-b border-slate-400 w-full"></div>
          <p className="text-xs text-slate-400 mt-1">Date: _______________</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-6">Customer Signature (if required)</p>
          <div className="border-b border-slate-400 w-full"></div>
          <p className="text-xs text-slate-400 mt-1">Date: _______________</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:p-4 { padding: 1rem !important; }
        }
      `}</style>
    </div>
  );
}
