import type { NextRequest } from "next/server";

const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Aegis-AI API",
    version: "1.0.0",
    description:
      "Full-stack REST API for the Aegis-AI Adaptive Syllabus & Interactive Learning Path Studio. Built with Next.js 16, Prisma ORM, and LangGraph agentic AI workflows.",
    contact: {
      name: "Aegis-AI",
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      description: "Current environment",
    },
  ],
  tags: [
    { name: "Authentication", description: "User registration, login, and session management" },
    { name: "Pathways", description: "Learning pathway CRUD and node management" },
    { name: "AI", description: "AI-powered pathway generation and quiz engine" },
  ],
  paths: {
    "/api/auth/register": {
      post: {
        summary: "Register a new user",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", minLength: 2, example: "Jane Doe" },
                  email: { type: "string", format: "email", example: "jane@example.com" },
                  password: { type: "string", minLength: 8, example: "securepassword123" },
                  role: { type: "string", enum: ["STUDENT", "EDUCATOR"], default: "STUDENT" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User created successfully. Session cookie set." },
          "400": { description: "Validation error or email already registered" },
          "500": { description: "Internal server error" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Login with email and password",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "jane@example.com" },
                  password: { type: "string", example: "securepassword123" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful. Session cookie set." },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        summary: "Logout current user",
        tags: ["Authentication"],
        responses: {
          "200": { description: "Session cookie cleared" },
        },
      },
    },
    "/api/pathways": {
      get: {
        summary: "List all pathways for the authenticated user",
        tags: ["Pathways"],
        security: [{ cookieAuth: [] }],
        responses: {
          "200": { description: "Array of pathways with nested modules and nodes" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Generate a new AI learning pathway via LangGraph",
        description:
          "Triggers a multi-node stateful LangGraph pipeline (Planner → Validator) to generate a structured learning syllabus and persists it to the database.",
        tags: ["Pathways"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["goal"],
                properties: {
                  goal: {
                    type: "string",
                    minLength: 10,
                    example: "Learn Rust for systems programming coming from a Python background",
                  },
                  userBackground: {
                    type: "string",
                    example: "3 years Python, some C experience",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Pathway generated and saved" },
          "400": { description: "Validation error" },
          "500": { description: "AI generation failed" },
        },
      },
    },
    "/api/pathways/{id}": {
      get: {
        summary: "Get a specific pathway with all content",
        tags: ["Pathways"],
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Pathway with nested modules, nodes, and quiz data" },
          "403": { description: "Forbidden — not the owner and not public" },
          "404": { description: "Pathway not found" },
        },
      },
      patch: {
        summary: "Update pathway metadata",
        tags: ["Pathways"],
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  isPublic: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated pathway" },
          "403": { description: "Forbidden" },
        },
      },
      delete: {
        summary: "Delete a pathway and all its content",
        tags: ["Pathways"],
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Deleted successfully" },
          "403": { description: "Forbidden" },
        },
      },
    },
    "/api/pathways/nodes/{id}": {
      patch: {
        summary: "Update a node's study notes or progress status",
        description:
          "Saves user-written markdown study notes or marks progress. Automatically cascades status changes to the parent module.",
        tags: ["Pathways"],
        security: [{ cookieAuth: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  studyNotes: { type: "string", description: "Markdown study notes" },
                  status: {
                    type: "string",
                    enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Node updated" },
          "403": { description: "Forbidden" },
          "404": { description: "Node not found" },
        },
      },
    },
    "/api/ai/quiz": {
      post: {
        summary: "Generate an AI quiz for a module",
        description:
          "Uses LangChain structured output to create 5 challenging MCQ questions based on the module's content.",
        tags: ["AI"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["moduleId"],
                properties: {
                  moduleId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Quiz generated and saved" },
          "400": { description: "Module ID missing or invalid" },
          "404": { description: "Module not found" },
        },
      },
      put: {
        summary: "Evaluate quiz answers and record attempt",
        tags: ["AI"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quizId", "answers"],
                properties: {
                  quizId: { type: "string", format: "uuid" },
                  answers: {
                    type: "object",
                    additionalProperties: { type: "string" },
                    example: { "0": "Answer A", "1": "Answer C", "2": "Answer B", "3": "Answer D", "4": "Answer A" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Score and per-question feedback" },
          "404": { description: "Quiz not found" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "aegis_session",
        description: "JWT session stored in an HttpOnly cookie. Set automatically after login.",
      },
    },
  },
};

export async function GET(_request: NextRequest) {
  return Response.json(openApiSpec);
}
