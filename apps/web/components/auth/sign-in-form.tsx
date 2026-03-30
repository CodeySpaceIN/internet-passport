"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { trackEvent } from "@/lib/analytics/client";

export function SignInForm() {
  const [email, setEmail] = useState("founder@internetpassport.dev");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid email or password.");
      showToast({
        kind: "error",
        title: "Sign in failed",
        description: "Check your credentials and try again.",
      });
      trackEvent("auth.sign_in_failed", { email });
      return;
    }

    showToast({
      kind: "success",
      title: "Signed in",
      description: "Redirecting to your workspace.",
    });
    trackEvent("auth.sign_in_success", { email });
    window.location.href = "/dashboard";
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 flex w-full max-w-sm flex-col gap-4 rounded-xl border border-card-border bg-background/40 p-6"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span>Email</span>
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Password</span>
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
        />
      </label>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
          Google
        </Button>
        <Button type="button" variant="outline" onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>
          GitHub
        </Button>
      </div>
      <p className="text-sm text-muted">
        New here?{" "}
        <Link href={"/signup" as Route} className="underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}
