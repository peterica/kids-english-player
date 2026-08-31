import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { updateCorrectionRequestStatus } from "@/lib/correction-requests";
import { errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json();
    const updated = await updateCorrectionRequestStatus(
      Number(id),
      String(body?.status ?? ""),
    );
    return NextResponse.json({ request: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
