import { db } from "@/lib/db";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (userRole === "EDUCATOR") {
    return Response.json({ error: "Educators cannot access the student catalog" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const whereClause: any = {
      isPublic: true,
      creatorId: { not: userId },
    };
    if (search) {
      whereClause.title = { contains: search, mode: "insensitive" };
    }

    // Fetch all public pathways matching the criteria
    const publicPathways = await db.pathway.findMany({
      where: whereClause,
      include: {
        creator: {
          select: { name: true, role: true },
        },
        modules: {
          include: { nodes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch clone counts (how many students have enrolled)
    const publicPathwayIds = publicPathways.map((p) => p.id);
    const cloneCounts = await db.pathway.groupBy({
      by: ["originalPathwayId"],
      where: {
        originalPathwayId: { in: publicPathwayIds },
      },
      _count: {
        _all: true,
      },
    });

    const countMap = new Map<string, number>();
    cloneCounts.forEach((c) => {
      if (c.originalPathwayId) {
        countMap.set(c.originalPathwayId, c._count._all);
      }
    });

    // Map output payload
    const pathways = publicPathways.map((pathway) => ({
      id: pathway.id,
      title: pathway.title,
      description: pathway.description,
      goal: pathway.goal,
      difficulty: pathway.difficulty,
      duration: pathway.duration,
      creatorName: pathway.creator.name,
      moduleCount: pathway.modules.length,
      nodeCount: pathway.modules.flatMap((m) => m.nodes).length,
      cloneCount: countMap.get(pathway.id) || 0,
    }));

    return Response.json({ pathways });
  } catch (error) {
    console.error("[DISCOVER_GET]", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
