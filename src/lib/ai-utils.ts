import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { ChatOllama } from "@langchain/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { z } from "zod";

// ─── Provider Loader ───────────────────────────────────────────────────────

export function loadLLM(temperature = 0.2): BaseChatModel {
  const provider = process.env.AI_PROVIDER ?? "google";

  switch (provider) {
    case "openai":
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
      return new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature,
        apiKey: process.env.OPENAI_API_KEY,
      }) as unknown as BaseChatModel;

    case "groq":
      if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");
      return new ChatGroq({
        model: "llama-3.3-70b-versatile",
        temperature,
        apiKey: process.env.GROQ_API_KEY,
      }) as unknown as BaseChatModel;

    case "ollama":
      if (!process.env.OLLAMA_API_KEY) throw new Error("OLLAMA_API_KEY not set");
      return new ChatOllama({
        baseUrl: "https://ollama.com",
        model: "gemma4:31b-cloud",
        temperature,
        headers: {
          Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
        }
      }) as unknown as BaseChatModel;

    case "google":
    default:
      if (!process.env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY not set");
      return new ChatGoogleGenerativeAI({
        model: "gemini-3.5-flash",
        temperature,
        apiKey: process.env.GOOGLE_API_KEY,
      }) as unknown as BaseChatModel;
  }
}

// ─── Zod Schemas for Structured Output ─────────────────────────────────────

export const ResourceSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.enum(["video", "article", "docs", "book", "exercise"]),
});

export const ModuleNodeSchema = z.object({
  title: z.string(),
  summary: z.string(),
  durationMinutes: z.number(),
  resources: z.array(ResourceSchema),
});

export const ModuleSchema = z.object({
  title: z.string(),
  description: z.string(),
  nodes: z.array(ModuleNodeSchema),
});

export const PathwaySchema = z.object({
  title: z.string(),
  description: z.string(),
  duration: z.string(),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  modules: z.array(ModuleSchema),
});

export type PathwayOutput = z.infer<typeof PathwaySchema>;

// ─── Quiz Schemas ──────────────────────────────────────────────────────────

export const QuizQuestionSchema = z.object({
  question: z.string(),
  choices: z.array(z.string()),
  correctAnswer: z.string(),
  explanation: z.string(),
});

export const QuizSchema = z.object({
  title: z.string(),
  questions: z.array(QuizQuestionSchema),
});

export type QuizOutput = z.infer<typeof QuizSchema>;
