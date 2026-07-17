'use client';

import { useState, useRef } from 'react';
import { parsePurchaseOrder, parseBill } from '@/lib/documentParser';

export default function DocumentScanner({ docType, materialNames = [], onExtracted }) {
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [rawText, setRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef(null);

  const isPO = docType !== 'bill';

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      setError('PDF scanning needs a photo instead for now — try taking a photo of the document, or a screenshot of the PDF page.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('File too large — pick an image under 15MB.');
      return;
    }

    setError('');
    setResult(null);
    setRawText('');
    setPreview(URL.createObjectURL(file));
    setScanning(true);
    setProgress(0);

    try {
      const Tesseract = (await import('tesseract.js')).default;
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = data.text || '';
      setRawText(text);

      if (!text.trim()) {
        setError('Could not read any text from that image. Try a clearer, well-lit photo.');
        setScanning(false);
        return;
      }

      const fields = isPO ? parsePurchaseOrder(text) : parseBill(text, materialNames);

      const gotAnything = Object.values(fields).some((v) => v !== null && v !== '');
      if (!gotAnything) {
        setError('Could not pick out any fields from that document. You can still review the raw text below and fill the form manually.');
        setScanning(false);
        return;
      }

      setResult(fields);
      onExtracted?.(fields);
    } catch (err) {
      setError('Could not process that image. Try again.');
    }
    setScanning(false);
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setRawText('');
    setShowRawText(false);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="section-card">
      <div className="section-header">
        <div>
          <div className="section-title">{isPO ? 'Scan a purchase order' : 'Scan a material bill'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 3 }}>
            {isPO
              ? 'Upload a clear photo of the customer\'s PO — we\'ll try to pull out the order details.'
              : 'Upload a clear photo of the supplier bill — we\'ll try to pull out the material details.'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, background: 'var(--gray-bg)', padding: '8px 12px', borderRadius: 8 }}>
        Works best on clear, printed documents — good lighting, straight angle, no glare. Handwritten or blurry documents extract less reliably, so always double-check before saving.
      </div>

      {!preview ? (
        <label className="upload-box" style={{ display: 'block' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px' }}>
            <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
          </svg>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Click to upload {isPO ? 'PO' : 'bill'} photo</div>
          <div style={{ color: 'var(--text-muted)' }}>JPG or PNG up to 15MB</div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </label>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <img src={preview} alt="Uploaded document" style={{ width: 140, height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />

            <div style={{ flex: 1, minWidth: 220 }}>
              {scanning && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" style={{ animation: 'pf-spin 0.8s linear infinite' }}>
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Reading document... {progress > 0 ? `${progress}%` : ''}
                    <style>{`@keyframes pf-spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                  <div className="progress-track" style={{ maxWidth: 200 }}>
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {result && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ color: 'var(--green-dot)', fontWeight: 800, fontSize: 13.5 }}>✓ Extracted — please review</span>
                  </div>

                  <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                    {isPO ? (
                      <>
                        {result.customer_name && <Field label="Customer" value={result.customer_name} />}
                        {result.item_name && <Field label="Item" value={result.item_name} />}
                        {result.quantity && <Field label="Quantity" value={result.quantity.toLocaleString()} />}
                        {result.due_date && <Field label="Due date" value={result.due_date} />}
                        {result.price && <Field label="Price" value={`₹${Number(result.price).toLocaleString('en-IN')}`} />}
                        {result.po_number && <Field label="PO number" value={result.po_number} />}
                      </>
                    ) : (
                      <>
                        {result.supplier_name && <Field label="Supplier" value={result.supplier_name} />}
                        {result.material_name && <Field label="Material" value={result.material_name} />}
                        {result.quantity_kg && <Field label="Quantity" value={`${result.quantity_kg} kg`} />}
                        {result.price_per_kg && <Field label="Price/kg" value={`₹${result.price_per_kg}`} />}
                        {result.total_price && <Field label="Total" value={`₹${Number(result.total_price).toLocaleString('en-IN')}`} />}
                        {result.bill_number && <Field label="Bill number" value={result.bill_number} />}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

          {rawText && (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setShowRawText((s) => !s)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                {showRawText ? '▾ Hide' : '▸ Show'} raw text read from the image
              </button>
              {showRawText && (
                <pre style={{ background: 'var(--gray-bg)', padding: 12, borderRadius: 8, fontSize: 11.5, marginTop: 8, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                  {rawText}
                </pre>
              )}
            </div>
          )}

          <button type="button" className="btn btn-secondary" onClick={reset}>
            {result ? 'Scan a different document' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 90, fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
