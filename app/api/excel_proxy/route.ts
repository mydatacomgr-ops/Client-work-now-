import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing Excel URL" }, { status: 400 });
    }

    const res = await fetch(fileUrl);
    if (!res.ok) {
      throw new Error("Failed to download file");
    }

    const contentType = res.headers.get("content-type") || "";

    let rows: any[] = [];
    let columns: string[] = [];

    // ✅ CASE 1: CSV (Google Sheets)
    if (fileUrl.includes("output=csv") || contentType.includes("text/csv")) {
      const buffer = await res.arrayBuffer();

      // 🔥 FORCE UTF-8 decoding
      const text = new TextDecoder("utf-8").decode(buffer);

      const workbook = XLSX.read(text, { type: "string" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
    }
    // ✅ CASE 2: XLSX / XLS
    else {
      const buffer = Buffer.from(await res.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
    }

    if (rows.length) {
      columns = Object.keys(rows[0]);
    }

    return NextResponse.json({ columns, rows });
  } catch (err) {
    console.error("Excel Proxy Error:", err);
    return NextResponse.json(
      { error: "Failed to process Excel file" },
      { status: 500 }
    );
  }
}
