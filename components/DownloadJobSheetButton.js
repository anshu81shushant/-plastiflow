'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { generateOrderJobSheetPDF } from '@/lib/orderPdf';

export default function DownloadJobSheetButton({ order, productionLogs }) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const supabase = createClient();
      const { data: company } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
      const doc = await generateOrderJobSheetPDF({ company, order, productionLogs });
      doc.save(`job-sheet-${(order.item_name || 'order').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
    } catch (err) {
      alert('Could not generate the PDF. Try again.');
    }
    setDownloading(false);
  };

  return (
    <button className="btn btn-secondary" onClick={download} disabled={downloading}>
      {downloading ? 'Generating...' : '📄 Download job sheet'}
    </button>
  );
}
