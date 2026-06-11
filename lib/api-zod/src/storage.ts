import { z } from "zod/v4";

export const RequestUploadUrlBody = z.object({
  name: z.string(),
  size: z.number(),
  contentType: z.string(),
});

export const RequestUploadUrlResponse = z.object({
  uploadURL: z.string(),
  objectPath: z.string(),
  metadata: z.object({
    name: z.string(),
    size: z.number(),
    contentType: z.string(),
  }),
});
