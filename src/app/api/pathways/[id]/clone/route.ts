import { db } from "@/lib/db";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = request.headers.get("x-user-id");

  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Fetch the original pathway (must be public)
    const original = await db.pathway.findUnique({
      where: { id },
      include: {
        modules: {
          include: { nodes: true, quiz: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!original) return Response.json({ error: "Pathway not found" }, { status: 404 });
    if (!original.isPublic) {
      return Response.json({ error: "This pathway is not public" }, { status: 403 });
    }

    // 2. Clone it and assign to the requesting user
    const clonedPathway = await db.pathway.create({
      data: {
        title: original.title,
        description: original.description,
        goal: original.goal,
        difficulty: original.difficulty,
        duration: original.duration,
        isPublic: false, // clones are private by default
        originalPathwayId: original.id, // track origin
        creatorId: userId,
        modules: {
          create: original.modules.map((mod) => ({
            title: mod.title,
            description: mod.description,
            orderIndex: mod.orderIndex,
            nodes: {
              create: mod.nodes.map((node) => ({
                title: node.title,
                summary: node.summary,
                durationMinutes: node.durationMinutes,
                resources: node.resources ? node.resources : [],
                status: "NOT_STARTED",
                studyNotes: "",
              })),
            },
            quiz: mod.quiz ? {
              create: {
                title: mod.quiz.title,
                questions: mod.quiz.questions ? (mod.quiz.questions as any) : [],
              }
            } : undefined,
          })),
        },
      },
      include: {
        modules: {
          include: { nodes: true },
        },
      },
    });

    return Response.json({ pathway: clonedPathway }, { status: 201 });
  } catch (error) {
    console.error("[CLONE_PATHWAY]", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
