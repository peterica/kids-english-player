import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import {
  deleteAdminVideo,
  getVideoForAdmin,
  updateAdminVideo,
} from "@/lib/admin/videos";
import { errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    return NextResponse.json({ video: await getVideoForAdmin(Number(id)) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json();
    const video = await updateAdminVideo(Number(id), {
      channelId: Number(body?.channelId),
      level: Number(body?.level),
      title: String(body?.title ?? ""),
      category: String(body?.category ?? ""),
      publisher: String(body?.publisher ?? ""),
      youtubeUrl: String(body?.youtubeUrl ?? ""),
      enabled: body?.enabled === undefined ? undefined : body.enabled === true,
    });
    return NextResponse.json({ video });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const deleted = await deleteAdminVideo(Number(id));
    return NextResponse.json({ deleted: { id: deleted.id, title: deleted.title } });
  } catch (error) {
    return errorResponse(error);
  }
}
