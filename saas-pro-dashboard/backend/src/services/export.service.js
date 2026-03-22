import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

export async function toExcel(rows, sheet = "Report") {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(sheet);
  if (rows.length) {
    ws.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 22 }));
    rows.forEach((r) => ws.addRow(r));
  }
  return workbook.xlsx.writeBuffer();
}

export function toPdf(reportTitle, rows) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 24 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.fontSize(16).text(reportTitle);
    doc.moveDown();
    rows.forEach((r, idx) => {
      doc.fontSize(11).text(`${idx + 1}. ${JSON.stringify(r)}`);
    });
    doc.end();
  });
}

