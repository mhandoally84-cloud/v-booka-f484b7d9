import jsPDF from "jspdf";
import { format } from "date-fns";

export interface BookingPdfData {
  course_code: string;
  exam_title: string;
  department: string;
  exam_date: string;
  expected_students: number;
  special_requirements?: string | null;
  required_materials?: string | null;
  notes?: string | null;
  programmes?: string[] | null;
  venue?: { name?: string | null; building?: string | null; capacity?: number | null } | null;
  time_slot?: { label?: string | null; start_time?: string | null; end_time?: string | null } | null;
  lecturer?: string | null;
}

const NAVY: [number, number, number] = [30, 58, 138];
const GOLD: [number, number, number] = [245, 158, 11];

export function generateBookingPdf(b: BookingPdfData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 0;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 32, pageW, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MZUMBE UNIVERSITY", 15, 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Official Exam Venue Notice", 15, 22);
  doc.setFontSize(9);
  doc.text(format(new Date(), "d MMM yyyy · HH:mm"), pageW - 15, 22, { align: "right" });

  y = 46;
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`${b.course_code} — ${b.exam_title}`, 15, y);
  y += 6;
  doc.setTextColor(90, 90, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(b.department, 15, y);
  y += 10;

  const rows: Array<[string, string]> = [
    ["Date", format(new Date(b.exam_date), "EEEE, d MMMM yyyy")],
    ["Time", b.time_slot ? `${b.time_slot.label ?? ""} (${(b.time_slot.start_time ?? "").slice(0,5)}–${(b.time_slot.end_time ?? "").slice(0,5)})` : "—"],
    ["Venue", b.venue ? `${b.venue.name ?? ""} · ${b.venue.building ?? ""}` : "—"],
    ["Capacity", b.venue?.capacity ? `${b.expected_students} students (venue capacity ${b.venue.capacity})` : `${b.expected_students} students`],
    ["Lecturer", b.lecturer ?? "—"],
  ];

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  for (const [label, value] of rows) {
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label.toUpperCase(), 15, y);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(value, pageW - 60);
    doc.text(lines, 55, y);
    y += Math.max(7, lines.length * 5.5);
    doc.line(15, y - 2, pageW - 15, y - 2);
  }

  y += 4;
  section(doc, "Programmes sitting this exam", y);
  y += 6;
  if (b.programmes && b.programmes.length > 0) {
    let x = 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const p of b.programmes) {
      const w = doc.getTextWidth(p) + 6;
      if (x + w > pageW - 15) { x = 15; y += 8; }
      doc.setFillColor(30, 58, 138);
      doc.roundedRect(x, y - 4, w, 6, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(p, x + 3, y);
      x += w + 3;
    }
    y += 10;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Not specified.", 15, y);
    y += 8;
  }

  if (b.required_materials && b.required_materials.trim()) {
    y += 2;
    section(doc, "What to bring", y);
    y += 6;
    doc.setFillColor(255, 249, 235);
    const lines = doc.splitTextToSize(b.required_materials, pageW - 40);
    const h = lines.length * 5 + 6;
    doc.rect(15, y - 4, pageW - 30, h, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.8);
    doc.line(15, y - 4, 15, y - 4 + h);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(lines, 20, y);
    y += h + 4;
  }

  if (b.special_requirements) {
    section(doc, "Special requirements", y); y += 6;
    y = paragraph(doc, b.special_requirements, y, pageW);
  }
  if (b.notes) {
    section(doc, "Notes", y); y += 6;
    y = paragraph(doc, b.notes, y, pageW);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(15, footerY - 4, pageW - 15, footerY - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Mzumbe University · Exam Venue Booking System", 15, footerY);
  doc.text("Share this notice with students sitting the exam.", pageW - 15, footerY, { align: "right" });

  return doc;
}

function section(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(30, 58, 138);
  doc.rect(15, y - 4, 3, 5, "F");
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, 21, y);
}

function paragraph(doc: jsPDF, text: string, y: number, pageW: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const lines = doc.splitTextToSize(text, pageW - 30);
  doc.text(lines, 15, y);
  return y + lines.length * 5 + 6;
}

export function downloadBookingPdf(b: BookingPdfData) {
  const doc = generateBookingPdf(b);
  const safe = `${b.course_code}-${b.exam_title}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`exam-${safe}.pdf`);
}

export async function shareBookingPdf(b: BookingPdfData): Promise<boolean> {
  const doc = generateBookingPdf(b);
  const safe = `${b.course_code}-${b.exam_title}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const filename = `exam-${safe}.pdf`;
  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav: any = typeof navigator !== "undefined" ? navigator : null;
  if (nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: `${b.course_code} exam details`, text: `${b.course_code} — ${b.exam_title}` });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
