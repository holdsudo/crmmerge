import * as XLSX from "xlsx";
import { parseCsv } from "@/lib/csv";

function normalizeCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

export async function parseSpreadsheet(file: File) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith(".csv")) {
    return parseCsv(await file.text());
  }

  if (filename.endsWith(".xlsx")) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return [];
    }

    const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(workbook.Sheets[firstSheetName], {
      header: 1,
      raw: false
    });

    return rows
      .map((row) => row.map((cell) => normalizeCell(cell)))
      .filter((row) => row.some((cell) => cell.length > 0));
  }

  throw new Error("Unsupported file format. Upload a CSV or XLSX file.");
}
