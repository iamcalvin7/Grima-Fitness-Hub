import { Readable } from "stream";
import { Router, type IRouter, type Request, type Response } from "express";
import { attachUser, requireAuth } from "../middlewares/auth";
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// ---------------------------------------------------------------------------
// Upload filename / content-type validation
// ---------------------------------------------------------------------------

/**
 * Allowlist of accepted MIME types for direct uploads.
 * Adding a new type here is the only way to permit it — an absent type is
 * always denied regardless of what the client sends.
 */
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
]);

/**
 * Return true when the filename is safe to store as display metadata.
 *
 * Rejects:
 *   - empty / whitespace-only names
 *   - path-traversal sequences (..)
 *   - directory separators (/ and \)
 *   - absolute paths (start with /)
 *   - URL-encoded variants of the above (%2e%2e, %2f, %5c, %2F, %5C)
 *
 * Note: the filename does NOT affect the object key (which is entirely
 * server-controlled). Validation protects downstream consumers that might
 * use the metadata name for display, logging, or re-export.
 */
function isSafeFilename(name: string): boolean {
  if (!name || !name.trim()) return false;

  // URL-decode first so encoded traversal sequences are caught.
  let decoded: string;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // Malformed percent-encoding — reject.
    return false;
  }

  // Apply the same checks to both the raw and decoded forms.
  for (const s of [name, decoded]) {
    if (s.includes("..")) return false;
    if (s.includes("/") || s.includes("\\")) return false;
    if (s.startsWith("/")) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /storage/uploads/request-url
 * Request a presigned URL for uploading a file directly to object storage.
 *
 * The object key is entirely server-controlled:
 *   <PRIVATE_OBJECT_DIR>/uploads/<userId>/<randomUUID>
 *
 * The client sends JSON metadata — NOT the file bytes. The returned
 * uploadURL is for a direct PUT of the file bytes to object storage.
 *
 * Security:
 *   - userId comes from the authenticated session, never from request body.
 *   - Object key is server-generated; no path-traversal is possible.
 *   - Filename (name) is validated but NOT used in the key — it is stored
 *     as display metadata only.
 *   - contentType must be in the allowlist.
 */
router.post(
  "/storage/uploads/request-url",
  attachUser,
  requireAuth,
  async (req: Request, res: Response) => {
    const { name, size, contentType } = req.body ?? {};

    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Missing required field: name" });
      return;
    }
    if (!isSafeFilename(name)) {
      res
        .status(400)
        .json({ error: "Invalid filename: path traversal or unsafe characters detected" });
      return;
    }
    if (typeof size !== "number" || size <= 0) {
      res.status(400).json({ error: "Missing required field: size" });
      return;
    }
    if (!contentType || typeof contentType !== "string") {
      res.status(400).json({ error: "Missing required field: contentType" });
      return;
    }
    if (!ALLOWED_CONTENT_TYPES.has(contentType.toLowerCase())) {
      res
        .status(400)
        .json({ error: `Unsupported content type: ${contentType}` });
      return;
    }

    try {
      // userId is sourced from the session — req.user is guaranteed by requireAuth.
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(
        req.user!.id,
      );
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

/**
 * GET /storage/public-objects/*
 * Serve public assets unconditionally (no auth check).
 */
router.get(
  "/storage/public-objects/*filePath",
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join("/") : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      const response = await objectStorageService.downloadObject(file);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (response.body) {
        Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, "Error serving public object");
      res.status(500).json({ error: "Failed to serve public object" });
    }
  },
);

/**
 * GET /storage/objects/*
 * Serve uploaded object entities. Auth-protected for member content.
 */
router.get(
  "/storage/objects/*path",
  attachUser,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.path;
      const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
      const objectPath = `/objects/${wildcardPath}`;
      const objectFile =
        await objectStorageService.getObjectEntityFile(objectPath);
      const response = await objectStorageService.downloadObject(objectFile);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (response.body) {
        Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
      req.log.error({ err: error }, "Error serving object");
      res.status(500).json({ error: "Failed to serve object" });
    }
  },
);

export { ALLOWED_CONTENT_TYPES, isSafeFilename };
export default router;
