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
  const structuredLLM = llm.withStructuredOutput(PathwaySchema);

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
- Create 3-8 progressive modules that build on each other logically
- Each module should have 2-6 focused learning nodes
- Include real, working resource URLs (prefer YouTube, official docs, MDN, freeCodeCamp, etc.)
- Ensure realistic time estimates (most nodes: 30-90 minutes)
- Make titles engaging and specific (not generic like "Introduction")
- Resources must be diverse: mix videos, articles, docs, and exercises`;

  const result = await structuredLLM.invoke([
    new SystemMessage(
      "You are an expert curriculum designer. Always return valid, complete JSON matching the requested schema."
    ),
    new HumanMessage(prompt),
  ]);

  return {
    pathwayDraft: result as PathwayOutput,
    revisionAttempts: state.revisionAttempts + 1,
  };
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
  const structuredLLM = llm.withStructuredOutput(QuizSchema);

  const result = await structuredLLM.invoke([
    new SystemMessage(
      "You are an expert educator creating fair, challenging quiz questions. Always return exactly 5 questions."
    ),
    new HumanMessage(`Generate a 5-question multiple choice quiz for the following module:

**Module Title:** ${moduleTitle}
**Module Description:** ${moduleDescription}
**Topics Covered:**
${nodesSummary}

Requirements:
- Questions should test genuine understanding, not just memorization
- All 4 choices must be plausible (no obvious wrong answers)
- Mix conceptual, applied, and analytical questions
- Provide clear, educational explanations for correct answers`),
  ]);

  return result as QuizOutput;
}
