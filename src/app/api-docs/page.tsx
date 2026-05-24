"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Brain } from "lucide-react";
import Link from "next/link";

// Dynamically import Swagger UI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Import swagger-ui CSS only on client
    import("swagger-ui-react/swagger-ui.css");
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="glass border-b border-zinc-800/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold gradient-text">Aegis-AI</span>
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-sm text-zinc-400 font-medium">API Reference</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">OpenAPI 3.0</span>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800/50"
          >
            Dashboard →
          </Link>
        </div>
      </header>

      {/* Intro Banner */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="glass rounded-2xl p-6 border border-violet-500/20 bg-linear-to-br from-violet-500/5 to-cyan-500/5 mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Aegis-AI REST API</h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
            Explore and test all Aegis-AI API endpoints interactively. The API uses{" "}
            <strong className="text-zinc-300">HttpOnly cookie authentication</strong> — sign in via{" "}
            <code className="text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded text-xs">POST /api/auth/login</code>{" "}
            and the session cookie will be automatically sent on subsequent requests.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            {["Authentication", "Pathways", "AI"].map((tag) => (
              <span key={tag} className="text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-400">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Swagger UI */}
        <div
          id="swagger-ui-container"
          className="glass rounded-2xl border border-zinc-800 overflow-hidden [&_.swagger-ui]:bg-transparent [&_.swagger-ui_.info]:text-white [&_.swagger-ui_.scheme-container]:bg-zinc-900 [&_.swagger-ui_.opblock-tag]:text-white [&_.swagger-ui_table]:text-zinc-300"
        >
          {mounted && (
            <SwaggerUI
              url="/api/openapi"
              docExpansion="list"
              defaultModelsExpandDepth={-1}
              persistAuthorization={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
