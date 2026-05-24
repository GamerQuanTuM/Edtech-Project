import { db } from "@/lib/db";
import type { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");

  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (userRole !== "EDUCATOR") {
    return Response.json({ error: "Only educators can publish pathways" }, { status: 403 });
  }

  try {
    const pathway = await db.pathway.findUnique({
      where: { id },
      include: {
        modules: {
          include: { quiz: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!pathway) return Response.json({ error: "Pathway not found" }, { status: 404 });

    if (pathway.creatorId !== userId) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Only enforce the quiz requirement when PUBLISHING (not when unpublishing)
    if (!pathway.isPublic) {
      const modulesWithoutQuiz = pathway.modules.filter((m) => !m.quiz);
      if (modulesWithoutQuiz.length > 0) {
        return Response.json(
          {
            error: "All modules must have a quiz before publishing.",
            missingQuizModules: modulesWithoutQuiz.map((m) => ({
              id: m.id,
              title: m.title,
            })),
          },
          { status: 400 }
        );
      }
    }

    const updated = await db.pathway.update({
      where: { id },
      data: { isPublic: !pathway.isPublic },
    });

    return Response.json({ isPublic: updated.isPublic });
  } catch (error) {
    console.error("[PUBLISH]", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
