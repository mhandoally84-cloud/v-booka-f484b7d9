import jsPDF from "jspdf";
import { format } from "date-fns";

export interface BookingPdfVenue {
  name?: string | null;
  building?: string | null;
  capacity?: number | null;
  expected_students?: number | null;
  programmes?: string[] | null;
}

export interface BookingPdfData {
  course_code: string;
  exam_title: string;
  department: string;
  exam_date: string;
  expected_students: number; // total across all venues
  special_requirements?: string | null;
  required_materials?: string | null;
  notes?: string | null;
  venues: BookingPdfVenue[];
  time_slot?: { label?: string | null; start_time?: string | null; end_time?: string | null } | null;
  lecturer?: string | null;
}

const NAVY: [number, number, number] = [30, 58, 138];
const GOLD: [number, number, number] = [245, 158, 11];
const PAGE_MARGIN_BOTTOM = 25;

export function generateBookingPdf(b: BookingPdfData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - PAGE_MARGIN_BOTTOM) {
      drawFooter(doc, pageW, pageH);
      doc.addPage();
      drawHeader(doc, pageW, false);
      y = 46;
    }
  };

  drawHeader(doc, pageW, true);

  y = 46;
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(`${b.course_code} — ${b.exam_title}`, pageW - 30);
  doc.text(titleLines, 15, y);
  y += titleLines.length * 7;
  doc.setTextColor(90, 90, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(b.department, 15, y);
  y += 8;

  const totalCapacity = b.venues.reduce((s, v) => s + (v.capacity ?? 0), 0);
  const venueCount = b.venues.length;

  const rows: Array<[string, string]> = [
    ["Date", format(new Date(b.exam_date), "EEEE, d MMMM yyyy")],
    ["Time", b.time_slot ? `${b.time_slot.label ?? ""} (${(b.time_slot.start_time ?? "").slice(0,5)}–${(b.time_slot.end_time ?? "").slice(0,5)})` : "—"],
    ["Venues", `${venueCount} venue${venueCount === 1 ? "" : "s"} allocated`],
    ["Students", `${b.expected_students} expected${totalCapacity ? ` · total capacity ${totalCapacity}` : ""}`],
    ["Lecturer", b.lecturer ?? "—"],
  ];

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  for (const [label, value] of rows) {
    ensureSpace(9);
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
  ensureSpace(10);
  section(doc, "Venues and sitting plan", y);
  y += 8;

  b.venues.forEach((v, i) => {
    const progs = v.programmes ?? [];
    // Estimate needed height
    const estimate = 22 + Math.ceil(Math.max(progs.length, 1) / 4) * 8;
    ensureSpace(estimate);

    // Venue header block
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(15, y - 4, pageW - 30, 10, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${i + 1}. ${v.name ?? "Venue"}`, 19, y + 2);
    const meta = `${v.building ?? ""}${v.capacity ? ` · cap ${v.capacity}` : ""}${v.expected_students ? ` · ${v.expected_students} students` : ""}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(meta, pageW - 19, y + 2, { align: "right" });
    y += 12;

    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PROGRAMMES SITTING HERE", 15, y);
    y += 5;

    if (progs.length > 0) {
      let x = 15;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      for (const p of progs) {
        const w = doc.getTextWidth(p) + 6;
        if (x + w > pageW - 15) { x = 15; y += 8; ensureSpace(8); }
        doc.setFillColor(245, 158, 11);
        doc.roundedRect(x, y - 4, w, 6, 1.5, 1.5, "F");
        doc.setTextColor(30, 58, 138);
        doc.setFont("helvetica", "bold");
        doc.text(p, x + 3, y);
        x += w + 3;
      }
      y += 8;
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(140, 140, 140);
      doc.text("Not specified.", 15, y);
      y += 7;
    }
    y += 3;
  });

  if (b.required_materials && b.required_materials.trim()) {
    y += 2;
    const lines = doc.splitTextToSize(b.required_materials, pageW - 40);
    ensureSpace(lines.length * 5 + 14);
    section(doc, "What to bring", y);
    y += 6;
    doc.setFillColor(255, 249, 235);
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
    ensureSpace(20);
    section(doc, "Special requirements", y); y += 6;
    y = paragraph(doc, b.special_requirements, y, pageW);
  }
  if (b.notes) {
    ensureSpace(20);
    section(doc, "Notes", y); y += 6;
    y = paragraph(doc, b.notes, y, pageW);
  }

  drawFooter(doc, pageW, pageH);
  return doc;
}

function drawHeader(doc: jsPDF, pageW: number, withDate: boolean) {
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
  if (withDate) {
    doc.setFontSize(9);
    doc.text(format(new Date(), "d MMM yyyy · HH:mm"), pageW - 15, 22, { align: "right" });
  }
}

function drawFooter(doc: jsPDF, pageW: number, pageH: number) {
  const footerY = pageH - 15;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(15, footerY - 4, pageW - 15, footerY - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Mzumbe University · Exam Venue Booking System", 15, footerY);
  doc.text("Share this notice with students sitting the exam.", pageW - 15, footerY, { align: "right" });
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
