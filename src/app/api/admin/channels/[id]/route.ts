import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { deleteChannel, updateChannel } from "@/lib/admin/channels";
import { errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json();
    const channel = await updateChannel(Number(id), {
      name: String(body?.name ?? ""),
      enabled: body?.enabled === undefined ? undefined : body.enabled === true,
    });
    return NextResponse.json({ channel });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const deleted = await deleteChannel(Number(id));
    return NextResponse.json({ deleted: { id: deleted.id, name: deleted.name } });
  } catch (error) {
    return errorResponse(error);
  }
}
