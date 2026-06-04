import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; type?: string }>;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
        <p className="text-slate-600 mb-8">
          Thank you for your payment. Your contractor will be in touch shortly to confirm scheduling.
        </p>
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-left mb-6">
          <h2 className="font-semibold text-slate-900 mb-3">What happens next?</h2>
          <ol className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
              Your payment has been received and recorded
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
              Your contractor will confirm your scheduled date
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
              You'll receive a receipt via email
            </li>
          </ol>
        </div>
        <p className="text-sm text-slate-400">You may close this window.</p>
      </div>
    </div>
  );
}
