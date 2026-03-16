const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const reqUrl = new URL(req.url);
    let streamUrl = reqUrl.searchParams.get("url");

    if (!streamUrl || !streamUrl.startsWith("http")) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing 'url' query parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto-convert /stream to /capture for single JPEG frame
    // ESP32-CAM serves MJPEG on /stream (infinite) and single JPEG on /capture
    streamUrl = streamUrl.replace(/\/stream\b/, "/capture");

    console.log("Fetching capture from:", streamUrl);

    const response = await fetch(streamUrl, {
      headers: {
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "ESP32-Proxy/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}: ${response.statusText}`);
    }

    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new Response(imageData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
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
