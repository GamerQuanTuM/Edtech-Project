import { db } from "@/lib/db";
import { z } from "zod";
import type { NextRequest } from "next/server";

const UpdatePathwaySchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
});

/**
 * @swagger
 * /api/pathways/{id}:
 *   get:
 *     summary: Get a specific pathway with all modules and nodes
 *     tags: [Pathways]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Pathway details
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Pathway not found
 *   patch:
 *     summary: Update pathway metadata
 *     tags: [Pathways]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               isPublic: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated pathway
 *   delete:
 *     summary: Delete a pathway and all its content
 *     tags: [Pathways]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const pathway = await db.pathway.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      modules: {
        include: {
          nodes: { orderBy: { createdAt: "asc" } },
          quiz: {
            include: {
              attempts: {
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!pathway) {
    return Response.json({ error: "Pathway not found" }, { status: 404 });
  }

  // Only allow access if owner or public
  if (pathway.creatorId !== userId && !pathway.isPublic) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const userRole = request.headers.get("x-user-role");

  return Response.json({
    pathway,
    isOwner: pathway.creatorId === userId,
    userRole,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await db.pathway.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  if (existing.creatorId !== userId)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = UpdatePathwaySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const pathway = await db.pathway.update({
    where: { id },
    data: parsed.data,
  });

  return Response.json({ pathway });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await db.pathway.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  if (existing.creatorId !== userId)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  await db.pathway.delete({ where: { id } });

  return Response.json({ message: "Pathway deleted successfully" });
}
