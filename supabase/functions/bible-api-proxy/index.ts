import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const API_BIBLE_BASE = 'https://api.scripture.api.bible/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rawApiKey = Deno.env.get('API_BIBLE_KEY');
  const API_BIBLE_KEY = rawApiKey?.trim().replace(/^['\"]|['\"]$/g, '');

  if (!API_BIBLE_KEY) {
    return new Response(JSON.stringify({ error: 'API_BIBLE_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (API_BIBLE_KEY.length < 30) {
    return new Response(JSON.stringify({ error: 'API_BIBLE_KEY appears invalid (too short). Re-save the full key from API.Bible.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const bibleId = url.searchParams.get('bibleId') || 'a81b73293d3080c9-01'; // AMPC default
    const bookId = url.searchParams.get('bookId');
    const chapterId = url.searchParams.get('chapterId');
    const query = url.searchParams.get('query');
    const verseId = url.searchParams.get('verseId');

    let apiUrl = '';

    if (action === 'chapter' && chapterId) {
      apiUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/chapters/${chapterId}?content-type=text&include-verse-numbers=false`;
    } else if (action === 'verses' && chapterId) {
      apiUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/chapters/${chapterId}/verses`;
    } else if (action === 'verse' && verseId) {
      apiUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/verses/${verseId}?content-type=text&include-verse-numbers=false`;
    } else if (action === 'search' && query) {
      apiUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/search?query=${encodeURIComponent(query)}&limit=50`;
    } else if (action === 'books') {
      apiUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/books`;
    } else if (action === 'chapters' && bookId) {
      apiUrl = `${API_BIBLE_BASE}/bibles/${bibleId}/books/${bookId}/chapters`;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(apiUrl, {
      headers: {
        'api-key': API_BIBLE_KEY,
        'x-api-key': API_BIBLE_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const authHint = response.status === 401
        ? ' Unauthorized key. Re-save API_BIBLE_KEY from API.Bible dashboard (full key, no quotes/spaces).'
        : '';
      throw new Error(`API.Bible call failed [${response.status}]: ${errorText}${authHint}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('bible-api-proxy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
