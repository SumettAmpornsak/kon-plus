// Export Service for Kon Plus (JSON, PDF, CSV, Print)
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { recordAuditLog } from './auditService';
import { AUDIT_CATEGORIES } from '../utils/constants';

/**
 * Export data to JSON file and log audit
 */
export async function exportToJSON(data, filename = 'kon-plus-export.json', currentUser = null, reportTitle = 'ข้อมูล') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  triggerDownload(blob, filename);

  await recordAuditLog({
    category: AUDIT_CATEGORIES.IMPORT_EXPORT,
    action: 'Export JSON',
    description: `ส่งออกไฟล์ JSON: ${reportTitle} (${filename})`,
    user: currentUser
  });
}

/**
 * Export tabular data to CSV file and log audit
 */
export async function exportToCSV(dataArray, filename = 'kon-plus-export.csv', currentUser = null, reportTitle = 'รายงาน') {
  const csv = Papa.unparse(dataArray);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel Thai language support
  triggerDownload(blob, filename);

  await recordAuditLog({
    category: AUDIT_CATEGORIES.IMPORT_EXPORT,
    action: 'Export CSV',
    description: `ส่งออกไฟล์ CSV: ${reportTitle} (${filename}) จำนวน ${dataArray.length} แถว`,
    user: currentUser
  });
}

/**
 * Export data to PDF with clean styling and tables
 */
export async function exportToPDF({ title, subtitle, columns, rows, filename = 'kon-plus-report.pdf', currentUser = null }) {
  const doc = new jsPDF();

  // Header Title
  doc.setFontSize(18);
  doc.text(title, 14, 18);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 25);
  }

  // Table
  autoTable(doc, {
    startY: subtitle ? 30 : 25,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Brand Blue
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    }
  });

  doc.save(filename);

  await recordAuditLog({
    category: AUDIT_CATEGORIES.IMPORT_EXPORT,
    action: 'Export PDF',
    description: `ส่งออกไฟล์ PDF: ${title} (${filename})`,
    user: currentUser
  });
}

/**
 * Trigger browser print
 */
export async function triggerPrint(reportTitle = 'รายงาน', currentUser = null) {
  window.print();

  await recordAuditLog({
    category: AUDIT_CATEGORIES.IMPORT_EXPORT,
    action: 'Print',
    description: `พิมพ์เอกสาร/รายงาน: ${reportTitle}`,
    user: currentUser
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
