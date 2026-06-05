import Link from "next/link";
import { Building2, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-8 h-8 text-slate-400" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
        <p className="text-lg text-slate-600 mb-2">Page not found</p>
        <p className="text-sm text-slate-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            href="javascript:history.back()"
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </Link>
        </div>
      </div>
    </div>
  );
}
