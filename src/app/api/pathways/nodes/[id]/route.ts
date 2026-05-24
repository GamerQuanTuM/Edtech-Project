import { db } from "@/lib/db";
import { z } from "zod";
import type { NextRequest } from "next/server";

const UpdateNodeSchema = z.object({
  studyNotes: z.string().max(50000).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  resources: z.array(z.any()).optional(),
});

/**
 * @swagger
 * /api/pathways/nodes/{id}:
 *   patch:
 *     summary: Update a module node's study notes or progress status
 *     tags: [Pathways]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Module node ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studyNotes:
 *                 type: string
 *                 description: Markdown study notes written by the user
 *               status:
 *                 type: string
 *                 enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *     responses:
 *       200:
 *         description: Node updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Node not found
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership through the relation chain
  const node = await db.moduleNode.findUnique({
    where: { id },
    include: { module: { include: { pathway: true } } },
  });

  if (!node) return Response.json({ error: "Node not found" }, { status: 404 });
  if (node.module.pathway.creatorId !== userId)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = UpdateNodeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updatedNode = await db.moduleNode.update({
    where: { id },
    data: parsed.data,
  });

  // Auto-update module status based on node completions
  if (parsed.data.status) {
    const allNodes = await db.moduleNode.findMany({
      where: { moduleId: node.moduleId },
    });
    const completed = allNodes.filter((n: { status: string }) => n.status === "COMPLETED").length;
    const total = allNodes.length;

    let moduleStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" = "NOT_STARTED";
    if (completed === total) moduleStatus = "COMPLETED";
    else if (completed > 0) moduleStatus = "IN_PROGRESS";

    await db.module.update({
      where: { id: node.moduleId },
      data: { status: moduleStatus },
    });
  }

  return Response.json({ node: updatedNode });
}
