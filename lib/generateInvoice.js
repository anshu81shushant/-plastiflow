import { createClient } from './supabase-browser';
import { generateInvoicePDF } from './invoicePdf';

// Call this whenever an order's status changes to Completed. Creates the invoice
// record (idempotent — won't duplicate if one already exists for this order) and
// triggers a PDF download. Returns { success, error, skipped }.
export async function generateAndSaveInvoice(order) {
  const supabase = createClient();

  try {
    // Don't create a duplicate invoice if one already exists for this order.
    const { data: existing } = await supabase.from('invoices').select('*').eq('order_id', order.id).maybeSingle();
    if (existing) {
      return { success: true, skipped: true, invoice: existing };
    }

    const { data: company } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();

    if (!company || !company.company_name) {
      return { success: false, error: 'Add your company details in Settings before generating invoices.' };
    }

    const subtotal = Number(order.price) || 0;
    const gstRate = Number(order.gst_rate) || 18;
    const gstAmount = (subtotal * gstRate) / 100;
    const total = subtotal + gstAmount;

    const invoiceNumber = `${company.invoice_prefix || 'INV'}-${String(company.next_invoice_number || 1).padStart(4, '0')}`;

    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        order_id: order.id,
        invoice_number: invoiceNumber,
        subtotal,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        total,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Bump the next invoice number for the following invoice
    await supabase
      .from('company_settings')
      .update({ next_invoice_number: (company.next_invoice_number || 1) + 1 })
      .eq('id', company.id);

    const doc = await generateInvoicePDF({
      company,
      order,
      invoiceNumber,
      subtotal,
      gstRate,
      gstAmount,
      total,
    });
    doc.save(`${invoiceNumber}.pdf`);

    return { success: true, skipped: false, invoice };
  } catch (err) {
    return { success: false, error: 'Could not generate invoice. You can try again from the order\'s Edit page.' };
  }
}
