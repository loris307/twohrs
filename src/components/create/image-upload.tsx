"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ImagePlus, Camera, X } from "lucide-react";
import { validateImage, compressImage } from "@/lib/utils/image";
import { toast } from "sonner";

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void;
}

export function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const error = validateImage(file);
      if (error) {
        toast.error(error);
        return;
      }

      try {
        const compressed = await compressImage(file);
        const url = URL.createObjectURL(compressed);
        setPreview(url);
        onImageSelect(compressed);
      } catch {
        toast.error("Bildverarbeitung fehlgeschlagen");
      }
    },
    [onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removeImage = () => {
    setPreview(null);
    onImageSelect(null);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Vorschau"
            className="w-full object-contain"
            style={{ maxHeight: "400px" }}
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : isMobile ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { if (cameraInputRef.current) { cameraInputRef.current.value = ""; cameraInputRef.current.click(); } }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-muted-foreground"
          >
            <Camera className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Foto aufnehmen</p>
          </button>
          <button
            type="button"
            onClick={() => { if (galleryInputRef.current) { galleryInputRef.current.value = ""; galleryInputRef.current.click(); } }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-muted-foreground"
          >
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Aus Galerie</p>
          </button>
        </div>
      ) : (
        <div
          onClick={() => galleryInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <ImagePlus className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">
              Bild hierher ziehen oder klicken
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG, PNG, GIF, WebP — Max. 5 MB
            </p>
          </div>
        </div>
      )}
      {/* Gallery input — no capture attribute */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      {/* Camera input — capture attribute opens camera directly */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
