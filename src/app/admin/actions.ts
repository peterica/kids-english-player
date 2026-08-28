"use server";

import { revalidatePath } from "next/cache";
import { authorizeChild, requireSessionUser } from "@/lib/auth";
import { toUserMessage, AppError } from "@/lib/errors";
import {
  addVideoFromUrl,
  deleteVideo,
  moveVideo,
  renameVideo,
  setVideoEnabled,
} from "@/lib/videos";
import {
  createChild,
  renameChild,
  setChildEnabled,
  setChildPlaylist,
} from "@/lib/children";
import { resetPlaylistProgress } from "@/lib/progress-service";
import { setCompletionThreshold } from "@/lib/settings";
import type { ActionState } from "@/lib/action-state";

function refreshPages() {
  revalidatePath("/", "layout");
}

export async function addVideoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireSessionUser();
    const result = await addVideoFromUrl({
      url: String(formData.get("url") ?? ""),
      title: String(formData.get("title") ?? ""),
    });
    refreshPages();
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
    await requireSessionUser();
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
      case "delete":
        await deleteVideo(videoId);
        break;
      default:
        throw new AppError("알 수 없는 요청입니다.");
    }

    refreshPages();
    return { error: null, message: "변경했습니다." };
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
}

export async function addChildAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSessionUser();
    const child = await createChild(
      session.householdId,
      String(formData.get("name") ?? ""),
    );
    refreshPages();
    return { error: null, message: `${child.name} 등록 완료` };
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
}

export async function updateChildAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSessionUser();
    const childId = Number(formData.get("childId"));
    const intent = String(formData.get("intent") ?? "");

    switch (intent) {
      case "rename":
        await renameChild(session.householdId, childId, String(formData.get("name") ?? ""));
        break;
      case "enable":
        await setChildEnabled(session.householdId, childId, true);
        break;
      case "disable":
        await setChildEnabled(session.householdId, childId, false);
        break;
      case "playlist": {
        const playlistId = Number(formData.get("playlistId"));
        const playlist = await setChildPlaylist(session.householdId, childId, playlistId);
        refreshPages();
        return { error: null, message: `학습 과정을 ${playlist.title}로 바꿨습니다.` };
      }
      case "reset-playlist": {
        const playlistId = Number(formData.get("playlistId"));
        // 다른 가정의 아이를 초기화하지 못하도록 소유 관계를 먼저 확인한다.
        await authorizeChild(session.householdId, childId);
        await resetPlaylistProgress(childId, playlistId);
        refreshPages();
        return { error: null, message: "학습 기록을 초기화했습니다." };
      }
      default:
        throw new AppError("알 수 없는 요청입니다.");
    }

    refreshPages();
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
    await requireSessionUser();
    const threshold = Number(formData.get("completionThreshold"));
    if (!Number.isFinite(threshold) || threshold < 10 || threshold > 100) {
      throw new AppError("완료 기준은 10~100 사이의 값이어야 합니다.");
    }
    await setCompletionThreshold(threshold);
    refreshPages();
    return { error: null, message: "설정을 저장했습니다." };
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
}
