import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { listCorrectionRequestsForAdmin } from "@/lib/correction-requests";
import { errorResponse, readInt } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const requests = await listCorrectionRequestsForAdmin({
      status: searchParams.get("status"),
      errorType: searchParams.get("errorType"),
      videoId: readInt(searchParams.get("videoId")),
    });
    return NextResponse.json({ count: requests.length, requests });
  } catch (error) {
    return errorResponse(error);
  }
}
