// Shared TypeScript interfaces across the application

export interface Resource {
  name: string;
  url: string;
  type: "video" | "article" | "docs" | "book" | "exercise";
}

export interface ModuleNodeData {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  resources: Resource[];
  studyNotes: string;
  moduleId: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizAttemptData {
  id: string;
  score: number;
  feedback: string;
  answers: Record<string, string>;
  createdAt: string;
}

export interface QuizData {
  id: string;
  title: string;
  questions: QuizQuestion[];
  attempts: QuizAttemptData[];
  createdAt: string;
}

export interface ModuleData {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  nodes: ModuleNodeData[];
  quiz: QuizData | null;
  createdAt: string;
  updatedAt: string;
}

export interface PathwayData {
  id: string;
  title: string;
  description: string;
  goal: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  isPublic: boolean;
  creatorId: string;
  modules: ModuleData[];
  createdAt: string;
  updatedAt: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "EDUCATOR";
}

export type ApiResponse<T> =
  | { data: T; error?: never }
  | { data?: never; error: string; details?: Record<string, string[]> };
