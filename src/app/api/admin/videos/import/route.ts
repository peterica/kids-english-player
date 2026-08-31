import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { runImport } from "@/lib/admin/import-service";
import { errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const selectedRows = Array.isArray(body?.selectedRows)
      ? body.selectedRows.map(Number).filter((row: number) => Number.isInteger(row))
      : undefined;

    const result = await runImport({
      channelId: Number(body?.channelId),
      markdown: String(body?.markdown ?? ""),
      selectedRows,
    });

    return NextResponse.json({
      channel: result.channel,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      importedRows: result.importedRows,
      validCount: result.preview.validCount,
      duplicateCount: result.preview.duplicateCount,
      invalidCount: result.preview.invalidCount,
      rows: result.preview.rows,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
