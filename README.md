# Aegis-AI 🧠
### Adaptive Syllabus & Interactive Learning Path Studio

A **production-grade full-stack application** built for the House of Edtech Fullstack Developer Assignment.

> **Aegis-AI** solves the fragmented self-directed learning problem. Describe your learning goal; the platform's multi-agent AI pipeline generates a comprehensive, validated learning roadmap — with curated resources, interactive module progression, an auto-saving study journal, and AI-graded quizzes per module.

---

## ✨ Key Features

| Feature | Details |
|---|---|
| 🤖 **LangGraph AI Pipeline** | Stateful 2-node graph (Planner → Validator) generates validated learning syllabuses using Google Gemini, OpenAI, or Groq |
| 🔒 **Secure Auth** | Custom JWT credentials auth with bcrypt hashing, HttpOnly session cookies, and Next.js Edge Middleware route protection |
| 📚 **Nested CRUD** | Full relational hierarchy: User → Pathway → Module → Node, with cascading ownership-checked operations |
| 📝 **Study Journal** | Per-node auto-saving markdown study notes editor with progress status tracking |
| ⚡ **AI Quizzes** | Per-module dynamic 5-question MCQ generation with instant scoring and per-question explanations |
| 🎨 **Glassmorphic UI** | Premium dark mode UI with micro-animations, shimmer skeletons, and responsive layout |
| 📖 **Swagger API Docs** | Interactive OpenAPI 3.0 documentation at `/api-docs` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL via Neon/Supabase |
| **ORM** | Prisma 7 (with `@prisma/adapter-pg`) |
| **Auth** | Custom JWT + bcryptjs + `jose` |
| **AI** | LangChain + LangGraph JS |
| **LLM** | Google Gemini 2.0 Flash / OpenAI GPT-4o-mini / Groq LLaMA |
| **Styling** | Tailwind CSS v4 |
| **Validation** | Zod |
| **Icons** | Lucide React |
| **API Docs** | swagger-ui-react + OpenAPI 3.0 |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A cloud PostgreSQL database (free tier: [Neon](https://neon.tech) or [Supabase](https://supabase.com))
- At least one AI API key: [Google AI Studio](https://aistudio.google.com/apikey), [OpenAI](https://platform.openai.com), or [Groq](https://console.groq.com)

### 1. Clone & Install

```bash
git clone <repo-url>
cd EdTech
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
JWT_SECRET="your-64-char-random-string"
AI_PROVIDER="google"   # or "openai" or "groq"
GOOGLE_API_KEY="your-gemini-api-key"
```

### 3. Set Up Database

```bash
# Push the schema to your PostgreSQL database
npm run db:push

# Seed with demo accounts and a sample pathway
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔐 Demo Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Student | `alex@demo.aegis.ai` | `password123` |
| Educator | `sarah@demo.aegis.ai` | `educator456` |

---

## 📖 API Reference

Interactive Swagger docs available at **`/api-docs`** when the app is running.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login & set session cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/pathways` | List user's pathways |
| POST | `/api/pathways` | **Generate AI pathway** via LangGraph |
| GET | `/api/pathways/:id` | Get full pathway with modules & nodes |
| PATCH | `/api/pathways/:id` | Update pathway metadata |
| DELETE | `/api/pathways/:id` | Delete pathway |
| PATCH | `/api/pathways/nodes/:id` | Update node notes/status |
| POST | `/api/ai/quiz` | Generate AI quiz for a module |
| PUT | `/api/ai/quiz` | Submit & score quiz answers |
| GET | `/api/openapi` | Raw OpenAPI 3.0 JSON spec |

---

## 🤖 AI Architecture: LangGraph Pipeline

```
Start
  │
  ▼
┌─────────────┐      goal + background
│  Planner    │ ◄─── (retry if validation fails, max 3x)
│    Node     │
└──────┬──────┘
       │ structured JSON syllabus
       ▼
┌─────────────┐
│  Validator  │ ── issues found? ─► back to Planner
│    Node     │
└──────┬──────┘
       │ validated pathway
       ▼
  PostgreSQL DB (full nested hierarchy in one transaction)
```

The **Planner Node** generates a structured JSON syllabus using LangChain's `withStructuredOutput` + Zod schema validation. The **Validator Node** checks structural integrity (module count, node resources, etc.) and routes back to Planner for up to 3 auto-correction cycles before accepting.

---

## 📂 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # register, login, logout
│   │   ├── pathways/      # CRUD + LangGraph generation
│   │   ├── ai/quiz/       # AI quiz generation & scoring
│   │   └── openapi/       # OpenAPI 3.0 spec
│   ├── dashboard/         # Main pathway list page
│   ├── pathways/[id]/     # Visual pathway studio
│   ├── login/ & register/ # Auth pages
│   ├── api-docs/          # Swagger UI page
│   └── layout.tsx         # Root layout
├── components/
│   └── auth-form.tsx      # Shared login/register form
├── lib/
│   ├── db.ts              # Prisma + pg adapter client
│   ├── auth-utils.ts      # JWT, bcrypt, cookie helpers
│   ├── ai-utils.ts        # LLM loader + Zod schemas
│   └── pathway-graph.ts   # LangGraph state machine
├── middleware.ts           # Edge route protection
└── types/index.ts          # Shared TypeScript types
prisma/
├── schema.prisma           # Data models
├── prisma.config.ts        # Prisma 7 datasource config
└── seed.ts                 # Demo data seeder
```

---

## 🏗️ Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set the same environment variables in Vercel Dashboard → Settings → Environment Variables.

### CI/CD

Add to `.github/workflows/deploy.yml`:

```yaml
- name: Run DB migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## 🔒 Security Features

- **HttpOnly Cookies** — JWT tokens are inaccessible to JavaScript (XSS prevention)
- **bcrypt (12 rounds)** — Password hashing with salt
- **Zod validation** — All API inputs validated before hitting the database
- **Ownership checks** — Every mutation verifies the requesting user owns the resource
- **Edge Middleware** — Route protection runs at the Edge (before server computation)

---

*Built with Next.js 16, LangGraph, Prisma 7, and Tailwind CSS v4*
