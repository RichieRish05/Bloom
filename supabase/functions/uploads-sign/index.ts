// Supabase Edge Function: uploads-sign
// Verifies the caller's Supabase JWT, then returns a Cloudinary upload context
// with `uploader_id` stamped from the verified user — the client cannot forge it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const APP_NAMESPACE = Deno.env.get("CLOUDINARY_APP_NAMESPACE") ?? "bloom";

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

  let body: { album_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const albumId = body.album_id;
  if (typeof albumId !== "string" || albumId.length === 0) {
    return json({ error: "album_id is required" }, 400);
  }

  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const uploadPreset = Deno.env.get("CLOUDINARY_UPLOAD_PRESET");
  if (!cloudName || !uploadPreset) {
    return json({ error: "Cloudinary env not configured" }, 500);
  }

  return json({
    cloud_name: cloudName,
    upload_preset: uploadPreset,
    context: `album_id=${albumId}|uploader_id=${user.id}`,
    folder: `${APP_NAMESPACE}/albums/${albumId}`,
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
