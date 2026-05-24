"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain, ArrowLeft, BookOpen, Clock, Globe, Loader2, Sparkles, User, ChevronRight, Copy, Search
} from "lucide-react";

interface PublicPathway {
  id: string;
  title: string;
  description: string;
  goal: string;
  difficulty: string;
  duration: string;
  creatorName: string;
  moduleCount: number;
  nodeCount: number;
  cloneCount: number;
}

const difficultyColor: Record<string, string> = {
  Beginner: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Intermediate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Advanced: "text-red-400 bg-red-400/10 border-red-400/20",
};

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="text-cyan-400 bg-cyan-400/10 rounded px-0.5">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function DiscoverPage() {
  const router = useRouter();
  const [pathways, setPathways] = useState<PublicPathway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchDiscover(debouncedSearch);
  }, [debouncedSearch]);

  async function fetchDiscover(query: string = "") {
    setIsLoading(true);
    try {
      const url = query.trim() ? `/api/discover?search=${encodeURIComponent(query)}` : "/api/discover";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPathways(data.pathways || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEnroll(e: React.MouseEvent, id: string) {
    e.preventDefault();
    if (cloningId) return;
    
    setCloningId(id);
    try {
      const res = await fetch(`/api/pathways/${id}/clone`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to clone");
      const data = await res.json();
      router.push(`/pathways/${data.pathway.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to enroll in this pathway.");
      setCloningId(null);
    }
  }

  return (
    <div className="min-h-dvh bg-background p-6 lg:p-12 font-sans relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="w-10 h-10 rounded-xl glass flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Globe className="w-8 h-8 text-cyan-400" />
                Discover Catalog
              </h1>
              <p className="text-zinc-400 mt-1">Browse and enroll in AI learning pathways published by expert educators</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pathways by title (e.g., Typescript)..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-zinc-600 shadow-inner"
            />
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass rounded-2xl p-6 h-64">
                <div className="shimmer h-4 w-2/3 rounded mb-3" />
                <div className="shimmer h-3 w-full rounded mb-2" />
                <div className="shimmer h-3 w-4/5 rounded mb-6" />
                <div className="shimmer h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && pathways.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-up border border-dashed border-zinc-800 rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No published pathways found</h2>
            <p className="text-zinc-400 max-w-sm mb-6">
              Educators haven't published any pathways yet. Check back soon for new learning opportunities!
            </p>
          </div>
        )}

        {/* Catalog Grid */}
        {!isLoading && pathways.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pathways.map((pathway, idx) => (
              <div
                key={pathway.id}
                className="glass rounded-3xl p-6 flex flex-col gap-4 group animate-fade-in-up border border-zinc-800 hover:border-zinc-700/80 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-900/10"
                style={{ animationDelay: `${idx * 0.05}s`, opacity: 0, animationFillMode: "forwards" }}
              >
                {/* Creator Badge */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <User className="w-3 h-3 text-violet-300" />
                  </div>
                  <span className="text-xs text-zinc-400 font-medium">By {pathway.creatorName}</span>
                </div>

                {/* Title & Difficulty */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${difficultyColor[pathway.difficulty] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}>
                      {pathway.difficulty}
                    </span>
                    {pathway.cloneCount > 0 && (
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3 h-3" /> {pathway.cloneCount} Enrolled
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug group-hover:text-cyan-300 transition-colors">
                    <HighlightedText text={pathway.title} highlight={debouncedSearch} />
                  </h3>
                </div>

                <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed flex-1">
                  {pathway.description}
                </p>

                {/* Meta stats */}
                <div className="flex items-center gap-4 text-xs text-zinc-500 py-3 border-t border-zinc-800/50">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-violet-400" />
                    {pathway.moduleCount} modules
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    {pathway.duration}
                  </span>
                </div>

                {/* Enroll CTA */}
                <button
                  onClick={(e) => handleEnroll(e, pathway.id)}
                  disabled={!!cloningId}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-cyan-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 group/btn"
                >
                  {cloningId === pathway.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cloning to Dashboard...
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 group-hover/btn:hidden" />
                      <ChevronRight className="w-4 h-4 hidden group-hover/btn:block" />
                      Enroll Now
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
