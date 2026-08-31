"use server";

import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/auth";
import { endAutoPlaySession } from "@/lib/autoplay-service";

export async function stopAutoPlayAction(formData: FormData): Promise<void> {
  const session = await requireSessionUser();
  const childId = Number(formData.get("childId"));
  await endAutoPlaySession(session.householdId, Number(formData.get("sessionId")));
  redirect(`/kids/${childId}`);
}
