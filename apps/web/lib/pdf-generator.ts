import jsPDF from "jspdf";
import "jspdf-autotable";
import { Referral, ClinicalSummary, Differential } from "../types/referral";

export const generateReferralPDF = (referral: Referral) => {
  const doc = new jsPDF();
  const patientName = referral.patientName || "N/A";
  const refId = `REF-${referral.id.slice(0, 8).toUpperCase()}`;
  const dateStr = referral.createdAt ? new Date(referral.createdAt).toLocaleDateString() : "N/A";

  // Branding & Header
  doc.setFillColor(61, 155, 255); // MedBridge Blue
  doc.rect(0, 0, 210, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("MedBridge Intelligence", 20, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Clinical Referral Packet • Digital Handover Document", 20, 32);

  // Referral Info Box
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("REFERRAL INFORMATION", 20, 55);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Referral ID: ${refId}`, 20, 62);
  doc.text(`Date Issued: ${dateStr}`, 20, 67);
  doc.text(`Priority: ${referral.priority?.toUpperCase()}`, 20, 72);
  doc.text(`Status: ${referral.status?.toUpperCase()}`, 20, 77);

  // Patient Info Box (Right Side)
  doc.setFont("helvetica", "bold");
  doc.text("PATIENT DETAILS", 120, 55);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${patientName}`, 120, 62);
  doc.text(`Age/Sex: ${referral.patientAge}yr / ${referral.patientSex}`, 120, 67);

  // Divider
  doc.setDrawColor(230, 230, 230);
  doc.line(20, 85, 190, 85);

  // Case Clinical Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CLINICAL CASE SUMMARY", 20, 100);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  const clinicalSummary: ClinicalSummary | null = typeof referral.clinicalSummary === "string" 
    ? (JSON.parse(referral.clinicalSummary) as ClinicalSummary)
    : referral.clinicalSummary;
    
  const summaryText = clinicalSummary?.summary || referral.notes || "No additional notes provided.";
  const splitSummary = doc.splitTextToSize(summaryText, 170) as string[];
  doc.text(splitSummary, 20, 108);

  const summaryHeight = (splitSummary.length * 5) + 115;

  // Differentials Table
  if (clinicalSummary?.differentials && clinicalSummary.differentials.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("DIFFERENTIAL DIAGNOSES", 20, summaryHeight);
    
    const tableData = clinicalSummary.differentials.map((d: Differential) => [
      d.condition || d.diagnosis || "N/A",
      `${Math.round(d.confidence > 1 ? d.confidence : d.confidence * 100)}%`,
      d.urgency || "N/A",
      doc.splitTextToSize(d.reasoning || "", 70) as string[]
    ]);

    // @ts-expect-error - autoTable is added by jspdf-autotable plugin
    doc.autoTable({
      startY: summaryHeight + 5,
      head: [["Diagnosis", "Confidence", "Urgency", "Reasoning"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [61, 155, 255] },
      margin: { left: 20 },
      styles: { fontSize: 9 }
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `MedBridge Clinical Handover Protocol • Authenticated by ${referral.sendingDoctorName || "MedBridge Platform"}`,
      20,
      285
    );
    doc.text(`Page ${i} of ${pageCount}`, 180, 285);
  }

  doc.save(`${refId}_${patientName.replace(/\s+/g, "_")}.pdf`);
};
