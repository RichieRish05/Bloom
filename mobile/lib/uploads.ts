import { supabase } from "./supabase";

export type UploadContext = {
  cloud_name: string;
  upload_preset: string;
  context: string;
  folder: string;
};

export type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  tags?: string[];
  quality_analysis?: {
    focus?: number;
    aggregate?: number;
    noise?: number;
    contrast?: number;
    exposure?: number;
    saturation?: number;
    lighting?: number;
    pixelate?: number;
    jpeg_quality?: number;
    jpeg_chroma?: number;
    resolution?: number;
    color_score?: number;
  };
};

export async function getUploadContext(
  albumId: string,
): Promise<UploadContext> {
  const { data, error } = await supabase.functions.invoke<UploadContext>(
    "uploads-sign",
    { body: { album_id: albumId } },
  );
  if (error) throw error;
  if (!data) throw new Error("No upload context returned");
  return data;
}

export async function uploadToCloudinary(
  ctx: UploadContext,
  fileUri: string,
  fileName = "upload.jpg",
  mimeType = "image/jpeg",
): Promise<CloudinaryUploadResult> {
  const form = new FormData();
  form.append("upload_preset", ctx.upload_preset);
  form.append("context", ctx.context);
  form.append("folder", ctx.folder);
  form.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${ctx.cloud_name}/image/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    throw new Error(
      `Cloudinary upload failed: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

export type CommitImageInput = {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  quality_score?: number;
};

export type CommitResult = {
  committed: Array<{ public_id: string; image_id: string }>;
};

export function toCommitInput(r: CloudinaryUploadResult): CommitImageInput {
  return {
    public_id: r.public_id,
    secure_url: r.secure_url,
    width: r.width,
    height: r.height,
    format: r.format,
    quality_score: r.quality_analysis?.aggregate ?? r.quality_analysis?.focus,
  };
}

export async function commitUploads(
  albumId: string,
  images: CommitImageInput[],
): Promise<CommitResult> {
  const { data, error } = await supabase.functions.invoke<CommitResult>(
    "uploads-commit",
    { body: { album_id: albumId, images } },
  );
  if (error) throw error;
  if (!data) throw new Error("No commit response");
  return data;
}
