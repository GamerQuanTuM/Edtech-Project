import { Role } from "@prisma/client";
import { hashPassword } from "../src/lib/auth-utils";
import { db } from "../src/lib/db";

async function main() {
  console.log("🌱 Seeding Aegis-AI database...");

  // ─── Clear existing seed data ─────────────────────────────────────────────
  await db.quizAttempt.deleteMany();
  await db.quiz.deleteMany();
  await db.moduleNode.deleteMany();
  await db.module.deleteMany();
  await db.pathway.deleteMany();
  await db.user.deleteMany();

  // ─── Create Demo Users ────────────────────────────────────────────────────
  const studentPassword = await hashPassword("password123");
  const educatorPassword = await hashPassword("educator456");

  const student = await db.user.create({
    data: {
      name: "Alex Chen",
      email: "alex@demo.aegis.ai",
      passwordHash: studentPassword,
      role: Role.STUDENT,
    },
  });

  const educator = await db.user.create({
    data: {
      name: "Dr. Sarah Miller",
      email: "sarah@demo.aegis.ai",
      passwordHash: educatorPassword,
      role: Role.EDUCATOR,
    },
  });

  console.log(`✅ Created users: ${student.email}, ${educator.email}`);

  // ─── Create a Demo Pathway ────────────────────────────────────────────────
  const pathway = await db.pathway.create({
    data: {
      title: "Full-Stack TypeScript Mastery",
      description:
        "A comprehensive learning path from TypeScript fundamentals to production-ready full-stack applications with Next.js and PostgreSQL.",
      goal: "Become a proficient full-stack TypeScript developer capable of building and deploying production applications",
      difficulty: "Intermediate",
      duration: "40 hours",
      isPublic: true,
      creatorId: educator.id,
      modules: {
        create: [
          {
            title: "TypeScript Fundamentals",
            description:
              "Master the core type system, generics, decorators, and advanced TypeScript patterns.",
            orderIndex: 0,
            nodes: {
              create: [
                {
                  title: "Type System Deep Dive",
                  summary:
                    "Explore TypeScript's structural type system, type inference, union types, intersection types, and mapped types. Understand how types flow through functions and generics.",
                  durationMinutes: 60,
                  resources: [
                    {
                      name: "TypeScript Handbook: Types",
                      url: "https://www.typescriptlang.org/docs/handbook/2/types-from-types.html",
                      type: "docs",
                    },
                    {
                      name: "TypeScript Deep Dive (Book)",
                      url: "https://basarat.gitbook.io/typescript/type-system",
                      type: "book",
                    },
                  ],
                },
                {
                  title: "Generics & Advanced Patterns",
                  summary:
                    "Learn to write reusable, type-safe code with generics. Explore conditional types, infer keyword, template literal types, and utility types like Pick, Omit, and Partial.",
                  durationMinutes: 90,
                  resources: [
                    {
                      name: "TypeScript Generics - Matt Pocock",
                      url: "https://www.youtube.com/watch?v=dLPgQRbVquo",
                      type: "video",
                    },
                    {
                      name: "TypeScript Exercises",
                      url: "https://typescript-exercises.github.io",
                      type: "exercise",
                    },
                  ],
                },
              ],
            },
          },
          {
            title: "Next.js App Router",
            description:
              "Master Next.js 16 App Router architecture, Server Components, Server Actions, and data fetching strategies.",
            orderIndex: 1,
            nodes: {
              create: [
                {
                  title: "Server vs Client Components",
                  summary:
                    "Understand the fundamental shift in the App Router: when to use Server Components vs Client Components, how data flows between them, and how to minimize client-side JavaScript bundles.",
                  durationMinutes: 75,
                  resources: [
                    {
                      name: "Next.js Docs: Server Components",
                      url: "https://nextjs.org/docs/app/getting-started/server-and-client-components",
                      type: "docs",
                    },
                    {
                      name: "React Server Components Deep Dive",
                      url: "https://www.youtube.com/watch?v=VIwWgV3Lc6s",
                      type: "video",
                    },
                  ],
                },
                {
                  title: "Data Fetching & Caching",
                  summary:
                    "Master Next.js data fetching patterns: `use cache`, `revalidatePath`, `revalidateTag`, Suspense boundaries, and optimistic updates with Server Actions.",
                  durationMinutes: 90,
                  resources: [
                    {
                      name: "Next.js Caching Documentation",
                      url: "https://nextjs.org/docs/app/getting-started/caching",
                      type: "docs",
                    },
                  ],
                },
              ],
            },
          },
          {
            title: "Database Design with Prisma",
            description:
              "Learn to design robust PostgreSQL schemas using Prisma ORM, write efficient queries, and manage database migrations.",
            orderIndex: 2,
            nodes: {
              create: [
                {
                  title: "Schema Design Principles",
                  summary:
                    "Design normalized relational schemas in Prisma SDL. Learn about relations (one-to-many, many-to-many), cascading deletes, indexes for performance, and enum types.",
                  durationMinutes: 60,
                  resources: [
                    {
                      name: "Prisma Data Guide",
                      url: "https://www.prisma.io/dataguide",
                      type: "docs",
                    },
                    {
                      name: "Database Design Tutorial",
                      url: "https://www.youtube.com/watch?v=ztHopE5Wnpc",
                      type: "video",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
    include: { modules: { include: { nodes: true } } },
  });

  console.log(`✅ Created demo pathway: "${pathway.title}"`);
  console.log(`   - ${pathway.modules.length} modules`);
  console.log(
    `   - ${pathway.modules.flatMap((m) => m.nodes).length} nodes total`
  );

  console.log("\n🎉 Seeding complete!");
  console.log("\n📋 Demo credentials:");
  console.log(`   Student: alex@demo.aegis.ai / password123`);
  console.log(`   Educator: sarah@demo.aegis.ai / educator456`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
