import AuthForm from "@/components/auth-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your Aegis-AI account and start learning",
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
