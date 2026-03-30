import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login" as Route);
  }
  if (!session.user.onboardingRequired) {
    redirect("/dashboard");
  }

  return (
    <AppShell
      heading="Set up your organization"
      subheading="Create your workspace before continuing"
      activeNav="Organizations"
    >
      <Card className="max-w-3xl p-10">
        <p className="text-xs uppercase tracking-[0.24em] text-accent">Welcome to Internet Passport</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Organization onboarding</h1>
        <p className="mt-3 max-w-xl text-muted">
          First-time onboarding creates your organization workspace and assigns owner access.
        </p>
        <OnboardingForm />
      </Card>
    </AppShell>
  );
}
