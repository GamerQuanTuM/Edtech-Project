import Link from "next/link";
import { ArrowRight, Sparkles, BookOpen, Brain, Zap, ChevronRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-150 h-150 rounded-full bg-violet-500/5 blur-[120px]" />
        <div className="absolute -top-20 right-0 w-100 h-100 rounded-full bg-cyan-500/5 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-200 h-75 rounded-full bg-violet-500/4 blur-[100px]" />
      </div>

      {/* Grid background */}
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-40" aria-hidden="true" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 glass border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight gradient-text">Aegis-AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            id="nav-login"
            className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-zinc-800/50"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            id="nav-register"
            className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/20 font-medium"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="flex flex-col items-center text-center px-6 pt-24 pb-16 md:pt-36 md:pb-24">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-8 animate-fade-in-up">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by LangGraph
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] max-w-4xl animate-fade-in-up" style={{ animationDelay: "0.1s", opacity: 0 }}>
            Learn anything with a{" "}
            <span className="gradient-text">personalized AI roadmap</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
            Describe your learning goal and background. Aegis-AI generates a detailed,
            structured learning pathway — with curated resources, progress tracking,
            study notes, and AI-graded quizzes.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-10 animate-fade-in-up" style={{ animationDelay: "0.3s", opacity: 0 }}>
            <Link
              href="/register"
              id="hero-cta-primary"
              className="group flex items-center gap-2 bg-linear-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/25 hover:-translate-y-0.5"
            >
              Start learning for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/api-docs"
              id="hero-cta-docs"
              className="flex items-center gap-2 text-zinc-400 hover:text-white font-medium px-6 py-3.5 rounded-xl border border-zinc-700/50 hover:border-zinc-600 transition-all duration-200 hover:bg-zinc-800/30"
            >
              Explore API docs
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="px-6 md:px-12 pb-24 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="glass glass-hover rounded-2xl p-6 animate-fade-in-up"
                style={{ animationDelay: `${0.4 + idx * 0.1}s`, opacity: 0 }}
              >
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow Steps */}
        <section className="px-6 md:px-12 pb-24 max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">How it works</h2>
          <p className="text-zinc-400 mb-12">From a single goal to a complete structured curriculum in seconds</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={step.title} className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-violet-500/20">
                  {idx + 1}
                </div>
                <h3 className="font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-zinc-400">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="px-6 md:px-12 pb-24 max-w-3xl mx-auto">
          <div className="glass rounded-3xl p-10 text-center border border-violet-500/20 bg-linear-to-br from-violet-500/5 to-cyan-500/5">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Ready to master your next skill?
            </h2>
            <p className="text-zinc-400 mb-8">
              Join students and educators using Aegis-AI to navigate complex topics systematically.
            </p>
            <Link
              href="/register"
              id="footer-cta"
              className="inline-flex items-center gap-2 bg-white text-zinc-900 font-bold px-8 py-3.5 rounded-xl hover:bg-zinc-100 transition-all duration-200 hover:shadow-xl"
            >
              Get started — it&apos;s free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/50 px-6 md:px-12 py-6 text-center text-sm text-zinc-600">
        © 2026 Aegis-AI · Built with Next.js 16, LangGraph & Prisma
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Sparkles,
    title: "AI Pathway Generation",
    description:
      "LangGraph multi-agent pipeline validates and refines your syllabus across 3 intelligent nodes before saving — ensuring quality every time.",
  },
  {
    icon: BookOpen,
    title: "Interactive Study Workspace",
    description:
      "Track progress node-by-node, write rich markdown study notes, access curated resources, and view your completion analytics.",
  },
  {
    icon: Zap,
    title: "Dynamic AI Quizzes",
    description:
      "Auto-generate 5-question assessments per module with instant scoring, per-question explanations, and attempt history.",
  },
];

const steps = [
  {
    title: "Describe your goal",
    description: "Tell Aegis-AI what you want to learn and your current background knowledge.",
  },
  {
    title: "AI builds your roadmap",
    description:
      "The LangGraph pipeline generates a validated, structured curriculum with real curated resources.",
  },
  {
    title: "Learn & get tested",
    description:
      "Work through your roadmap, write study notes, track progress, and take AI-graded quizzes per module.",
  },
];
