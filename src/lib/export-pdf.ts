import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportTableData {
    headers: string[];
    rows: (string | number)[][];
}

interface PdfExportOptions {
    title: string;
    subtitle?: string;
    tables: ExportTableData[];
    summaryItems?: { label: string; value: string }[];
    filename: string;
}

export function exportReportPdf(options: PdfExportOptions) {
    const { title, subtitle, tables, summaryItems, filename } = options;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, yPos);
    yPos += 8;

    if (subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(subtitle, 14, yPos);
        yPos += 6;
    }

    // Generated date
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Digenerate: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, yPos);
    yPos += 4;

    // Divider
    doc.setDrawColor(200);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 8;

    // Summary cards
    if (summaryItems && summaryItems.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Ringkasan', 14, yPos);
        yPos += 6;

        const colWidth = (pageWidth - 28) / Math.min(summaryItems.length, 4);
        summaryItems.forEach((item, i) => {
            const x = 14 + (i % 4) * colWidth;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(item.label, x, yPos);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text(item.value, x, yPos + 5);
        });
        yPos += 14;
    }

    // Tables
    for (const table of tables) {
        autoTable(doc, {
            head: [table.headers],
            body: table.rows.map(row => row.map(cell => String(cell))),
            startY: yPos,
            theme: 'striped',
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 8,
            },
            bodyStyles: {
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            margin: { left: 14, right: 14 },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
            `TaxPrime AM — Halaman ${i} dari ${totalPages}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' }
        );
    }

    doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
