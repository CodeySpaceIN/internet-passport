import { prisma } from "@internet-passport/db";

type VisibilityFlags = {
  displayName?: boolean;
  summary?: boolean;
  verificationBadges?: boolean;
  linkedPublicIdentities?: boolean;
  trustStatus?: boolean;
  organizationAssociation?: boolean;
  publicClaims?: boolean;
};

export type PublicTrustViewModel = {
  slug: string;
  status: string;
  entityType: "user" | "organization" | "agent";
  displayName: string | null;
  handle: string;
  summary: string | null;
  trustTier: string | null;
  trustScore: number | null;
  verificationBadges: string[];
  linkedPublicIdentities: string[];
  organizationAssociation: string | null;
  publicClaims: string[];
  publishedAt: Date | null;
};

function normalizeHandle(input: string) {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

function asVisibilityFlags(value: unknown): VisibilityFlags {
  if (!value || typeof value !== "object") return {};
  return value as VisibilityFlags;
}

function isPublic(flags: VisibilityFlags, key: keyof VisibilityFlags) {
  return flags[key] === true;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export async function resolvePublicTrustByHandle(handleInput: string) {
  const handle = normalizeHandle(handleInput);
  const profile = await prisma.publicTrustProfile.findFirst({
    where: {
      OR: [
        { slug: { equals: handle, mode: "insensitive" } },
        { slug: { equals: `agent-${handle}`, mode: "insensitive" } },
      ],
    },
    include: {
      user: {
        include: {
          identityProviderLinks: {
            where: { deletedAt: null },
            orderBy: { linkedAt: "desc" },
            take: 8,
          },
          verificationRecords: {
            where: { state: "PASSED" },
            orderBy: { completedAt: "desc" },
            take: 10,
          },
        },
      },
      organization: {
        include: {
          domains: {
            where: { status: "VERIFIED" },
            orderBy: { verifiedAt: "desc" },
            take: 10,
          },
          verificationRecords: {
            where: { state: "PASSED" },
            orderBy: { completedAt: "desc" },
            take: 10,
          },
        },
      },
      agent: {
        include: {
          verificationRecords: {
            where: { state: "PASSED" },
            orderBy: { completedAt: "desc" },
            take: 10,
          },
          organization: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!profile) return null;

  const visibility = asVisibilityFlags(profile.visibilityJson);
  const traits = typeof profile.traitsJson === "object" && profile.traitsJson !== null ? (profile.traitsJson as Record<string, unknown>) : {};
  const trustTier = profile.latestTier ?? null;
  const trustScore = profile.latestScore ?? null;

  const entityType: PublicTrustViewModel["entityType"] = profile.userId
    ? "user"
    : profile.organizationId
      ? "organization"
      : "agent";

  const rawDisplayName =
    profile.headline ??
    profile.user?.name ??
    profile.user?.email ??
    profile.organization?.name ??
    profile.agent?.displayName ??
    null;

  const summary = typeof profile.summary === "string" ? profile.summary : null;
  const linkedPublicIdentities = parseStringArray(
    entityType === "user"
      ? profile.user?.identityProviderLinks.map((item) => item.provider.toLowerCase())
      : traits.publicIdentities,
  );

  const verificationBadges = parseStringArray(
    entityType === "user"
      ? profile.user?.verificationRecords.map((item) => item.verificationType.toLowerCase())
      : entityType === "organization"
        ? [
            ...(profile.organization?.verificationRecords.map((item) => item.verificationType.toLowerCase()) ?? []),
            ...(profile.organization?.domains.map((item) => `domain:${item.domain}`) ?? []),
          ]
        : profile.agent?.verificationRecords.map((item) => item.verificationType.toLowerCase()),
  ).slice(0, 12);

  const viewModel: PublicTrustViewModel = {
    slug: profile.slug,
    status: profile.status,
    entityType,
    displayName: isPublic(visibility, "displayName") ? rawDisplayName : null,
    handle: profile.slug,
    summary: isPublic(visibility, "summary") ? summary : null,
    trustTier: isPublic(visibility, "trustStatus") ? trustTier : null,
    trustScore: isPublic(visibility, "trustStatus") ? trustScore : null,
    verificationBadges: isPublic(visibility, "verificationBadges") ? verificationBadges : [],
    linkedPublicIdentities: isPublic(visibility, "linkedPublicIdentities") ? linkedPublicIdentities : [],
    organizationAssociation:
      isPublic(visibility, "organizationAssociation") && profile.agent?.organization?.name
        ? profile.agent.organization.name
        : null,
    publicClaims: isPublic(visibility, "publicClaims") ? parseStringArray(traits.publicClaims) : [],
    publishedAt: profile.publishedAt,
  };

  return viewModel;
}
