import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTrustCardView, PublicTrustUnavailable } from "@/components/public/public-trust-card-view";
import { resolvePublicTrustByHandle } from "@/lib/data/public-trust";

type PublicTrustPageProps = {
  params: Promise<{ handle: string }>;
};

function normalizeHandle(input: string) {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

export async function generateMetadata({ params }: PublicTrustPageProps): Promise<Metadata> {
  const { handle } = await params;
  const normalized = normalizeHandle(handle);
  const card = await resolvePublicTrustByHandle(normalized);
  if (!card) {
    return {
      title: "Trust profile not found | Internet Passport",
      description: "Public trust profile not found.",
      robots: { index: false, follow: false },
    };
  }

  const title = card.displayName
    ? `${card.displayName} trust card | Internet Passport`
    : `@${card.handle} trust card | Internet Passport`;
  const description = card.summary ?? "Verified public trust profile powered by Internet Passport.";
  return {
    title,
    description,
    alternates: { canonical: `/trust/${card.handle}` },
    openGraph: {
      title,
      description,
      url: `/trust/${card.handle}`,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots:
      card.status === "PUBLISHED"
        ? { index: true, follow: true }
        : { index: false, follow: false },
  };
}

export default async function PublicTrustPage({ params }: PublicTrustPageProps) {
  const { handle } = await params;
  const normalized = normalizeHandle(handle);
  const card = await resolvePublicTrustByHandle(normalized);
  if (!card) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-[72vh] w-full max-w-5xl px-4 py-24 md:px-6">
      {card.status !== "PUBLISHED" ? (
        <PublicTrustUnavailable handle={normalized} />
      ) : (
        <PublicTrustCardView
          card={card}
          canonicalUrl={`https://internetpassport.dev/trust/${card.handle}`}
        />
      )}
    </main>
  );
}
