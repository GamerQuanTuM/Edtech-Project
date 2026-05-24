import { db } from "@/lib/db";
import type { NextRequest } from "next/server";

/**
 * @swagger
 * /api/analytics:
 *   get:
 *     summary: Get analytics data for the authenticated user (role-aware)
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Analytics data (student or educator perspective)
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (userRole === "EDUCATOR") {
    return getEducatorAnalytics(userId);
  }
  return getStudentAnalytics(userId);
}

// ─── Student Analytics ──────────────────────────────────────────────────────

async function getStudentAnalytics(userId: string) {
  const pathways = await db.pathway.findMany({
    where: { creatorId: userId },
    include: {
      modules: {
        include: {
          nodes: true,
          quiz: {
            include: {
              attempts: {
                where: { userId },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalPathways = pathways.length;
  const allModules = pathways.flatMap((p) => p.modules);
  const allNodes = allModules.flatMap((m) => m.nodes);
  const totalNodes = allNodes.length;
  const completedNodes = allNodes.filter((n) => n.status === "COMPLETED").length;
  const inProgressNodes = allNodes.filter((n) => n.status === "IN_PROGRESS").length;
  const notStartedNodes = totalNodes - completedNodes - inProgressNodes;

  // Quiz stats
  const allAttempts = allModules
    .flatMap((m) => m.quiz?.attempts ?? []);
  const totalQuizzesTaken = allAttempts.length;
  const averageQuizScore =
    totalQuizzesTaken > 0
      ? Math.round(allAttempts.reduce((s, a) => s + a.score, 0) / totalQuizzesTaken)
      : 0;
  const bestQuizScore =
    totalQuizzesTaken > 0
      ? Math.max(...allAttempts.map((a) => a.score))
      : 0;

  // Per-pathway progress
  const pathwayProgress = pathways.map((p) => {
    const nodes = p.modules.flatMap((m) => m.nodes);
    const completed = nodes.filter((n) => n.status === "COMPLETED").length;
    const total = nodes.length;
    return {
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      completedNodes: completed,
      totalNodes: total,
      modules: p.modules.length,
    };
  });

  // Streak: consecutive days with at least one node completed (based on updatedAt)
  const completedDates = allNodes
    .filter((n) => n.status === "COMPLETED")
    .map((n) => n.updatedAt.toISOString().slice(0, 10))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
    .reverse();

  let streak = 0;
  if (completedDates.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    let checkDate = new Date(today);
    // Allow today or yesterday as the start
    const topDate = completedDates[0];
    const diff = (new Date(today).getTime() - new Date(topDate).getTime()) / 86400000;
    if (diff <= 1) {
      for (const d of completedDates) {
        const expected = checkDate.toISOString().slice(0, 10);
        if (d === expected) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (d < expected) {
          break;
        }
      }
    }
  }

  // Recent quiz attempts (last 10)
  const recentQuizAttempts = allAttempts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map((a) => {
      const quiz = allModules.find((m) => m.quiz?.id === a.quizId)?.quiz;
      return {
        quizTitle: quiz?.title ?? "Quiz",
        score: a.score,
        createdAt: a.createdAt,
      };
    });

  // Difficulty distribution
  const difficultyDistribution = pathways.reduce(
    (acc, p) => {
      acc[p.difficulty] = (acc[p.difficulty] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Response.json({
    role: "STUDENT",
    overview: {
      totalPathways,
      totalNodes,
      completedNodes,
      inProgressNodes,
      notStartedNodes,
      overallProgress: totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0,
      totalQuizzesTaken,
      averageQuizScore,
      bestQuizScore,
      streak,
    },
    pathwayProgress,
    recentQuizAttempts,
    difficultyDistribution,
  });
}

// ─── Educator Analytics ─────────────────────────────────────────────────────

async function getEducatorAnalytics(userId: string) {
  // Get all pathways created by educator
  const pathways = await db.pathway.findMany({
    where: { creatorId: userId },
    include: {
      modules: {
        include: {
          nodes: true,
          quiz: {
            include: {
              attempts: {
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalPathways = pathways.length;
  const publishedPathways = pathways.filter((p) => p.isPublic).length;
  const draftPathways = totalPathways - publishedPathways;

  // Clone counts: how many students enrolled in educator's pathways
  const pathwayIds = pathways.map((p) => p.id);
  const cloneCounts = await db.pathway.groupBy({
    by: ["originalPathwayId"],
    where: { originalPathwayId: { in: pathwayIds } },
    _count: { _all: true },
  });
  const cloneMap = new Map<string, number>();
  cloneCounts.forEach((c) => {
    if (c.originalPathwayId) cloneMap.set(c.originalPathwayId, c._count._all);
  });
  const totalEnrollments = Array.from(cloneMap.values()).reduce((s, v) => s + v, 0);

  // Get quiz attempts from cloned pathways (student enrollments)
  // When students clone a pathway, quizzes are copied and attempts go on the clone.
  // We need those attempts to show student engagement on educator's content.
  const clonedPathways = await db.pathway.findMany({
    where: { originalPathwayId: { in: pathwayIds } },
    include: {
      modules: {
        include: {
          quiz: {
            include: {
              attempts: {
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  // Quiz engagement: educator's own quizzes + quizzes on cloned pathways
  const educatorQuizzes = pathways.flatMap((p) => p.modules.flatMap((m) => (m.quiz ? [m.quiz] : [])));
  const totalQuizzesCreated = educatorQuizzes.length;

  // Collect all student attempts from cloned pathways (primary source of student data)
  const clonedQuizzes = clonedPathways.flatMap((p) => p.modules.flatMap((m) => (m.quiz ? [m.quiz] : [])));
  const allStudentAttempts = [
    // Attempts on educator's own quizzes (if students somehow attempt them directly)
    ...educatorQuizzes.flatMap((q) => q.attempts.filter((a) => a.userId !== userId)),
    // Attempts on cloned pathway quizzes (main source)
    ...clonedQuizzes.flatMap((q) => q.attempts),
  ];

  const totalQuizAttempts = allStudentAttempts.length;
  const averageStudentScore =
    totalQuizAttempts > 0
      ? Math.round(allStudentAttempts.reduce((s, a) => s + a.score, 0) / totalQuizAttempts)
      : 0;

  // Unique students who attempted quizzes
  const uniqueStudents = new Set(allStudentAttempts.map((a) => a.userId)).size;

  // Map cloned pathway attempts back to original pathway for per-pathway stats
  const cloneAttemptsPerOriginal = new Map<string, typeof allStudentAttempts>();
  clonedPathways.forEach((cp) => {
    const origId = cp.originalPathwayId!;
    const attempts = cp.modules.flatMap((m) => m.quiz?.attempts ?? []);
    const existing = cloneAttemptsPerOriginal.get(origId) || [];
    cloneAttemptsPerOriginal.set(origId, [...existing, ...attempts]);
  });

  // Per-pathway stats
  const pathwayStats = pathways.map((p) => {
    const enrollments = cloneMap.get(p.id) || 0;
    const quizzes = p.modules.flatMap((m) => (m.quiz ? [m.quiz] : []));
    // Include both direct attempts (non-educator) and cloned pathway attempts
    const directAttempts = quizzes.flatMap((q) => q.attempts.filter((a) => a.userId !== userId));
    const clonedAttempts = cloneAttemptsPerOriginal.get(p.id) || [];
    const attempts = [...directAttempts, ...clonedAttempts];
    const avgScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
        : null;

    return {
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      isPublic: p.isPublic,
      enrollments,
      modules: p.modules.length,
      totalNodes: p.modules.flatMap((m) => m.nodes).length,
      quizzesCreated: quizzes.length,
      quizAttempts: attempts.length,
      averageScore: avgScore,
      createdAt: p.createdAt,
    };
  });

  // Score distribution buckets (0-20, 21-40, 41-60, 61-80, 81-100)
  const scoreDistribution = [0, 0, 0, 0, 0];
  allStudentAttempts.forEach((a) => {
    const bucket = Math.min(Math.floor(a.score / 20), 4);
    scoreDistribution[bucket]++;
  });

  // Top performing pathways (by enrollment)
  const topPathways = [...pathwayStats]
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 5);

  // Recent activity: last 10 quiz attempts from students
  const allQuizzesForLookup = [...educatorQuizzes, ...clonedQuizzes];
  const recentActivity = allStudentAttempts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map((a) => {
      const quiz = allQuizzesForLookup.find((q) => q.id === a.quizId);
      return {
        quizTitle: quiz?.title ?? "Quiz",
        score: a.score,
        createdAt: a.createdAt,
      };
    });

  return Response.json({
    role: "EDUCATOR",
    overview: {
      totalPathways,
      publishedPathways,
      draftPathways,
      totalEnrollments,
      totalQuizzesCreated,
      totalQuizAttempts,
      averageStudentScore,
      uniqueStudents,
    },
    pathwayStats,
    topPathways,
    scoreDistribution,
    recentActivity,
  });
}
