import { db } from "@/lib/db";
import { generateQuiz } from "@/lib/pathway-graph";
import { z } from "zod";
import type { NextRequest } from "next/server";

const GenerateQuizSchema = z.object({
  moduleId: z.uuid("Invalid module ID"),
});

const EvaluateQuizSchema = z.object({
  quizId: z.uuid("Invalid quiz ID"),
  answers: z.record(z.string(), z.string()),
});

const UpdateQuizSchema = z.object({
  quizId: z.uuid("Invalid quiz ID"),
  questions: z.array(z.object({
    question: z.string().min(1),
    choices: z.array(z.string()).min(2),
    correctAnswer: z.string().min(1),
    explanation: z.string(),
  })).min(1),
});

/**
 * @swagger
 * /api/ai/quiz:
 *   post:
 *     summary: Generate an AI quiz for a module
 *     description: Uses LangChain to create a 5-question multiple choice quiz based on the module content
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [moduleId]
 *             properties:
 *               moduleId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Quiz generated
 *       400:
 *         description: Validation error or quiz already exists
 *       404:
 *         description: Module not found
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = GenerateQuizSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { moduleId } = parsed.data;

    const module = await db.module.findUnique({
      where: { id: moduleId },
      include: {
        nodes: true,
        pathway: true,
        quiz: true,
      },
    });

    if (!module) return Response.json({ error: "Module not found" }, { status: 404 });
    if (module.pathway.creatorId !== userId)
      return Response.json({ error: "Forbidden" }, { status: 403 });

    // Return existing quiz if already generated
    if (module.quiz) {
      return Response.json({ quiz: module.quiz });
    }

    const nodesSummary = module.nodes
      .map((n: { title: string, summary: string }) => `- ${n.title}: ${n.summary}`)
      .join("\n");

    const aiQuiz = await generateQuiz(
      module.title,
      module.description,
      nodesSummary
    );

    const quiz = await db.quiz.create({
      data: {
        title: aiQuiz.title,
        questions: aiQuiz.questions,
        moduleId,
      },
    });

    return Response.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error("[AI/QUIZ/POST]", error);
    return Response.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/ai/quiz/evaluate:
 *   post:
 *     summary: Evaluate quiz answers and record attempt
 *     description: Scores the user's answers and stores the attempt with AI-generated feedback
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quizId, answers]
 *             properties:
 *               quizId:
 *                 type: string
 *                 format: uuid
 *               answers:
 *                 type: object
 *                 additionalProperties: { type: string }
 *                 example: { "0": "Answer A", "1": "Answer C" }
 *     responses:
 *       200:
 *         description: Quiz scored with feedback
 */
export async function PUT(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = EvaluateQuizSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { quizId, answers } = parsed.data;

    const quiz = await db.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return Response.json({ error: "Quiz not found" }, { status: 404 });

    const questions = quiz.questions as Array<{
      question: string;
      choices: string[];
      correctAnswer: string;
      explanation: string;
    }>;

    // Score the answers
    let correct = 0;
    const feedback: string[] = [];

    questions.forEach((q, idx) => {
      const userAnswer = answers[idx.toString()];
      if (userAnswer === q.correctAnswer) {
        correct++;
        feedback.push(`✓ Q${idx + 1}: Correct!`);
      } else {
        feedback.push(
          `✗ Q${idx + 1}: Incorrect. Correct answer: "${q.correctAnswer}". ${q.explanation}`
        );
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    const feedbackText = feedback.join("\n");

    const attempt = await db.quizAttempt.create({
      data: {
        score,
        feedback: feedbackText,
        answers,
        userId,
        quizId,
      },
    });

    return Response.json({ attempt, score, correct, total: questions.length });
  } catch (error) {
    console.error("[AI/QUIZ/EVALUATE]", error);
    return Response.json({ error: "Failed to evaluate quiz" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (userRole !== "EDUCATOR") {
    return Response.json({ error: "Only educators can edit quiz questions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = UpdateQuizSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { quizId, questions } = parsed.data;

    // Verify the educator owns this quiz's module's pathway
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: { module: { include: { pathway: true } } },
    });
    if (!quiz) return Response.json({ error: "Quiz not found" }, { status: 404 });
    if (quiz.module.pathway.creatorId !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.quiz.update({
      where: { id: quizId },
      data: { questions: questions as any },
    });

    return Response.json({ quiz: updated });
  } catch (error) {
    console.error("[AI/QUIZ/PATCH]", error);
    return Response.json({ error: "Failed to update quiz" }, { status: 500 });
  }
}
