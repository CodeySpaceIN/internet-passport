"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { trackEvent } from "@/lib/analytics/client";

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setLoading(false);
      setError(data?.message ?? "Could not create account.");
      showToast({
        kind: "error",
        title: "Sign up failed",
        description: data?.message ?? "Could not create account.",
      });
      trackEvent("auth.sign_up_failed", { email });
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (!signInResult || signInResult.error) {
      showToast({
        kind: "info",
        title: "Account created",
        description: "Please sign in to continue onboarding.",
      });
      trackEvent("auth.sign_up_created_needs_sign_in", { email });
      window.location.href = "/login";
      return;
    }
    showToast({
      kind: "success",
      title: "Account created",
      description: "Continue with organization onboarding.",
    });
    trackEvent("auth.sign_up_success", { email });
    window.location.href = "/onboarding";
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 flex w-full max-w-sm flex-col gap-4 rounded-xl border border-card-border bg-background/40 p-6"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span>Full name</span>
        <Input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Email</span>
        <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Password</span>
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          minLength={8}
          required
        />
      </label>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href={"/login" as Route} className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
