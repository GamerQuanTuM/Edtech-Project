"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain, ArrowLeft, CheckCircle2, Circle, PlayCircle,
  BookOpen, Clock, ExternalLink, ChevronDown, ChevronUp,
  FileText, Zap, Loader2, X, Trophy, RotateCcw, CheckCheck,
  Globe, Lock, Edit3, Plus, Trash2, Save, ClipboardList
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Resource { name: string; url: string; type: string }
interface ModuleNode {
  id: string; title: string; summary: string;
  durationMinutes: number; status: string;
  resources: Resource[]; studyNotes: string;
}
interface QuizQuestion {
  question: string; choices: string[];
  correctAnswer: string; explanation: string;
}
interface QuizAttempt { score: number; feedback: string; answers: Record<string, string> }
interface Quiz { id: string; title: string; questions: QuizQuestion[]; attempts: QuizAttempt[] }
interface Module {
  id: string; title: string; description: string;
  orderIndex: number; status: string;
  nodes: ModuleNode[]; quiz: Quiz | null;
}
interface Pathway {
  id: string; title: string; description: string;
  goal: string; difficulty: string; duration: string;
  isPublic: boolean;
  modules: Module[];
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function PathwayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [pathway, setPathway] = useState<Pathway | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<ModuleNode | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizAttempt | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<string | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  const [isEditingResources, setIsEditingResources] = useState(false);
  const [editingResourcesList, setEditingResourcesList] = useState<Resource[]>([]);
  const [isSavingResources, setIsSavingResources] = useState(false);
  const [publishError, setPublishError] = useState<{ message: string; modules: { id: string; title: string }[] } | null>(null);

