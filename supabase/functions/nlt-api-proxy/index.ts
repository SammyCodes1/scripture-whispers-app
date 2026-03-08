import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const NLT_API_BASE = 'https://api.nlt.to/api';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // NLT API allows anonymous access with key=TEST (500 req/day, 50 verses/req)
  // If user has a real key, use it; otherwise fall back to TEST
  const NLT_API_KEY = Deno.env.get('NLT_API_KEY')?.trim() || 'TEST';

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const book = url.searchParams.get('book');
    const chapter = url.searchParams.get('chapter');
    const query = url.searchParams.get('query');

    let apiUrl = '';
    let parseAs: 'passages' | 'search' = 'passages';

    if (action === 'chapter' && book && chapter) {
      // Fetch a full chapter
      apiUrl = `${NLT_API_BASE}/passages?ref=${encodeURIComponent(`${book}+${chapter}`)}&key=${NLT_API_KEY}&format=json`;
      parseAs = 'passages';
    } else if (action === 'search' && query) {
      apiUrl = `${NLT_API_BASE}/search?query=${encodeURIComponent(query)}&key=${NLT_API_KEY}&format=json`;
      parseAs = 'search';
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use chapter or search.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NLT API call failed [${response.status}]: ${errorText}`);
    }

    // NLT API may return HTML or JSON depending on the format param
    const contentType = response.headers.get('content-type') || '';
    let data: any;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // NLT API sometimes returns HTML even with format=json
      // Parse the HTML text content
      const htmlText = await response.text();
      data = { html: htmlText };
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('nlt-api-proxy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
