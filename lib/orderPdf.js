export function generateOrderJobSheetPDF({ company, order, productionLogs = [] }) {
  return import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let y = 50;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(company?.company_name || 'Order Details', margin, y);
    doc.setFontSize(14);
    doc.text('JOB SHEET', pageWidth - margin, y, { align: 'right' });
    y += 22;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 28;

    const field = (label, value) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(label.toUpperCase(), margin, y);
      y += 13;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(String(value || '—'), margin, y);
      y += 22;
    };

    const fieldRow = (pairs) => {
      const colWidth = (pageWidth - margin * 2) / pairs.length;
      const startY = y;
      let maxY = y;
      pairs.forEach(([label, value], i) => {
        let localY = startY;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(label.toUpperCase(), margin + i * colWidth, localY);
        localY += 13;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(String(value || '—'), margin + i * colWidth, localY);
        localY += 22;
        maxY = Math.max(maxY, localY);
      });
      y = maxY;
    };

    fieldRow([
      ['Customer', order.customer_name],
      ['Status', order.status],
    ]);
    fieldRow([
      ['Item', order.item_name],
      ['Quantity', order.quantity ? Number(order.quantity).toLocaleString() : null],
    ]);
    fieldRow([
      ['Due date', order.due_date ? new Date(order.due_date).toLocaleDateString('en-IN') : null],
      ['Days to complete', order.days_to_complete],
    ]);

    if (order.description) field('Description / specifications', order.description);
    if (order.notes) field('Notes', order.notes);

    y += 10;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 25;

    // Production log summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Production Log', margin, y);
    y += 20;

    if (productionLogs.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text('No production logged yet.', margin, y);
      y += 20;
    } else {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - margin * 2, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('Date', margin + 8, y + 15);
      doc.text('Units produced', margin + 150, y + 15);
      doc.text('Notes', margin + 300, y + 15);
      y += 22;

      doc.setFont('helvetica', 'normal');
      let totalProduced = 0;
      productionLogs.forEach((log) => {
        doc.setDrawColor(235, 235, 235);
        doc.rect(margin, y, pageWidth - margin * 2, 20);
        doc.text(new Date(log.log_date).toLocaleDateString('en-IN'), margin + 8, y + 14);
        doc.text(String(log.quantity), margin + 150, y + 14);
        if (log.notes) doc.text(log.notes.slice(0, 50), margin + 300, y + 14);
        totalProduced += log.quantity;
        y += 20;
      });

      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Total produced: ${totalProduced.toLocaleString()} / ${Number(order.quantity || 0).toLocaleString()}`, margin, y);
      y += 20;
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, margin, doc.internal.pageSize.getHeight() - 30);

    return doc;
  });
}

export function generateOrdersReportPDF({ company, orders = [] }) {
  return import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = 45;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(company?.company_name || 'Orders Report', margin, y);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated ${new Date().toLocaleDateString('en-IN')} · ${orders.length} orders`, pageWidth - margin, y, { align: 'right' });
    y += 25;

    const cols = [
      { label: 'Customer', width: 130, key: 'customer_name' },
      { label: 'Item', width: 160, key: 'item_name' },
      { label: 'Qty', width: 60, key: 'quantity' },
      { label: 'Status', width: 90, key: 'status' },
      { label: 'Due date', width: 90, key: 'due_date' },
      { label: 'Price (₹)', width: 90, key: 'price' },
    ];

    const drawHeader = () => {
      doc.setFillColor(30, 30, 30);
      doc.rect(margin, y, pageWidth - margin * 2, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      let x = margin + 6;
      cols.forEach((col) => {
        doc.text(col.label, x, y + 15);
        x += col.width;
      });
      y += 22;
    };

    drawHeader();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    orders.forEach((order, i) => {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 45;
        drawHeader();
      }

      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
      }

      let x = margin + 6;
      const rowValues = [
        (order.customer_name || '—').slice(0, 22),
        (order.item_name || '—').slice(0, 28),
        String(order.quantity || 0),
        order.status || '—',
        order.due_date ? new Date(order.due_date).toLocaleDateString('en-IN') : '—',
        order.price ? Number(order.price).toLocaleString('en-IN') : '—',
      ];

      cols.forEach((col, ci) => {
        doc.text(rowValues[ci], x, y + 14);
        x += col.width;
      });

      doc.setDrawColor(230, 230, 230);
      doc.line(margin, y + 20, pageWidth - margin, y + 20);

      y += 20;
    });

    return doc;
  });
}
