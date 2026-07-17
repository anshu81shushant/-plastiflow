'use client';

import { useState, useRef } from 'react';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentScanner({ docType, materialNames = [], onExtracted }) {
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const isPO = docType !== 'bill';

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('File too large — pick an image or PDF under 15MB.');
      return;
    }

    setError('');
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setScanning(true);

    try {
      const base64 = await fileToBase64(file);
      const mediaType = file.type || 'image/jpeg';

      const res = await fetch('/api/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType, docType, materialNames }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not read that document. Try again.');
        setScanning(false);
        return;
      }

      const gotAnything = Object.values(data.fields || {}).some((v) => v !== null && v !== '');
      if (!gotAnything) {
        setError('Could not find any details in that document. Try a clearer photo.');
        setScanning(false);
        return;
      }

      setResult(data.fields);
      onExtracted?.(data.fields);
    } catch (err) {
      setError('Could not reach the server. Check your connection.');
    }
    setScanning(false);
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
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
              ? 'Upload a photo or PDF of the customer\'s PO — we\'ll pull out the order details.'
              : 'Upload a photo or PDF of the supplier bill — we\'ll pull out the material details.'}
          </div>
        </div>
      </div>

      {!preview ? (
        <label className="upload-box" style={{ display: 'block' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px' }}>
            <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
          </svg>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Click to upload {isPO ? 'PO' : 'bill'} photo or PDF</div>
          <div style={{ color: 'var(--text-muted)' }}>JPG, PNG, or PDF up to 15MB</div>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFile} style={{ display: 'none' }} />
        </label>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <img src={preview} alt="Uploaded document" style={{ width: 140, height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />

            <div style={{ flex: 1, minWidth: 220 }}>
              {scanning && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13.5, fontWeight: 600 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" style={{ animation: 'pf-spin 0.8s linear infinite' }}>
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Reading document...
                  <style>{`@keyframes pf-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {result && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ color: 'var(--green-dot)', fontWeight: 800, fontSize: 13.5 }}>✓ Extracted</span>
                    {result.confidence === 'low' && (
                      <span className="pill" style={{ background: 'var(--amber-bg)', color: 'var(--amber-text)' }}>Double-check this — image was unclear</span>
                    )}
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
