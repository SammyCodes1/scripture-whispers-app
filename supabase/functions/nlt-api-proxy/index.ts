import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const NLT_API_BASE = 'https://api.nlt.to/api';

/**
 * Parse NLT HTML response into individual verses.
 * NLT returns HTML with verse numbers in <span class="verse-num"> tags.
 */
function parseVersesFromHtml(html: string, book: string, chapter: number): any[] {
  const verses: any[] = [];
  
  // Remove script/style tags
  let clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Try to extract verses using verse-num spans
  // Pattern: <span class="verse-num">N </span>text until next verse-num or end
  const versePattern = /<span[^>]*class="[^"]*verse-num[^"]*"[^>]*>\s*(\d+)\s*<\/span>([\s\S]*?)(?=<span[^>]*class="[^"]*verse-num|$)/gi;
  
  let match;
  while ((match = versePattern.exec(clean)) !== null) {
    const verseNum = parseInt(match[1], 10);
    // Strip remaining HTML tags and clean whitespace
    let text = match[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    if (text) {
      verses.push({
        book_id: book,
        book_name: book,
        chapter,
        verse: verseNum,
        text,
      });
    }
  }
  
  // Fallback: if no verse-num spans found, return the whole text as verse 1
  if (verses.length === 0) {
    const plainText = clean
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (plainText) {
      verses.push({
        book_id: book,
        book_name: book,
        chapter,
        verse: 1,
        text: plainText,
      });
    }
  }
  
  return verses;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // NLT API allows anonymous access with key=TEST (500 req/day, 50 verses/req)
  const NLT_API_KEY = Deno.env.get('NLT_API_KEY')?.trim() || 'TEST';

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const book = url.searchParams.get('book');
    const chapter = url.searchParams.get('chapter');
    const query = url.searchParams.get('query');

    if (action === 'chapter' && book && chapter) {
      const ref = `${book}+${chapter}`;
      const apiUrl = `${NLT_API_BASE}/passages?ref=${encodeURIComponent(ref)}&key=${NLT_API_KEY}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NLT API call failed [${response.status}]: ${errorText}`);
      }
      
      const html = await response.text();
      const chapterNum = parseInt(chapter, 10);
      const verses = parseVersesFromHtml(html, book, chapterNum);
      
      return new Response(JSON.stringify({
        reference: `${book} ${chapter}`,
        verses,
        text: verses.map(v => v.text).join(' '),
        translation_id: 'nlt',
        translation_name: 'New Living Translation',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else if (action === 'search' && query) {
      const apiUrl = `${NLT_API_BASE}/search?text=${encodeURIComponent(query)}&key=${NLT_API_KEY}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NLT API search failed [${response.status}]: ${errorText}`);
      }
      
      const html = await response.text();
      // Parse search results from HTML
      const results: any[] = [];
      
      // Search results come as HTML paragraphs with references
      const refPattern = /<h3[^>]*>(.*?)<\/h3>\s*([\s\S]*?)(?=<h3|$)/gi;
      let m;
      while ((m = refPattern.exec(html)) !== null) {
        const reference = m[1].replace(/<[^>]+>/g, '').trim();
        const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (reference && text) {
          results.push({ reference, text, book_name: '', chapter: 0, verse: 0 });
        }
      }
      
      return new Response(JSON.stringify({
        query,
        results,
        count: results.length,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use chapter or search.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    console.error('nlt-api-proxy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
