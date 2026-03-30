import { prisma } from "@internet-passport/db";

export async function completeOnboardingForUser(input: {
  userId: string;
  organizationName: string;
  organizationSlug: string;
}) {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-tenant" },
    update: {},
    create: {
      name: "Demo Tenant",
      slug: "demo-tenant",
    },
  });

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: input.userId,
      },
    },
    update: {
      role: "ANALYST",
    },
    create: {
      tenantId: tenant.id,
      userId: input.userId,
      role: "ANALYST",
    },
  });

  const organization = await prisma.organization.create({
    data: {
      tenantId: tenant.id,
      ownerUserId: input.userId,
      name: input.organizationName,
      slug: input.organizationSlug,
      organizationType: "COMPANY",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: input.userId,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      organizationId: organization.id,
      userId: input.userId,
      role: "OWNER",
    },
  });
}