  // Educator quiz management
  const [isManagingQuiz, setIsManagingQuiz] = useState(false);
  const [managingQuizModule, setManagingQuizModule] = useState<Module | null>(null);
  const [managingQuizQuestions, setManagingQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [editingQuestionDraft, setEditingQuestionDraft] = useState<QuizQuestion | null>(null);

  useEffect(() => {
    fetchPathway();
  }, [id]);

  async function fetchPathway() {
    try {
      const res = await fetch(`/api/pathways/${id}`);
      if (!res.ok) { router.push("/dashboard"); return; }
      const data = await res.json();
      setPathway(data.pathway);
      setIsOwner(data.isOwner);
      setUserRole(data.userRole);
      if (data.pathway.modules[0]) setExpandedModule(data.pathway.modules[0].id);
    } catch { router.push("/dashboard"); }
    finally { setIsLoading(false); }
  }

  async function updateNodeStatus(nodeId: string, status: string) {
    // Optimistic UI update
    setPathway((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map(m => ({
          ...m,
          nodes: m.nodes.map(n => n.id === nodeId ? { ...n, status } : n)
        }))
      };
    });
    if (activeNode?.id === nodeId) {
      setActiveNode((prev) => prev ? { ...prev, status } : null);
    }

    // Background sync
    await fetch(`/api/pathways/nodes/${nodeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function saveNotes(notesToSave?: string) {
    if (!activeNode) return;
    const value = notesToSave ?? notesValue;
    setIsSavingNotes(true);

    // Optimistic UI update
    setActiveNode((prev) => prev ? { ...prev, studyNotes: value } : null);
    setPathway((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map(m => ({
          ...m,
          nodes: m.nodes.map(n => n.id === activeNode.id ? { ...n, studyNotes: value } : n)
        }))
      };
    });

    try {
      await fetch(`/api/pathways/nodes/${activeNode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyNotes: value }),
      });
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function saveResources() {
    if (!activeNode) return;
    setIsSavingResources(true);

    // Optimistic UI
    setActiveNode(prev => prev ? { ...prev, resources: editingResourcesList } : null);
    setPathway((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map(m => ({
          ...m,
          nodes: m.nodes.map(n => n.id === activeNode.id ? { ...n, resources: editingResourcesList } : n)
        }))
      };
    });

    try {
      await fetch(`/api/pathways/nodes/${activeNode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resources: editingResourcesList }),
      });
      setIsEditingResources(false);
    } finally {
      setIsSavingResources(false);
    }
  }

  function startEditingResources() {
    if (!activeNode) return;
    setEditingResourcesList((activeNode.resources as Resource[]) || []);
    setIsEditingResources(true);
  }

  // Auto-save notes debounce
  useEffect(() => {
    if (!activeNode || notesValue === activeNode.studyNotes) return;
    const timeoutId = setTimeout(() => {
      saveNotes(notesValue);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [notesValue, activeNode]);

  async function generateQuiz(moduleId: string) {
    setIsGeneratingQuiz(moduleId);
    try {
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      });
      const data = await res.json();
      if (res.ok) {
        // Mark this module as having a quiz in local state (clears publish warning)
        const updatedModule = pathway?.modules.find(m => m.id === moduleId);
        const newModule = updatedModule ? { ...updatedModule, quiz: data.quiz } : null;

        setPathway(prev => prev ? {
          ...prev,
          modules: prev.modules.map(m =>
            m.id === moduleId ? { ...m, quiz: data.quiz } : m
          )
        } : null);
        setPublishError(prev => {
          if (!prev) return null;
          const remaining = prev.modules.filter(m => m.id !== moduleId);
          return remaining.length > 0 ? { ...prev, modules: remaining } : null;
        });

        // Educators: open the manage modal instead of the quiz view
        if (isOwner && userRole === "EDUCATOR" && newModule) {
          setManagingQuizModule(newModule);
          setManagingQuizQuestions([...(data.quiz.questions as QuizQuestion[])]);
          setIsManagingQuiz(true);
        } else {
          setActiveQuiz(data.quiz);
          setQuizAnswers({});
          setQuizResult(null);
        }
      }
    } finally {
      setIsGeneratingQuiz(null);
    }
  }

  async function submitQuiz() {
    if (!activeQuiz) return;
    setIsSubmittingQuiz(true);
    try {
      const res = await fetch("/api/ai/quiz", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: activeQuiz.id, answers: quizAnswers }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuizResult({
          score: data.score,
          feedback: data.attempt.feedback,
          answers: quizAnswers,
        });
      }
    } finally {
      setIsSubmittingQuiz(false);
    }
  }

  async function togglePublish() {
    if (!pathway) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/pathways/${pathway.id}/publish`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) {
        setPathway(prev => prev ? { ...prev, isPublic: data.isPublic } : null);
      } else if (res.status === 400 && data.missingQuizModules) {
        setPublishError({ message: data.error, modules: data.missingQuizModules });
      }
    } finally {
      setIsPublishing(false);
    }
  }

  function openManageQuiz(module: Module) {
    setManagingQuizModule(module);
    setManagingQuizQuestions(module.quiz ? JSON.parse(JSON.stringify(module.quiz.questions)) : []);
    setIsManagingQuiz(true);
    // Clear node/quiz view to show the management workspace
    setActiveNode(null);
    setActiveQuiz(null);
  }

  function startEditQuestion(idx: number) {
    setEditingQuestionIdx(idx);
    setEditingQuestionDraft(JSON.parse(JSON.stringify(managingQuizQuestions[idx])));
  }

  function confirmEditQuestion() {
    if (editingQuestionDraft === null || editingQuestionIdx === null) return;
    const updated = [...managingQuizQuestions];
    updated[editingQuestionIdx] = editingQuestionDraft;
    setManagingQuizQuestions(updated);
    setEditingQuestionIdx(null);
    setEditingQuestionDraft(null);
  }

  function addNewQuestion() {
    setEditingQuestionIdx(managingQuizQuestions.length);
    setEditingQuestionDraft({ question: "", choices: ["", "", "", ""], correctAnswer: "", explanation: "" });
  }

  async function saveQuizQuestions() {
    if (!managingQuizModule?.quiz) return;
    setIsSavingQuiz(true);
    try {
      const res = await fetch("/api/ai/quiz", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: managingQuizModule.quiz.id, questions: managingQuizQuestions }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update the pathway state so the sidebar count updates
        setPathway(prev => prev ? {
          ...prev,
          modules: prev.modules.map(m =>
            m.id === managingQuizModule.id
              ? { ...m, quiz: data.quiz }
              : m
          )
        } : null);
        // Refresh the modal in-place so the saved questions appear immediately
        setManagingQuizModule(prev => prev ? { ...prev, quiz: data.quiz } : null);
        setManagingQuizQuestions(JSON.parse(JSON.stringify(data.quiz.questions)));
      }
    } finally {
      setIsSavingQuiz(false);
    }
  }

  function openNode(node: ModuleNode) {
    setActiveNode(node);
    setNotesValue(node.studyNotes ?? "");
  }

  const statusIcon = (s: string) => {
    if (s === "COMPLETED") return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    if (s === "IN_PROGRESS") return <PlayCircle className="w-4 h-4 text-violet-400 shrink-0" />;
    return <Circle className="w-4 h-4 text-zinc-600 shrink-0" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!pathway) return null;

  const totalNodes = pathway.modules.flatMap((m) => m.nodes).length;
  const completedNodes = pathway.modules.flatMap((m) => m.nodes).filter((n) => n.status === "COMPLETED").length;
  const overallProgress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 glass border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-px h-5 bg-zinc-700" />
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-400" />
            <span className="font-semibold text-white text-sm truncate max-w-xs">{pathway.title}</span>
            {pathway.isPublic && (
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Published
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          {isOwner && userRole === "EDUCATOR" && (
            <button
              onClick={togglePublish}
              disabled={isPublishing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                pathway.isPublic
                  ? "bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                  : "bg-violet-600 hover:bg-violet-500 text-white border-transparent"
              } disabled:opacity-50`}
            >
              {isPublishing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : pathway.isPublic ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              {pathway.isPublic ? "Make Private" : "Publish to Catalog"}
            </button>
          )}
          {userRole !== "EDUCATOR" && (
            <div className="hidden md:flex items-center gap-3">
              <span>{overallProgress}% complete</span>
              <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Publish error banner */}
      {publishError && isOwner && userRole === "EDUCATOR" && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-start gap-3">
          <span className="text-amber-400 text-lg leading-none mt-0.5">⚠</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-300">Cannot publish yet</p>
            <p className="text-amber-400/80 mt-0.5">Generate an AI quiz for each module before publishing:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {publishError.modules.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setExpandedModule(m.id)}
                  className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                >
                  {m.title}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setPublishError(null)} className="text-amber-500 hover:text-amber-300 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Module Navigator */}
        <aside className="w-72 lg:w-80 shrink-0 border-r border-zinc-800/50 overflow-y-auto hidden md:block">
          <div className="p-4">
            <div className="mb-4 p-4 glass rounded-xl border border-zinc-800">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Goal</h2>
              <p className="text-sm text-white leading-snug">{pathway.goal}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{pathway.duration}</span>
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{pathway.modules.length} modules</span>
              </div>
            </div>

            {/* Module List */}
            <div className="space-y-2">
              {pathway.modules.map((module, modIdx) => {
                const isExpanded = expandedModule === module.id;
                const moduleCompleted = module.nodes.every((n) => n.status === "COMPLETED");
                const moduleInProgress = module.nodes.some((n) => n.status !== "NOT_STARTED") && !moduleCompleted;

                return (
                  <div key={module.id} className="rounded-xl overflow-hidden border border-zinc-800/50">
                    {/* Module Header */}
                    <button
                      id={`module-toggle-${modIdx}`}
                      onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${moduleCompleted ? "bg-emerald-500/20 text-emerald-400" : moduleInProgress ? "bg-violet-500/20 text-violet-400" : "bg-zinc-800 text-zinc-400"}`}>
                          {modIdx + 1}
                        </div>
                        <span className="text-sm font-medium text-white truncate">{module.title}</span>
                        {isOwner && userRole === "EDUCATOR" && !module.quiz && (
                          <span className="ml-auto shrink-0 w-2 h-2 rounded-full bg-amber-400" title="Quiz required to publish" />
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
                    </button>

                    {/* Nodes list */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800/50 bg-zinc-900/30">
                        {module.nodes.map((node, nodeIdx) => (
                          <button
                            key={node.id}
                            id={`node-${modIdx}-${nodeIdx}`}
                            onClick={() => openNode(node)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-zinc-800/40 transition-colors ${activeNode?.id === node.id ? "bg-violet-500/10 border-l-2 border-violet-500" : ""}`}
                          >
                            {statusIcon(node.status)}
                            <span className="text-xs text-zinc-300 truncate">{node.title}</span>
                          </button>
                        ))}

                        {/* Quiz button — context-aware per role */}
                        {isOwner && userRole === "EDUCATOR" ? (
                          // Educator: if quiz exists show Manage Questions, else Generate
                          module.quiz ? (
                            <button
                              id={`quiz-btn-${modIdx}`}
                              onClick={() => openManageQuiz(module)}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-cyan-500/10 transition-colors border-t border-zinc-800/30 text-cyan-400"
                            >
                              <ClipboardList className="w-4 h-4 shrink-0" />
                              <span className="text-xs font-medium">View Questions ({(module.quiz.questions as QuizQuestion[]).length})</span>
                            </button>
                          ) : (
                            <button
                              id={`quiz-btn-${modIdx}`}
                              onClick={() => generateQuiz(module.id)}
                              disabled={!!isGeneratingQuiz}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-violet-500/10 transition-colors border-t border-zinc-800/30 text-violet-400 disabled:opacity-50"
                            >
                              {isGeneratingQuiz === module.id ? (
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                              ) : (
                                <Zap className="w-4 h-4 shrink-0" />
                              )}
                              <span className="text-xs font-medium">Generate AI Quiz</span>
                            </button>
                          )
                        ) : (
                          // Student: View quiz if exists, else generate their own
                          <button
                            id={`quiz-btn-${modIdx}`}
                            onClick={() => generateQuiz(module.id)}
                            disabled={!!isGeneratingQuiz}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-violet-500/10 transition-colors border-t border-zinc-800/30 text-violet-400 disabled:opacity-50"
                          >
                            {isGeneratingQuiz === module.id ? (
                              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            ) : (
                              <Zap className="w-4 h-4 shrink-0" />
                            )}
                            <span className="text-xs font-medium">
                              {module.quiz ? "Take quiz" : "Generate AI quiz"}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {!activeNode && !activeQuiz && !isManagingQuiz && (
            <div className="max-w-2xl mx-auto text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Select a topic to study</h2>
              <p className="text-zinc-400 text-sm">
                Choose a module and topic from the left sidebar to start learning.
                Track your progress, write notes, and take quizzes per module.
              </p>
            </div>
          )}

          {/* Educator: Quiz Management Workspace */}
          {isManagingQuiz && managingQuizModule && (
            <div className="max-w-3xl mx-auto animate-fade-in-up">
              {/* Header */}
              <div className="glass rounded-2xl p-6 mb-4 border border-zinc-800">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Quiz · {managingQuizModule.title}</p>
                    <h2 className="text-xl font-bold text-white">{managingQuizModule.quiz?.title ?? "Quiz Questions"}</h2>
                    <p className="text-sm text-zinc-400 mt-1">{managingQuizQuestions.length} question{managingQuizQuestions.length !== 1 ? "s" : ""} · AI-generated + custom</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={addNewQuestion}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Question
                    </button>
                    <button
                      onClick={saveQuizQuestions}
                      disabled={isSavingQuiz || managingQuizQuestions.length === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50"
                    >
                      {isSavingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save All
                    </button>
                    <button onClick={() => setIsManagingQuiz(false)} className="p-2 text-zinc-400 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Question List */}
              <div className="space-y-3">
                {managingQuizQuestions.length === 0 && (
                  <div className="glass rounded-2xl p-12 text-center border border-zinc-800">
                    <p className="text-zinc-500 text-sm">No questions yet. Click "Add Question" to get started.</p>
                  </div>
                )}
                {managingQuizQuestions.map((q, idx) => (
                  <div key={idx} className="glass rounded-2xl border border-zinc-800 p-5 group">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                        <p className="text-white font-medium text-sm leading-snug">{q.question || <span className="text-zinc-500 italic">No question text</span>}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => startEditQuestion(idx)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="Edit question"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setManagingQuizQuestions(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {q.choices.map((c, ci) => (
                        <div key={ci} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                          c === q.correctAnswer
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                            : "bg-zinc-800/50 border border-zinc-700/50 text-zinc-400"
                        }`}>
                          {c === q.correctAnswer && <CheckCheck className="w-3 h-3 shrink-0" />}
                          <span className="truncate">{c || <em className="opacity-50">Empty</em>}</span>
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="mt-2 text-xs text-zinc-500 italic">💡 {q.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Node Study Workspace */}
          {activeNode && !activeQuiz && (
            <div className="max-w-3xl mx-auto animate-fade-in-up">
              {/* Node Header */}
              <div className="glass rounded-2xl p-6 mb-4 border border-zinc-800">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-xl font-bold text-white">{activeNode.title}</h2>
                  <div className="flex items-center gap-2 shrink-0">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">{activeNode.durationMinutes} min</span>
                  </div>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-4">{activeNode.summary}</p>

                {/* Status controls — students only */}
                {!(isOwner && userRole === "EDUCATOR") && (
                  <div className="flex flex-wrap gap-2">
                    {(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const).map((s) => (
                      <button
                        key={s}
                        id={`status-${s.toLowerCase().replace("_", "-")}`}
                        onClick={() => updateNodeStatus(activeNode.id, s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeNode.status === s
                          ? s === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : s === "IN_PROGRESS" ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                              : "bg-zinc-700 text-zinc-300 border border-zinc-600"
                          : "bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:border-zinc-600"}`}
                      >
                        {s === "COMPLETED" ? <CheckCheck className="w-3 h-3" /> : s === "IN_PROGRESS" ? <PlayCircle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Resources */}
              <div className="glass rounded-2xl p-6 mb-4 border border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                    Learning Resources
                  </h3>
                  {isOwner && userRole === "EDUCATOR" && (
                    <button
                      onClick={startEditingResources}
                      className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Resources
                    </button>
                  )}
                </div>

                {(!activeNode.resources || (activeNode.resources as Resource[]).length === 0) ? (
                  <p className="text-sm text-zinc-500 italic">No resources added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(activeNode.resources as Resource[]).map((r, idx) => (
                      <a
                        key={idx}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                          <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors truncate">{r.name}</p>
                          <p className="text-xs text-zinc-500 capitalize">{r.type}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Study Notes — students only */}
              {!(isOwner && userRole === "EDUCATOR") && (
                <div className="glass rounded-2xl p-6 border border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-violet-400" />
                      Study Notes
                    </h3>
                    <button
                      id="save-notes-btn"
                      onClick={() => saveNotes()}
                      disabled={isSavingNotes}
                      className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
                    >
                      {isSavingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      {isSavingNotes ? "Saving…" : "Save notes"}
                    </button>
                  </div>
                  <textarea
                    id="study-notes-textarea"
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Write your notes, key insights, and summaries here… (Markdown supported)"
                    rows={10}
                    className="w-full bg-zinc-900/60 rounded-xl border border-zinc-700/50 p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 resize-none font-mono leading-relaxed transition-all"
                  />
                </div>
              )}
            </div>
          )}

          {/* Quiz Workspace */}
          {activeQuiz && (
            <div className="max-w-3xl mx-auto animate-fade-in-up">
              <div className="glass rounded-2xl p-6 border border-zinc-800 mb-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-violet-400" />
                    <h2 className="text-lg font-bold text-white">{activeQuiz.title}</h2>
                  </div>
                  <button
                    id="close-quiz"
                    onClick={() => { setActiveQuiz(null); setQuizResult(null); setQuizAnswers({}); }}
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {quizResult ? (
                  /* Results View */
                  <div>
                    <div className="text-center mb-6 p-6 rounded-xl bg-linear-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20">
                      <Trophy className={`w-12 h-12 mx-auto mb-3 ${quizResult.score >= 80 ? "text-yellow-400" : quizResult.score >= 60 ? "text-zinc-300" : "text-zinc-500"}`} />
                      <div className="text-4xl font-black text-white mb-1">{quizResult.score}%</div>
                      <p className="text-zinc-400 text-sm">
                        {quizResult.score >= 80 ? "Excellent work! 🎉" : quizResult.score >= 60 ? "Good effort! Keep going." : "Keep practicing — you've got this!"}
                      </p>
                    </div>

                    <div className="space-y-3 text-sm text-zinc-300">
                      {quizResult.feedback.split("\n").map((line, i) => (
                        <div key={i} className={`p-3 rounded-lg ${line.startsWith("✓") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-300"}`}>
                          {line}
                        </div>
                      ))}
                    </div>

                    <button
                      id="retake-quiz-btn"
                      onClick={() => { setQuizResult(null); setQuizAnswers({}); }}
                      className="mt-6 w-full flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white py-2.5 rounded-xl transition-all text-sm font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retake quiz
                    </button>
                  </div>
                ) : (
                  /* Quiz Questions */
                  <div className="space-y-6">
                    {activeQuiz.questions.map((q, qi) => (
                      <div key={qi} className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <p className="text-sm font-semibold text-white mb-4">
                          <span className="text-violet-400 mr-2">Q{qi + 1}.</span>
                          {q.question}
                        </p>
                        <div className="space-y-2">
                          {q.choices.map((choice, ci) => (
                            <button
                              key={ci}
                              id={`quiz-q${qi}-c${ci}`}
                              onClick={() => setQuizAnswers((prev) => ({ ...prev, [qi.toString()]: choice }))}
                              className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm transition-all border ${quizAnswers[qi.toString()] === choice
                                ? "bg-violet-500/15 border-violet-500/40 text-violet-200"
                                : "bg-zinc-800/30 border-zinc-700/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/50"}`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${quizAnswers[qi.toString()] === choice ? "border-violet-400 bg-violet-400" : "border-zinc-600"}`}>
                                {quizAnswers[qi.toString()] === choice && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              {choice}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {userRole != "EDUCATOR" &&<button
                      id="submit-quiz-btn"
                      onClick={submitQuiz}
                      disabled={Object.keys(quizAnswers).length < activeQuiz.questions.length || isSubmittingQuiz}
                      className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"
                    >
                      {isSubmittingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                      {isSubmittingQuiz ? "Scoring…" : `Submit answers (${Object.keys(quizAnswers).length}/${activeQuiz.questions.length})`}
                    </button>}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Resources Modal */}
      {isEditingResources && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                Edit Resources
              </h2>
              <button onClick={() => setIsEditingResources(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {editingResourcesList.map((res, idx) => (
                <div key={idx} className="flex flex-col gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-800/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500 uppercase">Resource {idx + 1}</span>
                    <button 
                      onClick={() => setEditingResourcesList(prev => prev.filter((_, i) => i !== idx))}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      value={res.name}
                      onChange={(e) => {
                        const newList = [...editingResourcesList];
                        newList[idx].name = e.target.value;
                        setEditingResourcesList(newList);
                      }}
                      placeholder="Resource Name (e.g. React Docs)"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-cyan-500/50"
                    />
                    <select
                      value={res.type}
                      onChange={(e) => {
                        const newList = [...editingResourcesList];
                        newList[idx].type = e.target.value;
                        setEditingResourcesList(newList);
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-cyan-500/50"
                    >
                      <option value="Article">Article</option>
                      <option value="Video">Video</option>
                      <option value="Documentation">Documentation</option>
                      <option value="Interactive">Interactive</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <input 
                    type="url" 
                    value={res.url}
                    onChange={(e) => {
                      const newList = [...editingResourcesList];
                      newList[idx].url = e.target.value;
                      setEditingResourcesList(newList);
                    }}
                    placeholder="URL (https://...)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-cyan-500/50"
                  />
                </div>
              ))}

              <button 
                onClick={() => setEditingResourcesList(prev => [...prev, { name: "", url: "", type: "Article" }])}
                className="w-full py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-800/30 transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add New Resource
              </button>
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditingResources(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveResources}
                disabled={isSavingResources}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-cyan-600 hover:bg-cyan-500 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingResources ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Per-Question Edit Modal */}
      {editingQuestionDraft !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                Edit Question {editingQuestionIdx !== null ? editingQuestionIdx + 1 : ""}
              </h2>
              <button onClick={() => { setEditingQuestionIdx(null); setEditingQuestionDraft(null); }} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase mb-1.5 block">Question</label>
                <textarea
                  value={editingQuestionDraft.question}
                  onChange={e => setEditingQuestionDraft(prev => prev ? { ...prev, question: e.target.value } : null)}
                  rows={3}
                  placeholder="Enter your question..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase mb-1.5 block">Choices · Select the correct answer</label>
                <div className="space-y-2">
                  {editingQuestionDraft.choices.map((choice, ci) => (
                    <div key={ci} className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${editingQuestionDraft.correctAnswer === choice && choice ? "border-emerald-500/40 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900/40"}`}>
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={editingQuestionDraft.correctAnswer === choice}
                        onChange={() => setEditingQuestionDraft(prev => prev ? { ...prev, correctAnswer: choice } : null)}
                        className="accent-emerald-500 shrink-0"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={choice}
                        onChange={e => {
                          const newChoices = [...editingQuestionDraft!.choices];
                          const wasCorrect = editingQuestionDraft!.correctAnswer === choice;
                          newChoices[ci] = e.target.value;
                          setEditingQuestionDraft(prev => prev ? {
                            ...prev,
                            choices: newChoices,
                            correctAnswer: wasCorrect ? e.target.value : prev.correctAnswer
                          } : null);
                        }}
                        placeholder={`Choice ${ci + 1}`}
                        className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase mb-1.5 block">Explanation</label>
                <input
                  type="text"
                  value={editingQuestionDraft.explanation}
                  onChange={e => setEditingQuestionDraft(prev => prev ? { ...prev, explanation: e.target.value } : null)}
                  placeholder="Shown to student after answering..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
            <div className="p-5 border-t border-zinc-800 flex justify-end gap-3">
              <button onClick={() => { setEditingQuestionIdx(null); setEditingQuestionDraft(null); }} className="px-5 py-2.5 rounded-xl font-medium text-white bg-zinc-800 hover:bg-zinc-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={confirmEditQuestion}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-cyan-600 hover:bg-cyan-500 transition-colors flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" /> Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


