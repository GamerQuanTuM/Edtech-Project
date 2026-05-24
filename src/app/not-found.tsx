import Link from "next/link";
import { Brain, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6">
        <Brain className="w-8 h-8 text-violet-400" />
      </div>
      <h1 className="text-6xl font-black gradient-text mb-3">404</h1>
      <h2 className="text-xl font-semibold text-white mb-2">Page not found</h2>
      <p className="text-zinc-400 text-sm max-w-sm mb-8">
        This page doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
      </p>
      <Link
        href="/dashboard"
        id="not-found-home"
        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/20 text-sm"
      >
        <Home className="w-4 h-4" />
        Back to dashboard
      </Link>
    </div>
  );
}
