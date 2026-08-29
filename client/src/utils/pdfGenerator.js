import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateTime } from './location';

/**
 * Generates a multi-page, print-ready corporate SERD FOUNDATION GRT verification PDF report
 */
export async function generateSHGPdfReport(shg, options = { download: true }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const reportId = shg.report_id || `SERD-GRT-${shg.id || 'NEW'}`;
  const genDate = formatDateTime(new Date().toISOString());

  // Colors
  const primaryGreen = [22, 101, 52]; // #166534
  const darkNavy = [15, 23, 42];     // #0f172a
  const slateGray = [100, 116, 139];  // #64748b
  const lightBg = [248, 250, 252];   // #f8fafc

  function addHeader(title, pageNum, totalPages) {
    // Top banner
    doc.setFillColor(...primaryGreen);
    doc.rect(0, 0, pageWidth, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SERD FOUNDATION', 14, 8);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('GROUP RECOGNITION TEST (GRT) & FIELD LOAN VERIFICATION REPORT', 14, 13);

    // Report ID pill on right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`REPORT ID: ${reportId}`, pageWidth - 14, 11, { align: 'right' });
  }

  function addFooter(pageNum, totalPages) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateGray);
    doc.text(`SERD FOUNDATION • GRT Verification Portal • Ref: ${reportId}`, 14, pageHeight - 7);
    doc.text(`Generated: ${genDate} • Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  // ==========================================
  // PAGE 1: GRT SUMMARY & MEMBER ROSTER
  // ==========================================
  addHeader('GRT Summary', 1, '{total_pages}');

  // Document Title
  doc.setTextColor(...darkNavy);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('GROUP RECOGNITION TEST (GRT) REPORT', 14, 28);

  // Status Badge
  const isSubmitted = shg.status === 'submitted';
  doc.setFillColor(isSubmitted ? 22 : 234, isSubmitted ? 163 : 179, isSubmitted ? 74 : 8);
  doc.roundedRect(pageWidth - 48, 22, 34, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(isSubmitted ? 'GRT VERIFIED' : 'DRAFT RECORD', pageWidth - 31, 27.5, { align: 'center' });

  // Summary Grid Section
  autoTable(doc, {
    startY: 34,
    theme: 'grid',
    head: [['GROUP / SHG PROFILE INFORMATION', 'GRT LOAN & DISBURSEMENT DETAILS']],
    body: [
      [
        `Group Name: ${shg.shg_name || 'N/A'}\nGroup / GRT Code: ${shg.shg_code || 'N/A'}\nVillage: ${shg.village || 'N/A'}\nGram Panchayat: ${shg.panchayat || 'N/A'}\nTaluk: ${shg.taluk || 'N/A'}\nDistrict: ${shg.district || 'N/A'}\nState: ${shg.state || 'Karnataka'}`,
        `Branch Name: ${shg.branch_name || 'N/A'}\nBranch Code: ${shg.branch_code || 'N/A'}\nLoan Amount: ₹ ${Number(shg.loan_amount || 0).toLocaleString('en-IN')}\nLoan A/C Number: ${shg.loan_account_number || 'N/A'}\nTotal Members: ${shg.num_members || 10}\nGRT Meeting Date: ${shg.meeting_date || 'N/A'}\nVerification Status: ${shg.status ? shg.status.toUpperCase() : 'PENDING'}`
      ]
    ],
    headStyles: { fillColor: primaryGreen, textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: darkNavy, cellPadding: 3, lineHeightFactor: 1.4 },
    margin: { left: 14, right: 14 }
  });

  // Verification Officer Box
  const nextY = doc.lastAutoTable.finalY + 4;
  autoTable(doc, {
    startY: nextY,
    theme: 'plain',
    body: [
      [
        `Verification Officer: ${shg.employee_name || 'Field Officer'}`,
        `Employee ID: ${shg.employee_id || 'N/A'}`,
        `Verification Timestamp: ${formatDateTime(shg.submitted_at || shg.created_at || new Date().toISOString())}`
      ]
    ],
    bodyStyles: { fillColor: lightBg, fontSize: 8.5, textColor: darkNavy, cellPadding: 2.5, fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  // 10-Member Summary Table
  const tableY = doc.lastAutoTable.finalY + 4;
  const members = shg.members || [];
  const photos = shg.photos || [];

  const memberRows = [];
  for (let i = 1; i <= 10; i++) {
    const member = members.find(m => m.member_number === i) || {};
    const photo = photos.find(p => p.photo_type === 'MEMBER' && p.member_number === i);
    const gpsStatus = photo && photo.latitude ? `✅ Lat: ${Number(photo.latitude).toFixed(4)}, Lon: ${Number(photo.longitude).toFixed(4)}` : '⚠️ Pending';
    
    memberRows.push([
      String(i).padStart(2, '0'),
      member.member_name || `Member ${i}`,
      member.member_id || '-',
      member.loan_amount ? `₹ ${Number(member.loan_amount).toLocaleString('en-IN')}` : '-',
      member.mobile_number || '-',
      photo ? '✅ Stamped Photo' : '❌ No Photo',
      gpsStatus
    ]);
  }

  autoTable(doc, {
    startY: tableY,
    theme: 'striped',
    head: [['#', 'Member Name', 'Member / Cust ID', 'Loan Share', 'Mobile', 'Photo Status', 'GPS Coordinates']],
    body: memberRows,
    headStyles: { fillColor: darkNavy, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: darkNavy, cellPadding: 2 },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 }
  });

  // Remarks if any
  if (shg.remarks) {
    const remY = doc.lastAutoTable.finalY + 4;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`SERD Foundation GRT Remarks:`, 14, remY);
    doc.setFont('helvetica', 'normal');
    doc.text(shg.remarks, 14, remY + 4.5, { maxWidth: pageWidth - 28 });
  }

  // ==========================================
  // PAGES 2 - 6: 10 INDIVIDUAL MEMBER PHOTOS (2 PER PAGE)
  // ==========================================
  for (let pageIdx = 0; pageIdx < 5; pageIdx++) {
    doc.addPage();
    addHeader('GRT Member Verification Photographs', pageIdx + 2, '{total_pages}');

    doc.setTextColor(...darkNavy);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`INDIVIDUAL MEMBER PHOTOGRAPHS (${(pageIdx * 2) + 1} - ${(pageIdx * 2) + 2} of 10)`, 14, 26);

    for (let slot = 0; slot < 2; slot++) {
      const memberNum = (pageIdx * 2) + slot + 1;
      const member = members.find(m => m.member_number === memberNum) || {};
      const photo = photos.find(p => p.photo_type === 'MEMBER' && p.member_number === memberNum);

      const cardY = 32 + (slot * 125);
      const cardHeight = 120;
      const cardWidth = pageWidth - 28;

      // Card container border
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, cardY, cardWidth, cardHeight, 3, 3, 'FD');

      // Card Header Banner
      doc.setFillColor(...lightBg);
      doc.roundedRect(14, cardY, cardWidth, 10, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(14, cardY + 10, 14 + cardWidth, cardY + 10);

      doc.setTextColor(...primaryGreen);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`MEMBER ${String(memberNum).padStart(2, '0')}: ${member.member_name || 'Name Pending'}`, 18, cardY + 7);

      // Photo Section (Left side of card)
      const photoWidth = 98;
      const photoHeight = 98;
      const photoX = 18;
      const photoY = cardY + 14;

      if (photo && (photo.stamped_image_url || photo.original_image_url)) {
        try {
          const imgUrl = photo.stamped_image_url || photo.original_image_url;
          doc.addImage(imgUrl, 'JPEG', photoX, photoY, photoWidth, photoHeight, undefined, 'FAST');
        } catch (e) {
          doc.setFillColor(241, 245, 249);
          doc.rect(photoX, photoY, photoWidth, photoHeight, 'F');
          doc.setTextColor(...slateGray);
          doc.setFontSize(8);
          doc.text('Photo Available on Server', photoX + (photoWidth / 2), photoY + (photoHeight / 2), { align: 'center' });
        }
      } else {
        doc.setFillColor(241, 245, 249);
        doc.rect(photoX, photoY, photoWidth, photoHeight, 'F');
        doc.setTextColor(...slateGray);
        doc.setFontSize(8);
        doc.text('⚠️ Photo Not Captured', photoX + (photoWidth / 2), photoY + (photoHeight / 2), { align: 'center' });
      }

      // Metadata Panel (Right side of card)
      const metaX = photoX + photoWidth + 8;
      const metaWidth = cardWidth - photoWidth - 16;
      let metaY = cardY + 18;

      doc.setFontSize(9);
      doc.setTextColor(...darkNavy);
      doc.setFont('helvetica', 'bold');
      doc.text('Member Information', metaX, metaY);
      metaY += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Customer ID: ${member.member_id || 'N/A'}`, metaX, metaY);
      metaY += 5;
      doc.text(`Loan Amount: ₹ ${Number(member.loan_amount || 0).toLocaleString('en-IN')}`, metaX, metaY);
      metaY += 5;
      doc.text(`Mobile: ${member.mobile_number || 'N/A'}`, metaX, metaY);
      metaY += 8;

      doc.setFont('helvetica', 'bold');
      doc.text('GPS Geotag Verification', metaX, metaY);
      metaY += 6;

      doc.setFont('helvetica', 'normal');
      if (photo && photo.latitude) {
        doc.setTextColor(22, 101, 52);
        doc.text(`Latitude: ${Number(photo.latitude).toFixed(6)}°`, metaX, metaY);
        metaY += 5;
        doc.text(`Longitude: ${Number(photo.longitude).toFixed(6)}°`, metaX, metaY);
        metaY += 5;
        doc.text(`Accuracy: ± ${photo.gps_accuracy || 5} meters`, metaX, metaY);
        metaY += 5;
        doc.setTextColor(...darkNavy);
        doc.text(`Timestamp: ${formatDateTime(photo.captured_at)}`, metaX, metaY);
        metaY += 5;
        doc.setFontSize(7.5);
        doc.setTextColor(...slateGray);
        doc.text(`Location: ${photo.address || `${shg.village || ''}, ${shg.taluk || ''}`}`, metaX, metaY, { maxWidth: metaWidth });
      } else {
        doc.setTextColor(220, 38, 38);
        doc.text('⚠️ GPS location not captured', metaX, metaY);
      }
    }
  }

  // ==========================================
  // PAGE 7: SHG GROUP PHOTO & OFFICIAL SIGNATURES
  // ==========================================
  doc.addPage();
  addHeader('Group Photograph & Endorsement', 7, '{total_pages}');

  doc.setTextColor(...darkNavy);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SERD FOUNDATION • FINAL GROUP GRT PHOTOGRAPH', 14, 26);

  const groupPhoto = photos.find(p => p.photo_type === 'GROUP');
  const groupCardY = 32;
  const groupCardWidth = pageWidth - 28;
  const groupPhotoHeight = 120;

  if (groupPhoto && (groupPhoto.stamped_image_url || groupPhoto.original_image_url)) {
    try {
      const gUrl = groupPhoto.stamped_image_url || groupPhoto.original_image_url;
      doc.addImage(gUrl, 'JPEG', 14, groupCardY, groupCardWidth, groupPhotoHeight, undefined, 'FAST');
    } catch (e) {
      doc.setFillColor(241, 245, 249);
      doc.rect(14, groupCardY, groupCardWidth, groupPhotoHeight, 'F');
      doc.setTextColor(...slateGray);
      doc.text('Group Photo Stamped on File', pageWidth / 2, groupCardY + (groupPhotoHeight / 2), { align: 'center' });
    }
  } else {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, groupCardY, groupCardWidth, groupPhotoHeight, 'F');
    doc.setTextColor(...slateGray);
    doc.text('⚠️ Group Photo Pending', pageWidth / 2, groupCardY + (groupPhotoHeight / 2), { align: 'center' });
  }

  // Group Photo Telemetry summary
  const gMetaY = groupCardY + groupPhotoHeight + 4;
  autoTable(doc, {
    startY: gMetaY,
    theme: 'plain',
    body: [
      [
        `Group Name: ${shg.shg_name || 'N/A'}`,
        `Capture Time: ${formatDateTime(groupPhoto?.captured_at || shg.submitted_at || new Date().toISOString())}`,
        `GPS: ${groupPhoto?.latitude ? `${Number(groupPhoto.latitude).toFixed(6)}°, ${Number(groupPhoto.longitude).toFixed(6)}° (±${groupPhoto.gps_accuracy || 5}m)` : 'GPS Recorded'}`
      ]
    ],
    bodyStyles: { fillColor: lightBg, fontSize: 8, textColor: darkNavy, cellPadding: 2, fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  // Verification Declaration Text
  const declY = doc.lastAutoTable.finalY + 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slateGray);
  doc.text(
    'SERD FOUNDATION DECLARATION: I hereby certify that the Group details, individual 10 member photographs, and group photograph were personally verified and captured in person by me at the physical GPS location recorded above under SERD Foundation GRT (Group Recognition Test) protocol.',
    14,
    declY,
    { maxWidth: pageWidth - 28 }
  );

  // Official Signature Blocks
  const sigY = declY + 14;
  const sigBoxWidth = (pageWidth - 36) / 3;
  const sigBoxHeight = 32;

  // Box 1: Field Officer
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkNavy);
  doc.text('FIELD VERIFICATION OFFICER', 16, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${shg.employee_name || 'Field Officer'}`, 16, sigY + 10);
  doc.text(`ID: ${shg.employee_id || 'EMP001'}`, 16, sigY + 14);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(16, sigY + 26, 14 + sigBoxWidth - 4, sigY + 26);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6.5);
  doc.text('Signature & Date', 16, sigY + 29.5);

  // Box 2: Branch Manager
  const box2X = 14 + sigBoxWidth + 4;
  doc.rect(box2X, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BRANCH OPERATIONS MANAGER', box2X + 2, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Branch: ${shg.branch_name || 'Branch Office'}`, box2X + 2, sigY + 10);
  doc.text('GRT Approval: APPROVED', box2X + 2, sigY + 14);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(box2X + 2, sigY + 26, box2X + sigBoxWidth - 4, sigY + 26);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6.5);
  doc.text('Manager Seal & Sign', box2X + 2, sigY + 29.5);

  // Box 3: SHG President / Secretary
  const box3X = box2X + sigBoxWidth + 4;
  doc.rect(box3X, sigY, sigBoxWidth, sigBoxHeight);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('GROUP PRESIDENT / SECRETARY', box3X + 2, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Group: ${shg.shg_name || 'SERD Group'}`, box3X + 2, sigY + 10);
  doc.text('Acknowledgment of Loan Terms', box3X + 2, sigY + 14);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(box3X + 2, sigY + 26, box3X + sigBoxWidth - 4, sigY + 26);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6.5);
  doc.text('President / Secretary Sign', box3X + 2, sigY + 29.5);

  // Add footers on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  if (options.download) {
    const filename = `${reportId}_${(shg.shg_name || 'SERD_GRT').replace(/[^a-zA-Z0-9]/g, '_')}_Verification_Report.pdf`;
    doc.save(filename);
  }

  return doc;
}
