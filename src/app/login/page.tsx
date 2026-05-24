import AuthForm from "@/components/auth-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Aegis-AI account",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
