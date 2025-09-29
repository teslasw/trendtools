"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileUploadZoneProps {
  onFilesUploaded: (files: File[]) => void;
  isProcessing?: boolean;
}

export function FileUploadZone({ onFilesUploaded, isProcessing }: FileUploadZoneProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);

    // Validate file types
    const validFiles = acceptedFiles.filter(file => {
      const validTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel'];
      return validTypes.includes(file.type) ||
             file.name.endsWith('.csv') ||
             file.name.endsWith('.pdf') ||
             file.name.endsWith('.ofx') ||
             file.name.endsWith('.qif');
    });

    if (validFiles.length !== acceptedFiles.length) {
      setError("Some files were not accepted. Please upload PDF, CSV, OFX, or QIF files only.");
    }

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      onFilesUploaded(validFiles);
    }
  }, [onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
      'text/plain': ['.ofx', '.qif']
    },
    multiple: true,
    disabled: isProcessing
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300 dark:border-gray-700",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />

        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <Upload className={cn(
            "h-10 w-10 mb-3",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )} />

          <h3 className="text-lg font-semibold">
            {isDragActive ? "Drop your files here" : "Upload Bank Statements"}
          </h3>

          <p className="text-sm text-muted-foreground mt-2">
            Drag & drop your bank statements here, or click to browse
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            Supports PDF, CSV, OFX, and QIF formats (Max 10MB per file)
          </p>

          <Button variant="outline" className="mt-4" disabled={isProcessing}>
            Select Files
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files ({uploadedFiles.length})</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {!isProcessing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Processing files...</p>
          <Progress value={uploadProgress} />
        </div>
      )}
    </div>
  );
}