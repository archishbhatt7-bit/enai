import { useState, useRef, useCallback, useEffect } from "react";
import { X, Check, ZoomIn, ZoomOut, Upload } from "lucide-react";

interface AvatarCropProps {
  onCropped: (blob: Blob, objectUrl: string) => void;
  onClose: () => void;
  imageFile: File;
}

function AvatarCrop({ onCropped, onClose, imageFile }: AvatarCropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const SIZE = 280;

  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      const fit = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
      setScale(fit);
      setOffset({ x: 0, y: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [imageFile]);

  const draw = useCallback(() => {
    if (!canvasRef.current || !imgEl) return;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const w = imgEl.naturalWidth * scale;
    const h = imgEl.naturalHeight * scale;
    const x = SIZE / 2 - w / 2 + offset.x;
    const y = SIZE / 2 - h / 2 + offset.y;
    ctx.drawImage(imgEl, x, y, w, h);
  }, [imgEl, scale, offset]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setDragging(true);
    const pt = "touches" in e ? e.touches[0] : e;
    dragStart.current = { x: pt.clientX, y: pt.clientY, ox: offset.x, oy: offset.y };
  };

  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return;
    const pt = "touches" in e ? e.touches[0] : e;
    setOffset({
      x: dragStart.current.ox + (pt.clientX - dragStart.current.x),
      y: dragStart.current.oy + (pt.clientY - dragStart.current.y),
    });
  };

  const onMouseUp = () => setDragging(false);

  const confirm = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      onCropped(blob, url);
    }, "image/jpeg", 0.92);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Crop Profile Photo</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {/* Crop canvas */}
          <div
            className="relative mx-auto rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
            style={{ width: SIZE, height: SIZE, touchAction: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onMouseDown}
            onTouchMove={onMouseMove}
            onTouchEnd={onMouseUp}
          >
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              className="block"
            />
            {/* Corner guides */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top-left */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-blue-400 rounded-tl" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-blue-400 rounded-tr" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-blue-400 rounded-bl" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-blue-400 rounded-br" />
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center mt-2">Drag to reposition · Square crop</p>

          {/* Zoom controls */}
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(s - 0.1, 0.5))}
              className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <ZoomOut className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex-1 relative h-1.5 bg-slate-200 rounded-full">
              <div
                className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${((scale - 0.5) / 2.5) * 100}%` }}
              />
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(s + 0.1, 3))}
              className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <ZoomIn className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!imgEl}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Use Photo
          </button>
        </div>
      </div>
    </div>
  );
}

interface AvatarUploadProps {
  currentPath?: string | null;
  onUploaded: (path: string) => void;
  className?: string;
}

export default function AvatarUpload({ currentPath, onUploaded, className = "" }: AvatarUploadProps) {
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Only images allowed"); return; }
    if (file.size > 4 * 1024 * 1024) { setError("Max 4 MB"); return; }
    setError("");
    setCropFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCropped = async (blob: Blob, objectUrl: string) => {
    setCropFile(null);
    setPreview(objectUrl);
    setUploading(true);
    setError("");
    try {
      const metaRes = await fetch(`${apiBase}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "profile.jpg", size: blob.size, contentType: "image/jpeg" }),
      });
      if (!metaRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await metaRes.json();
      const upRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: blob });
      if (!upRes.ok) throw new Error("Upload failed");
      onUploaded(objectPath);
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const photoSrc = preview ?? (currentPath ? `/api/storage${currentPath}` : null);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50 transition-colors group"
      >
        {photoSrc ? (
          <>
            <img src={photoSrc} alt="Profile" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            {uploading ? (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-400">Photo</span>
              </>
            )}
          </div>
        )}
      </button>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {cropFile && (
        <AvatarCrop
          imageFile={cropFile}
          onCropped={handleCropped}
          onClose={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
