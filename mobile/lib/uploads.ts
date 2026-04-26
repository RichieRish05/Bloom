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
  info?: {
    quality_analysis?: { aggregate?: number };
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
