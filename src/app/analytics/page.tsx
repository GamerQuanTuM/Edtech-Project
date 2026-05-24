"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Brain, BarChart3, BookOpen, Trophy,
  Target, Zap, Users, Globe, TrendingUp, CheckCircle2,
  Loader2, Flame, GraduationCap, FileText, Award,
  PlayCircle, Circle
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

interface StudentOverview {
  totalPathways: number;
  totalNodes: number;
  completedNodes: number;
  inProgressNodes: number;
  notStartedNodes: number;
  overallProgress: number;
  totalQuizzesTaken: number;
  averageQuizScore: number;
  bestQuizScore: number;
  streak: number;
}

interface PathwayProgress {
  id: string;
  title: string;
  difficulty: string;
  progress: number;
  completedNodes: number;
  totalNodes: number;
  modules: number;
}

interface QuizAttemptEntry {
  quizTitle: string;
  score: number;
  createdAt: string;
}

interface StudentAnalytics {
  role: "STUDENT";
  overview: StudentOverview;
  pathwayProgress: PathwayProgress[];
  recentQuizAttempts: QuizAttemptEntry[];
  difficultyDistribution: Record<string, number>;
}

interface EducatorOverview {
  totalPathways: number;
  publishedPathways: number;
  draftPathways: number;
  totalEnrollments: number;
  totalQuizzesCreated: number;
  totalQuizAttempts: number;
  averageStudentScore: number;
  uniqueStudents: number;
}

interface PathwayStat {
  id: string;
  title: string;
  difficulty: string;
  isPublic: boolean;
  enrollments: number;
  modules: number;
  totalNodes: number;
  quizzesCreated: number;
  quizAttempts: number;
  averageScore: number | null;
  createdAt: string;
}

interface EducatorAnalytics {
  role: "EDUCATOR";
  overview: EducatorOverview;
  pathwayStats: PathwayStat[];
  topPathways: PathwayStat[];
  scoreDistribution: number[];
  recentActivity: QuizAttemptEntry[];
}

type AnalyticsData = StudentAnalytics | EducatorAnalytics;

// ─── Helpers ──────────────────────────────────────────────────────────────

const difficultyColor: Record<string, string> = {
  Beginner: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Intermediate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Advanced: "text-red-400 bg-red-400/10 border-red-400/20",
};


