import { useRef, useEffect, useState } from 'react';

export default function CameraModal({ open, onClose, onPhoto }) {
  const videoRef = useRef();
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (open) startCamera();
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; setReady(true); }
    } catch (e) {
      alert('Camera error: ' + e.message);
      onClose();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setReady(false);
  };

  const snap = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) return;
    const size = Math.min(v.videoWidth, v.videoHeight) || 480;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const sx = (v.videoWidth - size) / 2, sy = (v.videoHeight - size) / 2;
    ctx.drawImage(v, sx, sy, size, size, 0, 0, size, size);
    onPhoto(c.toDataURL('image/jpeg', 0.7));
    stopCamera();
  };

  if (!open) return null;
  return (
    <div className="modal-wrap show" onClick={e => { if (e.target === e.currentTarget) { stopCamera(); onClose(); } }}>
      <div className="modal narrow">
        <h3>📸 Capture Photo</h3>
        <p>Position visitor's face in the frame and click Snap</p>
        <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '1/1', display: 'grid', placeItems: 'center' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => { stopCamera(); onClose(); }}>Cancel</button>
          <button className="btn btn-primary" onClick={snap} disabled={!ready}>📷 Snap</button>
        </div>
      </div>
    </div>
  );
}
