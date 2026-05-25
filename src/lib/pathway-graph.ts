import {
  StateGraph,
  Annotation,
  START,
  END,
} from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  loadLLM,
  PathwaySchema,
  QuizSchema,
  type PathwayOutput,
  type QuizOutput,
} from "./ai-utils";

// ─── Helper: Extract JSON from LLM text and transform to schema ───────────

function extractJSON(text: string): unknown {
  // Strip markdown fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw.trim());
}

function transformToPathway(obj: Record<string, unknown>): PathwayOutput {
  // Handle cases where the LLM uses different field names
  const modules = (obj.modules ?? obj.pathway ?? []) as Record<string, unknown>[];

  return PathwaySchema.parse({
    title: obj.title ?? obj.learning_goal ?? obj.pathway_title ?? "Learning Pathway",
    description: obj.description ?? obj.summary ?? obj.pathway_description ?? "",
    duration: obj.duration ?? obj.total_duration ?? obj.estimated_duration ?? "",
    difficulty: obj.difficulty ?? "Intermediate",
    modules: modules.map((mod: Record<string, unknown>) => {
      const nodes = (mod.nodes ?? mod.topics ?? mod.lessons ?? []) as Record<string, unknown>[];
      return {
        title: mod.title ?? mod.module_title ?? "",
        description: mod.description ?? mod.summary ?? "",
        nodes: nodes.map((node: Record<string, unknown>) => {
          const resources = (node.resources ?? []) as Record<string, unknown>[];
          return {
            title: node.title ?? node.node_title ?? "",
            summary: node.summary ?? node.content ?? node.description ?? "",
            durationMinutes:
              node.durationMinutes ??
              node.duration_minutes ??
              parseDuration(node.estimated_time as string | undefined) ??
              60,
            resources: resources.map((r: Record<string, unknown>) => ({
              name: r.name ?? r.description ?? r.title ?? "",
              url: r.url ?? r.link ?? "",
              type: normalizeResourceType(r.type as string),
            })),
          };
        }),
      };
    }),
  });
}

