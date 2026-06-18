import fs from "fs";
import path from "path";
import type { Express } from "express";
import { cloudinary } from "./cloudinary";

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function slugifyBaseName(originalName: string): string {
  const baseName = path.parse(originalName || "document").name;
  return baseName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uploadToCloudinary(
  file: Express.Multer.File,
  docType: string,
): Promise<string> {
  const resourceType =
    file.mimetype && file.mimetype.startsWith("image/") ? "image" : "raw";
  const slug = slugifyBaseName(file.originalname || "document");

  const result = await cloudinary.uploader.upload(file.path, {
    resource_type: resourceType,
    folder: "job-profiles/documents",
    public_id: slug || docType,
    access_mode: "public",
  });

  return result.secure_url;
}

function uploadToLocal(
  file: Express.Multer.File,
  userId: string,
  docType: string,
): string {
  const destDir = path.join("uploads", "documents", userId);
  fs.mkdirSync(destDir, { recursive: true });

  const safeOriginal = path
    .basename(file.originalname || "document")
    .replace(/[^a-zA-Z0-9._-]+/g, "_");
  const fileName = `${docType}-${Date.now()}-${safeOriginal}`;
  const destPath = path.join(destDir, fileName);

  fs.renameSync(file.path, destPath);
  return `/uploads/documents/${userId}/${fileName}`;
}

export async function uploadProfileDocument(
  file: Express.Multer.File,
  opts: { userId: string; docType: string },
): Promise<{ fileUrl: string; storage: "cloudinary" | "local" }> {
  if (isCloudinaryConfigured()) {
    try {
      const fileUrl = await uploadToCloudinary(file, opts.docType);
      return { fileUrl, storage: "cloudinary" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Cloudinary upload failed";

      if (process.env.NODE_ENV === "production") {
        throw new Error(
          `Cloudinary upload failed. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET. (${message})`,
        );
      }

      console.warn(
        "Cloudinary upload failed; using local storage for development:",
        message,
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Document storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  } else {
    console.warn(
      "Cloudinary is not configured; saving uploaded documents locally for development.",
    );
  }

  const fileUrl = uploadToLocal(file, opts.userId, opts.docType);
  return { fileUrl, storage: "local" };
}
