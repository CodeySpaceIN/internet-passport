"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { trackEvent } from "@/lib/analytics/client";

export function OnboardingForm() {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ organizationName, organizationSlug }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(data?.message ?? "Could not complete onboarding.");
      showToast({
        kind: "error",
        title: "Onboarding failed",
        description: data?.message ?? "Could not complete onboarding.",
      });
      trackEvent("onboarding.failed", {
        organizationSlug,
      });
      return;
    }

    showToast({
      kind: "success",
      title: "Organization created",
      description: "Your workspace is ready.",
    });
    trackEvent("onboarding.completed", {
      organizationSlug,
    });
    window.location.href = "/dashboard";
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 flex w-full max-w-md flex-col gap-4 rounded-xl border border-card-border bg-background/40 p-6"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span>Organization name</span>
        <Input
          value={organizationName}
          onChange={(event) => setOrganizationName(event.target.value)}
          placeholder="Acme Trust Labs"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Organization slug</span>
        <Input
          value={organizationSlug}
          onChange={(event) => setOrganizationSlug(event.target.value)}
          placeholder="acme-trust-labs"
          required
        />
      </label>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Finish onboarding"}
      </Button>
    </form>
  );
}
