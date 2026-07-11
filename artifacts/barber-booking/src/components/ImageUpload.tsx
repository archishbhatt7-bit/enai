import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface ImageUploadProps {
  label: string;
  multiple?: boolean;
  maxFiles?: number;
  existingPaths?: string[];
  onUploaded: (paths: string[]) => void;
  onRemove?: (index: number) => void;
  className?: string;
}

const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://enai-api-server.vercel.app" : "");
export function photoUrl(objectPath: string): string {
  return `${apiBase}/api/storage${objectPath}`;
}

export default function ImageUpload({
  label,
  multiple = false,
  maxFiles = 10,
  existingPaths = [],
  onUploaded,
  onRemove,
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const canAddMore = existingPaths.length < maxFiles;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);

    try {
      const paths: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed.");
          setUploading(false);
          return;
        }
        if (file.size > 4 * 1024 * 1024) {
          setError("Each image must be under 4 MB.");
          setUploading(false);
          return;
        }

        const metaRes = await fetch(`${apiBase}/api/storage/uploads/request-url`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        });

        if (!metaRes.ok) {
          setError("Failed to get upload URL. Please try again.");
          setUploading(false);
          return;
        }

        const { uploadURL, objectPath } = await metaRes.json();

        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          setError("Upload failed. Please try again.");
          setUploading(false);
          return;
        }

        paths.push(objectPath);
      }

      onUploaded(paths);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
        {label}
      </label>

      {/* Existing photos grid */}
      {existingPaths.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {existingPaths.map((path, i) => (
            <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
              <img
                src={photoUrl(path)}
                alt={`photo-${i}`}
                className="w-full h-full object-cover"
              />
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {canAddMore && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
            uploading
              ? "border-slate-200 bg-slate-50 cursor-not-allowed"
              : "border-slate-300 hover:border-blue-400 hover:bg-blue-50"
          }`}
          style={{ minHeight: 88 }}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          ) : existingPaths.length === 0 ? (
            <>
              <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Click to upload{multiple ? " (select multiple)" : ""}
              </p>
              <p className="text-xs text-slate-400">JPG, PNG, WebP · max 4 MB each</p>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-slate-400" />
              <p className="text-xs text-slate-500">Add more photos</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <p className="text-xs text-red-500 mt-1.5">{error}</p>
      )}

      {multiple && maxFiles > 1 && (
        <p className="text-xs text-slate-400 mt-1">
          {existingPaths.length}/{maxFiles} photos
        </p>
      )}
    </div>
  );
}
