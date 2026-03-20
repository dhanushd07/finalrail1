const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Accept URL from query param (GET) or body (POST)
    let cameraUrl: string | null = null;

    if (req.method === 'GET') {
      const params = new URL(req.url).searchParams;
      cameraUrl = params.get('url');
    } else if (req.method === 'POST') {
      const body = await req.json();
      cameraUrl = body.url;
    }

    if (!cameraUrl) {
      console.error('[IP Proxy] No camera URL provided');
      return new Response(
        JSON.stringify({ error: 'Missing "url" parameter. Provide the IP camera stream URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cameraUrl);
    } catch {
      console.error(`[IP Proxy] Invalid URL format: ${cameraUrl}`);
      return new Response(
        JSON.stringify({ error: `Invalid URL format: "${cameraUrl}". Must start with http:// or https://` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      console.error(`[IP Proxy] Unsupported protocol: ${parsedUrl.protocol}`);
      return new Response(
        JSON.stringify({ error: `Unsupported protocol "${parsedUrl.protocol}". Only http:// and https:// are allowed.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[IP Proxy] Proxying stream from: ${cameraUrl}`);

    // Fetch the stream from the camera server (server-to-server, no CORS issues)
    const response = await fetch(cameraUrl, {
      headers: {
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      console.error(`[IP Proxy] Camera returned HTTP ${response.status}: ${response.statusText}`);
      return new Response(
        JSON.stringify({
          error: `Camera stream returned HTTP ${response.status} (${response.statusText}). Check that the URL is correct and the camera is online.`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.body) {
      console.error('[IP Proxy] Camera response has no body/stream');
      return new Response(
        JSON.stringify({ error: 'Camera returned an empty response. The stream may not be active.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    console.log(`[IP Proxy] Stream connected. Content-Type: ${contentType}`);

    // Stream the response back to the client with CORS headers
    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[IP Proxy] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: `Proxy error: ${error.message || 'Unknown error'}. The camera may be unreachable or the URL may be wrong.`,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