function parseDuration(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

function normalizeResourceType(type: string | undefined): "video" | "article" | "docs" | "book" | "exercise" {
  if (!type) return "article";
  const t = type.toLowerCase();
  if (t.includes("video")) return "video";
  if (t.includes("doc")) return "docs";
  if (t.includes("book")) return "book";
  if (t.includes("exercise") || t.includes("practice")) return "exercise";
  return "article";
}

// ─── State Definition ──────────────────────────────────────────────────────

const PathwayState = Annotation.Root({
  goal: Annotation<string>(),
  userBackground: Annotation<string>(),
  pathwayDraft: Annotation<PathwayOutput | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  validationIssues: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  revisionAttempts: Annotation<number>({
    reducer: (prev, next) => next ?? prev,
    default: () => 0,
  }),
  finalPathway: Annotation<PathwayOutput | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

// ─── Node: Planner ─────────────────────────────────────────────────────────

async function plannerNode(
  state: typeof PathwayState.State
): Promise<Partial<typeof PathwayState.State>> {
  const llm = loadLLM(0.7);

  const prompt = `You are an expert curriculum designer and learning path architect.

Create a comprehensive, well-structured learning pathway for the following goal:

**Learning Goal:** ${state.goal}
**User Background:** ${state.userBackground || "Not specified - assume beginner to intermediate"}

${
  state.validationIssues.length > 0
    ? `**Previous validation issues to fix:**\n${state.validationIssues.map((i) => `- ${i}`).join("\n")}`
    : ""
}

Requirements:
- Return ONLY valid JSON (no markdown fences, no extra text).
- Use EXACTLY these field names:
  {
    "title": "string - pathway title",
    "description": "string - pathway description",
    "duration": "string - e.g. '6 weeks'",
    "difficulty": "Beginner" | "Intermediate" | "Advanced",
    "modules": [
      {
        "title": "string - module title",
        "description": "string - module description",
        "nodes": [
          {
            "title": "string - node title",
            "summary": "string - what the learner will study",
            "durationMinutes": number,
            "resources": [
              { "name": "string", "url": "string", "type": "video"|"article"|"docs"|"book"|"exercise" }
            ]
          }
        ]
      }
    ]
  }
- Set the difficulty field based on the learning goal and user background
- Create 3-8 progressive modules that build on each other logically
- Each module should have 2-6 focused learning nodes
- Include real, working resource URLs (prefer YouTube, official docs, MDN, freeCodeCamp, etc.)
- Ensure realistic time estimates (most nodes: 30-90 minutes)
- Make titles engaging and specific (not generic like "Introduction")
- Resources must be diverse: mix videos, articles, docs, and exercises`;

  const result = await llm.invoke([
    new SystemMessage(
      "You are an expert curriculum designer. Return ONLY valid JSON matching the exact schema requested. No markdown fences, no commentary."
    ),
    new HumanMessage(prompt),
  ]);

  const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);

  try {
    const parsed = extractJSON(text) as Record<string, unknown>;
    const pathway = transformToPathway(parsed);
    return {
      pathwayDraft: pathway,
      revisionAttempts: state.revisionAttempts + 1,
    };
  } catch (err) {
    return {
      pathwayDraft: null,
      validationIssues: [`Failed to parse LLM output: ${(err as Error).message}`],
      revisionAttempts: state.revisionAttempts + 1,
    };
  }
}

// ─── Node: Validator ───────────────────────────────────────────────────────

async function validatorNode(
  state: typeof PathwayState.State
): Promise<Partial<typeof PathwayState.State>> {
  if (!state.pathwayDraft) {
    return { validationIssues: ["No pathway draft produced"] };
  }

  const issues: string[] = [];
  const pathway = state.pathwayDraft;

  // Structural checks
  if (pathway.modules.length < 3) {
    issues.push(
      `Too few modules: ${pathway.modules.length}. Need at least 3.`
    );
  }

  for (const mod of pathway.modules) {
    if (mod.nodes.length < 2) {
      issues.push(
        `Module "${mod.title}" has only ${mod.nodes.length} node(s). Need at least 2.`
      );
    }
    for (const node of mod.nodes) {
      if (node.resources.length === 0) {
        issues.push(`Node "${node.title}" has no resources.`);
      }
    }
  }

  if (issues.length === 0) {
    // Passed — accept as final
    return { finalPathway: pathway, validationIssues: [] };
  }

  return { validationIssues: issues };
}

// ─── Routing Logic ─────────────────────────────────────────────────────────

function shouldRevise(state: typeof PathwayState.State): "planner" | typeof END {
  if (state.validationIssues.length > 0 && state.revisionAttempts < 3) {
    return "planner";
  }
  // Accept even if there are minor issues after 3 attempts
  return END;
}

// ─── Compile the Graph ─────────────────────────────────────────────────────

export function buildPathwayGraph() {
  const graph = new StateGraph(PathwayState)
    .addNode("planner", plannerNode)
    .addNode("validator", validatorNode)
    .addEdge(START, "planner")
    .addEdge("planner", "validator")
    .addConditionalEdges("validator", shouldRevise, {
      planner: "planner",
      [END]: END,
    });

  return graph.compile();
}

// ─── Entry Point for API routes ────────────────────────────────────────────

export async function generatePathway(
  goal: string,
  userBackground = ""
): Promise<PathwayOutput> {
  const app = buildPathwayGraph();
  const result = await app.invoke({ goal, userBackground });

  const pathway = result.finalPathway ?? result.pathwayDraft;
  if (!pathway) {
    throw new Error("Failed to generate learning pathway after all retries.");
  }
  return pathway;
}

// ─── Quiz Generator ────────────────────────────────────────────────────────

export async function generateQuiz(
  moduleTitle: string,
  moduleDescription: string,
  nodesSummary: string
): Promise<QuizOutput> {
  const llm = loadLLM(0.5);

  const result = await llm.invoke([
    new SystemMessage(
      "You are an expert educator creating fair, challenging quiz questions. Return ONLY valid JSON with no markdown fences. Use exactly this schema: { \"title\": \"string\", \"questions\": [{ \"question\": \"string\", \"choices\": [\"string\"], \"correctAnswer\": \"string\", \"explanation\": \"string\" }] }"
    ),
    new HumanMessage(`Generate a 5-question multiple choice quiz for the following module:

**Module Title:** ${moduleTitle}
**Module Description:** ${moduleDescription}
**Topics Covered:**
${nodesSummary}

Requirements:
- Return ONLY valid JSON (no markdown fences, no extra text)
- Questions should test genuine understanding, not just memorization
- All 4 choices must be plausible (no obvious wrong answers)
- Mix conceptual, applied, and analytical questions
- Provide clear, educational explanations for correct answers`),
  ]);

  const text = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
  const parsed = extractJSON(text) as Record<string, unknown>;
  return QuizSchema.parse(parsed);
}
