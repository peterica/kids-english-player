"use server";

import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/auth";
import { startAutoPlaySession, endAutoPlaySession } from "@/lib/autoplay-service";
import { PLAY_MODE, type PlayMode } from "@/lib/constants";
import { toUserMessage } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";

export async function startAutoPlayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let childId = 0;
  try {
    const session = await requireSessionUser();
    childId = Number(formData.get("childId"));

    const rawChannel = String(formData.get("channelId") ?? "");
    const rawMinutes = String(formData.get("maxMinutes") ?? "");

    await startAutoPlaySession(session.householdId, childId, {
      channelId: rawChannel ? Number(rawChannel) : null,
      minLevel: Number(formData.get("minLevel")),
      maxLevel: Number(formData.get("maxLevel")),
      playMode:
        String(formData.get("playMode")) === PLAY_MODE.RANDOM
          ? PLAY_MODE.RANDOM
          : (PLAY_MODE.SEQUENTIAL as PlayMode),
      replayCompleted: String(formData.get("replayCompleted")) !== "false",
      maxMinutes: rawMinutes ? Number(rawMinutes) : null,
    });
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
  redirect(`/kids/${childId}/autoplay`);
}

export async function stopAutoPlayAction(formData: FormData): Promise<void> {
  const session = await requireSessionUser();
  const childId = Number(formData.get("childId"));
  await endAutoPlaySession(session.householdId, Number(formData.get("sessionId")));
  redirect(`/kids/${childId}`);
}
