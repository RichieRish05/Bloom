// Supabase Edge Function: curate-social-score
// For each image in the album that hasn't been scored yet, call Cloudinary
// AI Vision to rate social-media readiness 0-100, then persist to images.social_score.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PROMPT =
  "Rate this image's social-media readiness from 0 to 100 based on composition, lighting, subject clarity, and aesthetic appeal. Reply with only the integer.";

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
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
  if (!cloudName || !apiKey || !apiSecret) {
    return json({ error: "Cloudinary env not configured" }, 500);
  }

  const { data: rows, error: qErr } = await supabase
    .from("album_images")
    .select("images(id, secure_url, social_score)")
    .eq("album_id", albumId);

  if (qErr) return json({ error: qErr.message }, 500);

  const targets = (rows ?? [])
    .map((r: any) => r.images)
    .filter((img: any) => img && img.social_score === null);

  const basicAuth = btoa(`${apiKey}:${apiSecret}`);
  let scored = 0;

  for (const img of targets) {
    try {
      const visionRes = await fetch(
        `https://api.cloudinary.com/v2/analysis/${cloudName}/analyze/ai_vision_general`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${basicAuth}`,
          },
          body: JSON.stringify({
            source: { uri: img.secure_url },
            prompts: [PROMPT],
          }),
        },
      );
      if (!visionRes.ok) continue;
      const payload = await visionRes.json();
      const value = payload?.data?.analysis?.responses?.[0]?.value ?? "";
      const match = String(value).match(/\d+/);
      if (!match) continue;
      const score = Math.max(0, Math.min(100, parseInt(match[0], 10)));

      const { error: uErr } = await supabase
        .from("images")
        .update({ social_score: score })
        .eq("id", img.id);
      if (!uErr) scored++;
    } catch {
      // skip this image, continue with the rest
    }
  }

  return json({ scored });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
