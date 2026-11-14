const BASE_URL = "https://open.tiktokapis.com/v2";

export async function tiktokPost(env, endpoint, body = {}) {
  if (!env.TIKTOK_ACCESS_TOKEN) {
    throw new Error("TikTok access token belum dikonfigurasi.");
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.TIKTOK_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();

  if (!response.ok || result.error?.code !== "ok") {
    throw new Error(
      result.error?.message ||
      `TikTok API error: ${response.status}`
    );
  }

  return result.data;
}

export async function getCreatorInfo(env) {
  return await tiktokPost(
    env,
    "/post/publish/creator_info/query/"
  );
}

export async function getPublishStatus(env, publishId) {
  return await tiktokPost(
    env,
    "/post/publish/status/fetch/",
    {
      publish_id: publishId
    }
  );
}

export function validateVideoUrl(env, videoUrl) {
  let url;

  try {
    url = new URL(videoUrl);
  } catch {
    throw new Error("URL video tidak valid.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Video harus menggunakan HTTPS.");
  }

  const allowedHosts = (env.TIKTOK_VIDEO_HOSTS || "")
    .split(",")
    .map(host => host.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new Error(
      "Domain video belum masuk daftar domain yang diizinkan."
    );
  }

  return url.toString();
}
