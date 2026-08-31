import { NextResponse } from "next/server";
import { requireParentSession } from "@/lib/auth";
import { listMyCorrectionRequests } from "@/lib/correction-requests";
import { errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireParentSession();
    const requests = await listMyCorrectionRequests(session.userId);
    return NextResponse.json({ count: requests.length, requests });
  } catch (error) {
    return errorResponse(error);
  }
}
