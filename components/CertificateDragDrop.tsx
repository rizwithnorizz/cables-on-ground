"use client";

import { useState } from "react";

type CertificateDragDropProps = {
  certificateFile: File | null;
  onFileChange: (file: File | null) => void;
};

export function CertificateDragDrop({
  certificateFile,
  onFileChange,
}: CertificateDragDropProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        onFileChange(file);
      } else {
        // Optional: show error toast here
        console.error("Please drop a PDF or image file.");
      }
    }
  };

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileChange(e.target.files[0]);
    }
  };

  const handleRemoveCertificate = () => {
    onFileChange(null);
  };

  return (
    <label className="space-y-2 text-sm text-gray-300">
      Certificate (optional)
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full rounded-md border-2 border-dashed px-3 py-6 text-center transition-colors ${
          isDragOver
            ? "border-blue-400 bg-blue-500/10"
            : "border-input bg-transparent hover:border-blue-400"
        }`}
      >
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={handleCertificateChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {certificateFile ? (
          <div className="space-y-2">
            <div className="text-sm text-gray-300">
              ✓ Selected: {certificateFile.name}
            </div>
            <button
              type="button"
              onClick={handleRemoveCertificate}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-1 pointer-events-none">
            <p className="text-gray-400">
              Drag and drop your certificate here or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Accepted formats: PDF, PNG, JPG, GIF
            </p>
          </div>
        )}
      </div>
    </label>
  );
}
