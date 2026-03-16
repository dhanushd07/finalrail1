const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Extract a single JPEG frame from an MJPEG stream
async function extractFirstFrame(response: Response): Promise<Uint8Array> {
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  const maxBytes = 500_000; // 500KB max for a single frame

  try {
    while (totalLength < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLength += value.length;
    }
  } finally {
    reader.cancel();
  }

  // Concatenate all chunks
  const buffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  // Find JPEG markers: FFD8 (start) and FFD9 (end)
  let jpegStart = -1;
  let jpegEnd = -1;

  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
      jpegStart = i;
      break;
    }
  }

  if (jpegStart >= 0) {
    for (let i = jpegStart + 2; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xD9) {
        jpegEnd = i + 2;
        break;
      }
    }
  }

  if (jpegStart >= 0 && jpegEnd > jpegStart) {
    return buffer.slice(jpegStart, jpegEnd);
  }

  throw new Error("Could not find a complete JPEG frame in the stream");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const reqUrl = new URL(req.url);
    const streamUrl = reqUrl.searchParams.get("url");

    if (!streamUrl || !streamUrl.startsWith("http")) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing 'url' query parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching frame from:", streamUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(streamUrl, {
      headers: {
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "ESP32-Proxy/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";

    // If it's already a single image, return it directly
    if (contentType.startsWith("image/")) {
      const imageData = await response.arrayBuffer();
      return new Response(imageData, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // For MJPEG streams (multipart/x-mixed-replace), extract first JPEG frame
    const jpegData = await extractFirstFrame(response);

    console.log(`Extracted JPEG frame: ${jpegData.length} bytes`);

    return new Response(jpegData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
