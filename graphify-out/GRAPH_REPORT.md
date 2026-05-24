# Graph Report - EdTech  (2026-05-24)

## Corpus Check
- 31 files · ~17,740 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 147 nodes · 173 edges · 17 communities (10 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a6053cad`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `createToken()` - 5 edges
2. `verifyToken()` - 5 edges
3. `setSessionCookie()` - 5 edges
4. `POST()` - 4 edges
5. `POST()` - 4 edges
6. `loadLLM()` - 4 edges
7. `generatePathway()` - 4 edges
8. `generateQuiz()` - 4 edges
9. `GET()` - 3 edges
10. `POST()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `proxy()` --calls--> `verifyToken()`  [EXTRACTED]
  proxy.ts → lib/auth-utils.ts
- `POST()` --calls--> `generateQuiz()`  [EXTRACTED]
  app/api/ai/quiz/route.ts → lib/pathway-graph.ts
- `POST()` --calls--> `comparePasswords()`  [EXTRACTED]
  app/api/auth/login/route.ts → lib/auth-utils.ts
- `POST()` --calls--> `createToken()`  [EXTRACTED]
  app/api/auth/login/route.ts → lib/auth-utils.ts
- `POST()` --calls--> `setSessionCookie()`  [EXTRACTED]
  app/api/auth/login/route.ts → lib/auth-utils.ts

## Communities (17 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (9): GET(), getEducatorAnalytics(), getStudentAnalytics(), DELETE(), GET(), PATCH(), UpdateNodeSchema, UpdatePathwaySchema (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (17): comparePasswords(), createToken(), getSessionFromCookie(), getSessionFromRequest(), hashPassword(), JWT_SECRET, SessionPayload, setSessionCookie() (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (16): loadLLM(), ModuleNodeSchema, ModuleSchema, PathwayOutput, PathwaySchema, QuizOutput, QuizQuestionSchema, QuizSchema (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (11): AnalyticsData, difficultyColor, EducatorAnalytics, EducatorOverview, formatMinutes(), PathwayProgress, PathwayStat, QuizAttemptEntry (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.2
Nodes (9): ApiResponse, ModuleData, ModuleNodeData, PathwayData, QuizAttemptData, QuizData, QuizQuestion, Resource (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (3): AuthFormProps, metadata, metadata

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (7): Module, ModuleNode, Pathway, Quiz, QuizAttempt, QuizQuestion, Resource

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (5): generateQuiz(), EvaluateQuizSchema, GenerateQuizSchema, POST(), UpdateQuizSchema

## Knowledge Gaps
- **56 isolated node(s):** `PUBLIC_ROUTES`, `API_DOCS_ROUTES`, `config`, `inter`, `metadata` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `clearSessionCookie()` connect `Community 11` to `Community 1`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `generateQuiz()` connect `Community 7` to `Community 2`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `PUBLIC_ROUTES`, `API_DOCS_ROUTES`, `config` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._