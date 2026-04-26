// Supabase Edge Function: uploads-commit
// Receives the array of Cloudinary results from the mobile client after a batch
// upload, then writes the metadata into `images` and the `album_images` join.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type ImageInput = {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  quality_score?: number;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { album_id?: unknown; images?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const albumId = body.album_id;
  if (typeof albumId !== "string" || albumId.length === 0) {
    return json({ error: "album_id is required" }, 400);
  }

  const images = body.images;
  if (!Array.isArray(images) || images.length === 0) {
    return json({ error: "images must be a non-empty array" }, 400);
  }

  const rows = images.map((img: ImageInput) => ({
    public_id: img.public_id,
    secure_url: img.secure_url,
    width: img.width,
    height: img.height,
    format: img.format,
    quality_score: img.quality_score ?? null,
    uploader_id: user.id,
  }));

  const { data: imageRows, error: imgErr } = await supabase
    .from("images")
    .upsert(rows, { onConflict: "public_id" })
    .select("id, public_id");

  if (imgErr) return json({ error: imgErr.message }, 500);

  const joinRows = (imageRows ?? []).map((r) => ({
    album_id: albumId,
    image_id: r.id,
  }));

  const { error: joinErr } = await supabase
    .from("album_images")
    .upsert(joinRows, { onConflict: "album_id,image_id", ignoreDuplicates: true });

  if (joinErr) return json({ error: joinErr.message }, 500);

  return json({
    committed: (imageRows ?? []).map((r) => ({
      public_id: r.public_id,
      image_id: r.id,
    })),
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
