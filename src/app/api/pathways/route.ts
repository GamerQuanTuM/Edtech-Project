import { db } from "@/lib/db";
import { generatePathway } from "@/lib/pathway-graph";
import { z } from "zod";
import type { NextRequest } from "next/server";

const CreatePathwaySchema = z.object({
  goal: z.string().min(10, "Goal must be at least 10 characters").max(500),
  userBackground: z.string().max(500).optional().default(""),
});

/**
 * @swagger
 * /api/pathways:
 *   get:
 *     summary: List all pathways for the authenticated user
 *     tags: [Pathways]
 *     responses:
 *       200:
 *         description: List of pathways
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Generate a new AI learning pathway
 *     description: Triggers the LangGraph multi-node pipeline to create a structured learning pathway
 *     tags: [Pathways]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [goal]
 *             properties:
 *               goal:
 *                 type: string
 *                 minLength: 10
 *                 example: "Learn Rust for systems programming coming from a Python background"
 *               userBackground:
 *                 type: string
 *                 example: "I have 3 years of Python experience and know basic C"
 *     responses:
 *       201:
 *         description: Pathway generated and saved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: AI generation failed
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const pathways = await db.pathway.findMany({
    where: { creatorId: userId },
    include: {
      modules: {
        include: { nodes: true },
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pathwayIds = pathways.map((p) => p.id);
  const cloneCounts = await db.pathway.groupBy({
    by: ["originalPathwayId"],
    where: { originalPathwayId: { in: pathwayIds } },
    _count: { _all: true },
  });

  const countMap = new Map<string, number>();
  cloneCounts.forEach((c) => {
    if (c.originalPathwayId) countMap.set(c.originalPathwayId, c._count._all);
  });

  const pathwaysWithCounts = pathways.map(p => ({
    ...p,
    cloneCount: countMap.get(p.id) || 0
  }));

  return Response.json({ pathways: pathwaysWithCounts });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = CreatePathwaySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { goal, userBackground } = parsed.data;

    // Run the LangGraph agentic pipeline
    const aiPathway = await generatePathway(goal, userBackground);

    // Persist the full hierarchy to PostgreSQL in one transaction
    const pathway = await db.pathway.create({
      data: {
        title: aiPathway.title,
        description: aiPathway.description,
        goal,
        difficulty: aiPathway.difficulty,
        duration: aiPathway.duration,
        creatorId: userId,
        modules: {
          create: aiPathway.modules.map((mod, modIdx) => ({
            title: mod.title,
            description: mod.description,
            orderIndex: modIdx,
            nodes: {
              create: mod.nodes.map((node) => ({
                title: node.title,
                summary: node.summary,
                durationMinutes: node.durationMinutes,
                resources: node.resources,
              })),
            },
          })),
        },
      },
      include: {
        modules: {
          include: { nodes: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return Response.json({ pathway }, { status: 201 });
  } catch (error) {
    console.error("[PATHWAYS/POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate pathway";
    return Response.json({ error: message }, { status: 500 });
  }
}
