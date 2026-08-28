"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth";
import { AppError, toUserMessage } from "@/lib/errors";
import {
  createChild,
  renameChild,
  setChildEnabled,
  updateChildPreference,
} from "@/lib/children";
import {
  addCustomVideo,
  addVideoToCollection,
  getOrCreateChildCollection,
  moveCollectionVideo,
  removeVideoFromCollection,
  setCollectionVideoEnabled,
} from "@/lib/collections";
import { setCompletionThreshold } from "@/lib/settings";
import type { ActionState } from "@/lib/action-state";

function refresh() {
  revalidatePath("/", "layout");
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
    refresh();
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
      default:
        throw new AppError("알 수 없는 요청입니다.");
    }

    refresh();
    return { error: null, message: "변경했습니다." };
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
}

/** 아이별 허용 Level 범위 + 선호 Channel */
export async function updatePreferenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSessionUser();
    const childId = Number(formData.get("childId"));
    const channelIds = formData
      .getAll("channelIds")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    await updateChildPreference(session.householdId, childId, {
      minLevel: Number(formData.get("minLevel")),
      maxLevel: Number(formData.get("maxLevel")),
      channelIds,
    });

    refresh();
    return { error: null, message: "콘텐츠 설정을 저장했습니다." };
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
}

/** Library 화면에서 특정 아이 Collection 으로 담기 */
export async function addToCollectionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSessionUser();
    const childId = Number(formData.get("childId"));
    const videoId = Number(formData.get("videoId"));

    const collection = await getOrCreateChildCollection(session.householdId, childId);
    const result = await addVideoToCollection(
      session.householdId,
      collection.id,
      videoId,
    );

    refresh();
    return {
      error: null,
      message: result.added
        ? `Collection에 담았습니다: ${result.title}`
        : result.restored
          ? `다시 보이도록 되돌렸습니다: ${result.title}`
          : `이미 Collection에 있습니다: ${result.title}`,
    };
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
}

export async function collectionVideoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSessionUser();
    const collectionId = Number(formData.get("collectionId"));
    const videoId = Number(formData.get("videoId"));
    const intent = String(formData.get("intent") ?? "");

    switch (intent) {
      case "hide":
        await setCollectionVideoEnabled(session.householdId, collectionId, videoId, false);
        break;
      case "show":
        await setCollectionVideoEnabled(session.householdId, collectionId, videoId, true);
        break;
      case "remove":
        await removeVideoFromCollection(session.householdId, collectionId, videoId);
        break;
      case "up":
      case "down":
        await moveCollectionVideo(session.householdId, collectionId, videoId, intent);
        break;
      default:
        throw new AppError("알 수 없는 요청입니다.");
    }

    refresh();
    return { error: null, message: "변경했습니다." };
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
}

/** 부모가 YouTube 주소로 직접 등록 */
export async function addCustomVideoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSessionUser();
    const collectionId = Number(formData.get("collectionId"));

    const result = await addCustomVideo(session.householdId, collectionId, {
      url: String(formData.get("url") ?? ""),
      title: String(formData.get("title") ?? ""),
      channelId: Number(formData.get("channelId")),
      level: Number(formData.get("level")),
      category: String(formData.get("category") ?? "STORY"),
    });

    refresh();
    return {
      error: null,
      message: result.titleFetched
        ? `등록했습니다: ${result.video.title}`
        : `등록했습니다: ${result.video.title} (제목을 자동으로 가져오지 못해 입력값/기본값을 사용했습니다.)`,
    };
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
      throw new AppError("완료 기준은 10~100 사이여야 합니다.");
    }
    await setCompletionThreshold(threshold);
    refresh();
    return { error: null, message: "저장했습니다." };
  } catch (error) {
    return { error: toUserMessage(error), message: null };
  }
}