function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "violet",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    violet: "from-violet-500/20 to-violet-600/5 border-violet-500/20 text-violet-400",
    cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    yellow: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/20 text-yellow-400",
    red: "from-red-500/20 to-red-600/5 border-red-500/20 text-red-400",
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
  };
  const c = colorMap[color] || colorMap.violet;

  return (
    <div className={`glass rounded-2xl p-5 border bg-linear-to-br ${c}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-2 bg-zinc-800 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-linear-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function ScoreBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 w-16 text-right">{label}</span>
      <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 w-8">{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/analytics");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      console.error("Failed to fetch analytics");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-dvh bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 py-4 glass border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-px h-5 bg-zinc-700" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight gradient-text hidden sm:block">Aegis-AI</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          <span className="font-semibold text-white text-sm">Analytics</span>
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
            {data.role}
          </span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        {data.role === "STUDENT" ? (
          <StudentDashboard data={data} />
        ) : (
          <EducatorDashboard data={data} />
        )}
      </main>
    </div>
  );
}

// ─── Student Dashboard ───────────────────────────────────────────────────

function StudentDashboard({ data }: { data: StudentAnalytics }) {
  const { overview, pathwayProgress, recentQuizAttempts, difficultyDistribution } = data;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-violet-400" />
          Learning Analytics
        </h1>
        <p className="text-zinc-400 mt-1">Track your progress, quiz performance, and study habits</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Target} label="Overall Progress" value={`${overview.overallProgress}%`} sub={`${overview.completedNodes}/${overview.totalNodes} topics`} color="violet" />
        <StatCard icon={BookOpen} label="Pathways" value={overview.totalPathways} sub="learning paths" color="cyan" />
        <StatCard icon={Trophy} label="Avg Quiz Score" value={overview.totalQuizzesTaken > 0 ? `${overview.averageQuizScore}%` : "—"} sub={`${overview.totalQuizzesTaken} quizzes taken`} color="yellow" />
        <StatCard icon={Flame} label="Streak" value={`${overview.streak}d`} sub="consecutive days" color="red" />
      </div>

      {/* Node Status Breakdown */}
      <div className="glass rounded-2xl p-6 border border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Topic Progress Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-white">{overview.completedNodes}</p>
              <p className="text-xs text-zinc-400">Completed</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
            <PlayCircle className="w-5 h-5 text-violet-400" />
            <div>
              <p className="text-2xl font-bold text-white">{overview.inProgressNodes}</p>
              <p className="text-xs text-zinc-400">In Progress</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-500/5 border border-zinc-500/10">
            <Circle className="w-5 h-5 text-zinc-500" />
            <div>
              <p className="text-2xl font-bold text-white">{overview.notStartedNodes}</p>
              <p className="text-xs text-zinc-400">Not Started</p>
            </div>
          </div>
        </div>
        <ProgressBar value={overview.overallProgress} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pathway Progress */}
        <div className="glass rounded-2xl p-6 border border-zinc-800">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-400" />
            Pathway Progress
          </h2>
          {pathwayProgress.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No pathways yet. Generate one to get started!</p>
          ) : (
            <div className="space-y-4">
              {pathwayProgress.map((p) => (
                <Link
                  key={p.id}
                  href={`/pathways/${p.id}`}
                  className="block p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${difficultyColor[p.difficulty] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}>
                        {p.difficulty}
                      </span>
                      <span className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">
                        {p.title}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-zinc-300 shrink-0">{p.progress}%</span>
                  </div>
                  <ProgressBar value={p.progress} />
                  <p className="text-xs text-zinc-500 mt-2">
                    {p.completedNodes}/{p.totalNodes} topics · {p.modules} modules
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quiz History + Difficulty Distribution */}
        <div className="space-y-6">
          {/* Recent Quiz Attempts */}
          <div className="glass rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Recent Quiz Scores
            </h2>
            {recentQuizAttempts.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No quiz attempts yet.</p>
            ) : (
              <div className="space-y-2">
                {recentQuizAttempts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{a.quizTitle}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className={`text-lg font-bold shrink-0 ${a.score >= 80 ? "text-emerald-400" : a.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                      {a.score}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Difficulty Distribution */}
          <div className="glass rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Difficulty Spread
            </h2>
            {Object.keys(difficultyDistribution).length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(difficultyDistribution).map(([diff, count]) => (
                  <div key={diff} className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border w-24 text-center ${difficultyColor[diff] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}>
                      {diff}
                    </span>
                    <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${diff === "Beginner" ? "bg-emerald-500" : diff === "Intermediate" ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${(count / Math.max(...Object.values(difficultyDistribution))) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-zinc-300 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Best Score Badge */}
          {overview.bestQuizScore > 0 && (
            <div className="glass rounded-2xl p-6 border border-yellow-500/20 bg-linear-to-br from-yellow-500/5 to-transparent text-center">
              <Award className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
              <p className="text-3xl font-black text-white">{overview.bestQuizScore}%</p>
              <p className="text-xs text-zinc-400 mt-1">Personal Best Quiz Score</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Educator Dashboard ──────────────────────────────────────────────────

function EducatorDashboard({ data }: { data: EducatorAnalytics }) {
  const { overview, pathwayStats, topPathways, scoreDistribution, recentActivity } = data;
  const scoreLabels = ["0–20", "21–40", "41–60", "61–80", "81–100"];
  const maxBucket = Math.max(...scoreDistribution, 1);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-cyan-400" />
          Educator Analytics
        </h1>
        <p className="text-zinc-400 mt-1">Monitor student engagement, quiz performance, and pathway reach</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Total Pathways" value={overview.totalPathways} sub={`${overview.publishedPathways} published · ${overview.draftPathways} drafts`} color="violet" />
        <StatCard icon={Users} label="Enrollments" value={overview.totalEnrollments} sub={`${overview.uniqueStudents} unique students`} color="cyan" />
        <StatCard icon={Zap} label="Quizzes Created" value={overview.totalQuizzesCreated} sub={`${overview.totalQuizAttempts} total attempts`} color="emerald" />
        <StatCard icon={Trophy} label="Avg Student Score" value={overview.totalQuizAttempts > 0 ? `${overview.averageStudentScore}%` : "—"} sub="across all quizzes" color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="glass rounded-2xl p-6 border border-zinc-800">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            Student Score Distribution
          </h2>
          {overview.totalQuizAttempts === 0 ? (
            <p className="text-sm text-zinc-500 italic">No quiz attempts yet from students.</p>
          ) : (
            <div className="space-y-3">
              {scoreLabels.map((label, i) => (
                <ScoreBar key={label} label={label} value={scoreDistribution[i]} max={maxBucket} />
              ))}
            </div>
          )}
        </div>

        {/* Top Pathways by Enrollment */}
        <div className="glass rounded-2xl p-6 border border-zinc-800">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Top Pathways by Enrollment
          </h2>
          {topPathways.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No published pathways yet.</p>
          ) : (
            <div className="space-y-3">
              {topPathways.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/pathways/${p.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-cyan-300 transition-colors">
                      {p.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                      <span>{p.modules} modules</span>
                      <span>{p.totalNodes} topics</span>
                      {p.averageScore !== null && <span>avg: {p.averageScore}%</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-sm font-bold text-cyan-400">{p.enrollments}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Pathways Table */}
      <div className="glass rounded-2xl p-6 border border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-400" />
          All Pathways Overview
        </h2>
        {pathwayStats.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No pathways created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Pathway</th>
                  <th className="text-center py-3 px-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Status</th>
                  <th className="text-center py-3 px-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Modules</th>
                  <th className="text-center py-3 px-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Enrollments</th>
                  <th className="text-center py-3 px-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Quiz Attempts</th>
                  <th className="text-center py-3 px-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {pathwayStats.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 px-3">
                      <Link href={`/pathways/${p.id}`} className="flex items-center gap-2 group">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${difficultyColor[p.difficulty] ?? "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"}`}>
                          {p.difficulty.slice(0, 3)}
                        </span>
                        <span className="text-white font-medium truncate max-w-50 group-hover:text-violet-300 transition-colors">
                          {p.title}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {p.isPublic ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                          <Globe className="w-3 h-3" /> Live
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 uppercase">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-zinc-300">{p.modules}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-bold ${p.enrollments > 0 ? "text-cyan-400" : "text-zinc-500"}`}>
                        {p.enrollments}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-zinc-300">{p.quizAttempts}</td>
                    <td className="py-3 px-3 text-center">
                      {p.averageScore !== null ? (
                        <span className={`font-bold ${p.averageScore >= 80 ? "text-emerald-400" : p.averageScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                          {p.averageScore}%
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-2xl p-6 border border-zinc-800">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Recent Student Activity
        </h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No student activity yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.quizTitle}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className={`text-lg font-bold shrink-0 ml-3 ${a.score >= 80 ? "text-emerald-400" : a.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                  {a.score}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
