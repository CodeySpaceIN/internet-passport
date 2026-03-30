import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { Card } from "@/components/ui/card";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function LoginPage() {
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
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Login</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-4 max-w-md text-sm text-muted">
          Continue to your trust operations workspace and monitor identity, risk, and signed actions.
        </p>
      </div>
      <Card className="w-full p-10">
        <SignInForm />
      </Card>
    </main>
  );
}
