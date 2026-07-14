import { Router, type IRouter, type Request, type Response } from "express";
import express from "express";
import { randomUUID } from "crypto";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { requireOwnerAuth, OwnerAuthRequest } from "../middleware/auth";
import { db, photoStoreTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/**
 * POST /storage/uploads/request-url
 *
 * Returns a local upload URL + the objectPath that will be stored in the DB.
 * The client then PUTs the raw file to the returned uploadURL.
 */
router.post("/storage/uploads/request-url", requireOwnerAuth, async (req: OwnerAuthRequest, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    if (size > 4 * 1024 * 1024) {
      res.status(400).json({ error: "File exceeds 4MB limit" });
      return;
    }

    if (!contentType.startsWith("image/")) {
      res.status(400).json({ error: "Only image uploads are allowed" });
      return;
    }

    const objectId = randomUUID();

    // Build absolute upload URL from the incoming request's own origin
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "";
    const apiBase = host ? `${proto}://${host}` : "";

    const uploadURL = `${apiBase}/api/storage/upload/${objectId}`;
    const objectPath = `/photos/${objectId}`;

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * PUT /storage/upload/:objectId
 *
 * Receives the raw image file and stores it as base64 in the photo_store table.
 * Works reliably on Vercel (no ephemeral /tmp dependency).
 */
router.put("/storage/upload/:objectId", express.raw({ type: "*/*", limit: "4mb" }), async (req: any, res: any) => {
  try {
    const objectId = req.params.objectId as string;

    // Validate objectId is a UUID to prevent abuse
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(objectId)) {
      return res.status(400).json({ error: "Invalid object ID format" });
    }

    const body = req.body as Buffer;
    if (!body || body.length === 0) {
      return res.status(400).json({ error: "Empty file" });
    }

    const contentType = req.headers["content-type"] || "image/jpeg";
    const base64Data = body.toString("base64");

    // Upsert into photo_store
    await db.insert(photoStoreTable).values({
      id: objectId,
      contentType,
      data: base64Data,
    }).onConflictDoUpdate({
      target: photoStoreTable.id,
      set: { contentType, data: base64Data },
    });

    res.status(200).send("OK");
  } catch (error) {
    req.log?.error?.({ err: error }, "Photo upload failed");
    res.status(500).json({ error: "Upload failed" });
  }
});

/**
 * GET /storage/photos/:objectId
 *
 * Serves a photo from the database. Decodes base64 and sends the raw image.
 */
router.get("/storage/photos/:objectId", async (req: Request, res: Response) => {
  try {
    const objectId = req.params.objectId as string;

    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(objectId)) {
      return res.status(400).json({ error: "Invalid object ID" });
    }

    const rows = await db.select().from(photoStoreTable).where(eq(photoStoreTable.id, objectId));
    if (rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const photo = rows[0];
    const buffer = Buffer.from(photo.data, "base64");

    res.setHeader("Content-Type", photo.contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(buffer);
  } catch (error) {
    req.log.error({ err: error }, "Error serving photo");
    res.status(500).json({ error: "Failed to serve photo" });
  }
});

// Legacy: also handle /storage/objects/:id for backward compatibility with old paths
router.get("/storage/objects/:path", async (req: Request, res: Response) => {
  try {
    const wildcardPath = req.params.path as string;

    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(wildcardPath)) {
      return res.status(400).json({ error: "Invalid object ID" });
    }

    // Check database first
    const rows = await db.select().from(photoStoreTable).where(eq(photoStoreTable.id, wildcardPath));
    if (rows.length > 0) {
      const photo = rows[0];
      const buffer = Buffer.from(photo.data, "base64");
      res.setHeader("Content-Type", photo.contentType);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(buffer);
    }

    return res.status(404).json({ error: "Photo not found" });
  } catch (error) {
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
