"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@internet-passport/db";
import { getServerSessionOrRedirect } from "@/lib/auth/server";
import { getTenantIdFromSession } from "@/lib/data/app-dashboard";
import { writeAuditAndSignedAction } from "@/lib/audit/service";

export async function updateProfileAction(formData: FormData) {
  const session = await getServerSessionOrRedirect();
  const tenantId = getTenantIdFromSession(session);
  if (!tenantId) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Name cannot be empty.");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  await writeAuditAndSignedAction(
    {
      tenantId,
      actor: { type: "USER", userId: session.user.id },
      actionType: "PROFILE_UPDATED",
      targetType: "User",
      targetId: session.user.id,
      outcome: "SUCCESS",
      metadata: { fieldsUpdated: ["name"] },
    },
    {
      actionType: "PROFILE_UPDATED",
      targetType: "User",
      targetId: session.user.id,
      payload: { fieldsUpdated: ["name"] },
      contextType: "profile_settings",
    },
  );

  revalidatePath("/app/profile");
}
