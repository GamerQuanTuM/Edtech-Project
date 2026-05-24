"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain, Plus, LogOut, BookOpen, Clock, Zap,
  ChevronRight, Sparkles, Loader2, X, ArrowRight, BarChart3, Trash2, AlertTriangle, Globe
} from "lucide-react";

interface Pathway {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: string;
  goal: string;
  isPublic: boolean;
  cloneCount: number;
  createdAt: string;
  modules: Array<{ id: string; status: string; nodes: Array<{ status: string }> }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [goal, setGoal] = useState("");
  const [background, setBackground] = useState("");
  const [genError, setGenError] = useState<string | null>(null);
  const [pathwayToDelete, setPathwayToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchPathways();
    fetch("/api/auth/me").then(r => r.json()).then(d => setUserRole(d.user?.role ?? null)).catch(() => {});
  }, []);

  async function fetchPathways() {
    try {
      const res = await fetch("/api/pathways");
      if (!res.ok) { router.push("/login"); return; }
      const data = await res.json();
      setPathways(data.pathways ?? []);
    } catch {
      console.error("Failed to fetch pathways");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  async function handleGenerate() {
    if (!goal.trim()) return;
    setIsGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/pathways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim(), userBackground: background.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setShowModal(false);
      setGoal("");
      setBackground("");
      setPathways((prev) => [data.pathway, ...prev]);
      router.push(`/pathways/${data.pathway.id}`);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDeletePathway(e: React.MouseEvent, id: string) {
    e.preventDefault();
    setPathwayToDelete(id);
  }

  async function confirmDelete() {
    if (!pathwayToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/pathways/${pathwayToDelete}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete pathway");
      setPathways((prev) => prev.filter((p) => p.id !== pathwayToDelete));
      setPathwayToDelete(null);
    } catch (err) {
      console.error("Failed to delete pathway:", err);
      alert("Failed to delete pathway");
    } finally {
      setIsDeleting(false);
    }
  }

  function getProgress(pathway: Pathway) {
    const allNodes = pathway.modules.flatMap((m) => m.nodes);
    if (allNodes.length === 0) return 0;
    const completed = allNodes.filter((n) => n.status === "COMPLETED").length;
    return Math.round((completed / allNodes.length) * 100);
  }

  const difficultyColor: Record<string, string> = {
    Beginner: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    Intermediate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    Advanced: "text-red-400 bg-red-400/10 border-red-400/20",
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 py-4 glass border-b border-zinc-800/50">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight gradient-text hidden sm:block">Aegis-AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/api-docs" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800/50">
            API Docs
          </Link>
          <button
            id="new-pathway-btn"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Pathway</span>
          </button>
          <div className="flex items-center gap-3">
            {userRole !== "EDUCATOR" && (
              <Link
                href="/discover"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Discover</span>
              </Link>
            )}
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Learning Pathways</h1>
          <p className="text-zinc-400 mt-1">
            {pathways.length === 0
              ? "Generate your first AI learning roadmap to get started"
              : `${pathways.length} active pathway${pathways.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl p-6 h-56">
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
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No pathways yet</h2>
            <p className="text-zinc-400 max-w-sm mb-6">
              Describe a learning goal and our AI will build a structured roadmap with resources and quizzes.
            </p>
            <button
              id="empty-state-cta"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/20"
            >
              <Plus className="w-4 h-4" />
              Generate my first pathway
            </button>
          </div>
        )}

        {/* Pathway Cards */}
        {!isLoading && pathways.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pathways.map((pathway, idx) => {
              const progress = getProgress(pathway);
              const totalNodes = pathway.modules.flatMap((m) => m.nodes).length;
              const completedNodes = pathway.modules
                .flatMap((m) => m.nodes)
                .filter((n) => n.status === "COMPLETED").length;

              return (
                <Link
                  key={pathway.id}
                  href={`/pathways/${pathway.id}`}
                  id={`pathway-card-${idx}`}
                  className="glass glass-hover rounded-2xl p-6 flex flex-col gap-4 group cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.05}s`, opacity: 0 }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${difficultyColor[pathway.difficulty] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}>
                          {pathway.difficulty}
                        </span>
                        {pathway.isPublic && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
                            <Globe className="w-3 h-3" /> Published
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-violet-200 transition-colors line-clamp-2">
                        {pathway.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDeletePathway(e, pathway.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete pathway"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{pathway.description}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {pathway.modules.length} modules
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {pathway.duration}
                    </span>
                    {pathway.isPublic && pathway.cloneCount > 0 && (
                      <span className="flex items-center gap-1 text-cyan-400 font-medium">
                        <Globe className="w-3.5 h-3.5" />
                        {pathway.cloneCount} students
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        Progress
                      </span>
                      <span>{completedNodes}/{totalNodes} topics</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Generate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-lg glass rounded-2xl p-8 border border-zinc-700/50 animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <h2 className="text-lg font-bold text-white">Generate Learning Pathway</h2>
              </div>
              <button
                id="close-modal"
                onClick={() => { setShowModal(false); setGenError(null); }}
                className="text-zinc-500 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {genError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {genError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="goal-input" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  What do you want to learn? *
                </label>
                <textarea
                  id="goal-input"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Learn Rust for systems programming coming from a Python background"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none text-sm"
                />
              </div>
              <div>
                <label htmlFor="background-input" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Your background (optional)
                </label>
                <textarea
                  id="background-input"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="e.g. I have 3 years of Python experience and know basic C"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                id="cancel-generate"
                onClick={() => { setShowModal(false); setGenError(null); }}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                id="confirm-generate"
                onClick={handleGenerate}
                disabled={isGenerating || !goal.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-linear-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>

            {isGenerating && (
              <p className="mt-3 text-center text-xs text-zinc-500">
                The LangGraph pipeline is analyzing your goal… this may take 15-30 seconds.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pathwayToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-sm glass rounded-2xl p-6 border border-zinc-700/50 animate-slide-in-right">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Delete Pathway?</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Are you sure you want to permanently delete this learning path? All associated modules, notes, and quiz history will be lost. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPathwayToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
