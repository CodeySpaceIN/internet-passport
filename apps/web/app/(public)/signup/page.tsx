import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { Card } from "@/components/ui/card";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) {
    if (session.user.onboardingRequired) {
      redirect("/onboarding" as Route);
    }
    redirect("/dashboard" as Route);
  }

  return (
    <main className="grid min-h-[calc(100vh-220px)] w-full gap-6 px-6 py-16 lg:grid-cols-[1fr_0.9fr] lg:px-10 xl:px-14">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Signup</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="mt-4 max-w-md text-sm text-muted">
          Start building trust-first experiences for users and AI agents with policy-ready
          infrastructure.
        </p>
      </div>
      <Card className="w-full p-10">
        <SignUpForm />
      </Card>
    </main>
  );
}
