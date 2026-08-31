import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createChannel, listChannelsForAdmin } from "@/lib/admin/channels";
import { errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const channels = await listChannelsForAdmin();
    return NextResponse.json({ count: channels.length, channels });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const channel = await createChannel({
      name: String(body?.name ?? ""),
      enabled: body?.enabled === undefined ? undefined : body.enabled === true,
    });
    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
