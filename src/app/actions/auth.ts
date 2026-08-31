"use server";

import { redirect } from "next/navigation";
import { loginUser, signupUser } from "@/lib/auth";
import { createChild } from "@/lib/children";
import { endSession, startSession } from "@/lib/session";
import { toUserMessage } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";

export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let target = "/admin/children";
  try {
    const result = await signupUser({
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      householdName: String(formData.get("householdName") ?? ""),
    });

    const childName = String(formData.get("childName") ?? "").trim();
    if (childName) {
      await createChild(result.household.id, childName);
      target = "/admin";
    }
    await startSession(result.user.id);
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
  redirect(target);
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await loginUser(
      String(formData.get("username") ?? ""),
      String(formData.get("password") ?? ""),
    );
    await startSession(user.id);
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/intro");
}
