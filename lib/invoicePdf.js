export function generateInvoicePDF({ company, order, invoiceNumber, subtotal, gstRate, gstAmount, total }) {
  // jsPDF is imported dynamically by the caller since it's browser-only
  return import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let y = 50;

    // Header: company details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(company.company_name || 'Your Company', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    if (company.address) { doc.text(company.address, margin, y); y += 13; }
    const contactLine = [company.phone, company.email].filter(Boolean).join('  |  ');
    if (contactLine) { doc.text(contactLine, margin, y); y += 13; }
    if (company.gstin) { doc.text(`GSTIN: ${company.gstin}`, margin, y); y += 13; }

    // Invoice title + number, top right
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('TAX INVOICE', pageWidth - margin, 50, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoiceNumber}`, pageWidth - margin, 70, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin, 85, { align: 'right' });

    y += 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 25;

    // Bill to
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Bill To:', margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(order.customer_name || 'Customer', margin, y);
    y += 30;

    // Line item table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Description', margin + 8, y + 16);
    doc.text('HSN', margin + 260, y + 16);
    doc.text('Qty', margin + 330, y + 16);
    doc.text('Rate', margin + 390, y + 16, { align: 'right' });
    doc.text('Amount', pageWidth - margin - 8, y + 16, { align: 'right' });
    y += 24;

    // Line item row
    const rowH = 24;
    doc.setDrawColor(230, 230, 230);
    doc.rect(margin, y, pageWidth - margin * 2, rowH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const itemName = order.item_name || 'Item';
    doc.text(itemName.length > 40 ? itemName.slice(0, 40) + '…' : itemName, margin + 8, y + 16);
    doc.text(order.hsn_code || '-', margin + 260, y + 16);
    doc.text(String(order.quantity || 0), margin + 330, y + 16);
    const rate = order.quantity ? (subtotal / order.quantity) : 0;
    doc.text(`Rs. ${rate.toFixed(2)}`, margin + 390, y + 16, { align: 'right' });
    doc.text(`Rs. ${subtotal.toLocaleString('en-IN')}`, pageWidth - margin - 8, y + 16, { align: 'right' });
    y += rowH + 10;

    // Totals block, right-aligned
    const totalsX = pageWidth - margin - 180;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Subtotal:', totalsX, y);
    doc.text(`Rs. ${subtotal.toLocaleString('en-IN')}`, pageWidth - margin - 8, y, { align: 'right' });
    y += 18;
    doc.text(`GST (${gstRate}%):`, totalsX, y);
    doc.text(`Rs. ${gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, pageWidth - margin - 8, y, { align: 'right' });
    y += 18;
    doc.setDrawColor(0, 0, 0);
    doc.line(totalsX, y, pageWidth - margin, y);
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total:', totalsX, y);
    doc.text(`Rs. ${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, pageWidth - margin - 8, y, { align: 'right' });
    y += 40;

    // Bank details
    if (company.bank_name || company.bank_account_number) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Payment Details', margin, y);
      y += 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      if (company.bank_name) { doc.text(`Bank: ${company.bank_name}`, margin, y); y += 13; }
      if (company.bank_account_number) { doc.text(`Account No: ${company.bank_account_number}`, margin, y); y += 13; }
      if (company.bank_ifsc) { doc.text(`IFSC: ${company.bank_ifsc}`, margin, y); y += 13; }
      y += 15;
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('This is a computer-generated invoice.', margin, doc.internal.pageSize.getHeight() - 30);

    return doc;
  });
}
