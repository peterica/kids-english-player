import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth";
import { endAutoPlaySession } from "@/lib/autoplay-service";
import { toUserMessage } from "@/lib/errors";
import { readId } from "@/lib/request";

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser();
    const body = await request.json();
    await endAutoPlaySession(session.householdId, readId(body?.sessionId, "sessionId"));
    return NextResponse.json({ ended: true });
  } catch (error) {
    return NextResponse.json({ error: toUserMessage(error) }, { status: 400 });
  }
}
