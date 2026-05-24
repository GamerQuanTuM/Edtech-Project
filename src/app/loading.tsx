import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-[#09090b] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
        <p className="text-sm text-zinc-400 animate-pulse">Loading…</p>
      </div>
    </div>
  );
}
