import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { completeOnboardingForUser } from "@/lib/auth/onboarding";

const completeOnboardingSchema = z.object({
  organizationName: z.string().min(2).max(120),
  organizationSlug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = completeOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: "Invalid onboarding payload." },
      { status: 400 },
    );
  }

  try {
    await completeOnboardingForUser({
      userId: session.user.id,
      organizationName: parsed.data.organizationName,
      organizationSlug: parsed.data.organizationSlug,
    });
  } catch {
    return NextResponse.json(
      { code: "ONBOARDING_FAILED", message: "Organization slug is unavailable. Try another one." },
      { status: 409 },
    );
  }

  return NextResponse.json({ code: "OK" });
}
