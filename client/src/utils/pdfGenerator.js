import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './helpers'

/**
 * generateComplaintPDF — creates and downloads a complaint detail PDF
 * @param {object} complaint  complaint document from API
 */
export const generateComplaintPDF = (complaint) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Header band
  doc.setFillColor(67, 56, 202) // indigo-700
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Hostel Complaint Management', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Official Complaint Record', 14, 19)
  doc.text(`Generated: ${formatDate(new Date(), 'MMM d, yyyy HH:mm')}`, 140, 19)

  // Complaint ID + status strip
  doc.setFillColor(238, 242, 255) // indigo-50
  doc.rect(0, 28, 210, 14, 'F')
  doc.setTextColor(67, 56, 202)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`Complaint ID: ${complaint.complaintId || 'N/A'}`, 14, 37)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Status: ${complaint.status}  |  Priority: ${complaint.priority}`, 120, 37)

  let y = 52

  // Section: Basic Info
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Complaint Details', 14, y)
  y += 2

  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      ['Category', complaint.category || 'N/A'],
      ['Title / Summary', complaint.title || complaint.description?.slice(0, 80) || 'N/A'],
      ['Location', complaint.location || 'N/A'],
      ['Hostel Block', complaint.hostelBlock || 'N/A'],
      ['Room Number', complaint.roomNumber || 'N/A'],
      ['Submitted On', formatDate(complaint.createdAt)],
      ['SLA Deadline', complaint.slaDeadline ? formatDate(complaint.slaDeadline, 'MMM d, yyyy HH:mm') : 'N/A'],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, fillColor: [248, 250, 252] } },
    styles: { fontSize: 9, cellPadding: 3 },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  })

  y = doc.lastAutoTable.finalY + 8

  // Section: Description
  if (complaint.description) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Description', 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lines = doc.splitTextToSize(complaint.description, 182)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 6
  }

  // Section: Assignment Info
  if (complaint.assignedTo) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Assignment Info', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        ['Assigned Worker', complaint.assignedTo?.name || 'N/A'],
        ['Department', complaint.assignedTo?.department || 'N/A'],
        ['Assigned On', formatDate(complaint.assignedAt)],
      ],
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, fillColor: [248, 250, 252] } },
      styles: { fontSize: 9, cellPadding: 3 },
      theme: 'grid',
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 8
  }

  // Section: AI Analysis
  if (complaint.aiAnalysis) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('AI Analysis', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        ['Detected Category', complaint.aiAnalysis.suggestedCategory || 'N/A'],
        ['Confidence', `${Math.round((complaint.aiAnalysis.confidence || 0) * 100)}%`],
        ['Method', complaint.aiAnalysis.method || 'N/A'],
      ],
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, fillColor: [248, 250, 252] } },
      styles: { fontSize: 9, cellPadding: 3 },
      theme: 'grid',
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 8
  }

  // Section: Status History
  if (complaint.statusHistory?.length) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Status History', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Status', 'Note', 'Updated By', 'Date']],
      body: complaint.statusHistory.map(h => ([
        h.status || '',
        h.note || h.remarks || '',
        h.updatedBy?.name || 'System',
        formatDate(h.timestamp || h.createdAt),
      ])),
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      theme: 'striped',
      margin: { left: 14, right: 14 },
    })

    y = doc.lastAutoTable.finalY + 8
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`Page ${i} of ${pageCount}  |  Hostel Complaint Management System  |  Confidential`, 14, 292)
  }

  doc.save(`Complaint_${complaint.complaintId || 'report'}.pdf`)
}
