import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aegis-AI — Adaptive Learning Path Studio",
    template: "%s | Aegis-AI",
  },
  description:
    "Aegis-AI generates personalized, structured learning roadmaps powered by LangGraph agentic AI. Track your progress, take AI-graded quizzes, and master any skill systematically.",
  keywords: ["learning", "AI", "syllabus", "education", "roadmap", "study"],
  authors: [{ name: "Aegis-AI" }],
  openGraph: {
    title: "Aegis-AI — Adaptive Learning Path Studio",
    description: "AI-powered personalized learning roadmaps",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-background text-text antialiased">
        {children}
      </body>
    </html>
  );
}
