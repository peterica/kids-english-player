"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endParentSession, hasParentSession } from "@/lib/session";
import { AppError, toUserMessage } from "@/lib/errors";
import {
  addVideoFromUrl,
  deleteVideo,
  moveVideo,
  renameVideo,
  setVideoEnabled,
} from "@/lib/videos";
import { resetProgress } from "@/lib/progress-service";
import { setCompletionThreshold, setSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/constants";
import { hashPin, isValidPinFormat } from "@/lib/pin";

import type { ActionState } from "@/lib/action-state";

async function requireParent() {
  if (!(await hasParentSession())) {
    throw new AppError("부모 모드 인증이 필요합니다. 다시 로그인해 주세요.");
  }
}

function refreshAdminPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/videos");
  revalidatePath("/");
}

export async function logout(): Promise<void> {
  await endParentSession();
  redirect("/");
}

export async function addVideoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireParent();
    const url = String(formData.get("url") ?? "");
    const title = String(formData.get("title") ?? "");
    const result = await addVideoFromUrl({ url, title });
    refreshAdminPages();
    return {
      error: null,
      message: result.titleFetched
        ? `등록했습니다: ${result.video.title}`
        : `등록했습니다: ${result.video.title} (제목을 자동으로 가져오지 못했습니다. 필요하면 수정해 주세요.)`,
    };
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
}

export async function updateVideoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireParent();
    const videoId = Number(formData.get("videoId"));
    const intent = String(formData.get("intent") ?? "");

    switch (intent) {
      case "rename":
        await renameVideo(videoId, String(formData.get("title") ?? ""));
        break;
      case "enable":
        await setVideoEnabled(videoId, true);
        break;
      case "disable":
        await setVideoEnabled(videoId, false);
        break;
      case "up":
      case "down":
        await moveVideo(videoId, intent);
        break;
      case "reset":
        await resetProgress(videoId);
        break;
      case "delete":
        await deleteVideo(videoId);
        break;
      default:
        throw new AppError("알 수 없는 요청입니다.");
    }

    refreshAdminPages();
    return { error: null, message: "변경했습니다." };
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
}

export async function updateSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireParent();
    const threshold = Number(formData.get("completionThreshold"));
    if (!Number.isFinite(threshold) || threshold < 10 || threshold > 100) {
      throw new AppError("완료 기준은 10~100 사이의 값이어야 합니다.");
    }
    await setCompletionThreshold(threshold);

    const newPin = String(formData.get("pin") ?? "").trim();
    if (newPin) {
      if (!isValidPinFormat(newPin)) {
        throw new AppError("PIN은 숫자 4~6자리여야 합니다.");
      }
      await setSetting(SETTING_KEYS.parentPinHash, hashPin(newPin));
    }

    refreshAdminPages();
    return {
      error: null,
      message: newPin ? "설정과 PIN을 변경했습니다." : "설정을 변경했습니다.",
    };
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
}
