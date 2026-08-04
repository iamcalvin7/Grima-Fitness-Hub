import { useState, useCallback } from "react";

interface UploadResult {
  objectPath: string;
  name: string;
  contentType: string;
  size: number;
}

interface UseUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Step 1: Request a presigned upload URL from our backend
        const urlRes = await fetch("/api/storage/uploads/request-url", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type,
          }),
        });

        if (!urlRes.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadURL, objectPath } = await urlRes.json();
        setProgress(30);

        // Step 2: Upload the file directly to GCS via the presigned URL
        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Upload to storage failed");
        }

        setProgress(100);

        const result: UploadResult = {
          objectPath,
          name: file.name,
          contentType: file.type,
          size: file.size,
        };

        options.onSuccess?.(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setError(msg);
        options.onError?.(msg);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [options],
  );

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
  }, []);

  return { upload, uploading, progress, error, reset };
}
