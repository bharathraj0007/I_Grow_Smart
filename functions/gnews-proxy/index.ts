import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ═══════════════════════════════════════════════════════════════════
// CORS HEADERS - Required for browser requests
// ═══════════════════════════════════════════════════════════════════
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

// ✅ USE THIS for all success responses
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// ✅ USE THIS for all error responses
function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// GNews API configuration
const GNEWS_API_KEY = "1f475578a1f33f0d6ac71c36eb142194";
const GNEWS_BASE_URL = "https://gnews.io/api/v4/search";

// Helper function to get date in ISO format for GNews API
function getDateString(daysAgo: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0] + 'T00:00:00Z';
}

serve(async (req) => {
  // ⚠️ HANDLE OPTIONS FIRST - Required for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Accept both GET and POST
    let query = "agriculture OR farmers OR farming OR crops";
    let lang = "en";
    let country = "in";
    let max = 10;
    let sortBy = "publishedAt"; // Sort by newest first

    if (req.method === "POST") {
      const body = await req.json();
      query = body.query || query;
      lang = body.lang || lang;
      country = body.country || country;
      max = body.max || max;
      sortBy = body.sortBy || sortBy;
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      query = url.searchParams.get("q") || query;
      lang = url.searchParams.get("lang") || lang;
      country = url.searchParams.get("country") || country;
      max = parseInt(url.searchParams.get("max") || String(max));
      sortBy = url.searchParams.get("sortBy") || sortBy;
    }

    // Get date range - fetch news from last 7 days for freshness
    const fromDate = getDateString(7); // 7 days ago
    const toDate = getDateString(0);   // today

    // Build GNews API URL with time-based parameters for fresh results
    const gnewsUrl = new URL(GNEWS_BASE_URL);
    gnewsUrl.searchParams.set("q", query);
    gnewsUrl.searchParams.set("lang", lang);
    gnewsUrl.searchParams.set("country", country);
    gnewsUrl.searchParams.set("max", String(max));
    gnewsUrl.searchParams.set("sortby", sortBy); // Sort by publishedAt (newest first)
    gnewsUrl.searchParams.set("from", fromDate); // Get news from last 7 days
    gnewsUrl.searchParams.set("to", toDate);     // Up to today
    gnewsUrl.searchParams.set("apikey", GNEWS_API_KEY);

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Fetching fresh news from GNews...`);
    console.log(`[${timestamp}] Query: ${query}, From: ${fromDate}, To: ${toDate}`);
    console.log(`[${timestamp}] URL: ${gnewsUrl.toString().replace(GNEWS_API_KEY, "***")}`);

    // Fetch from GNews API (server-side, no CORS issues)
    const gnewsResponse = await fetch(gnewsUrl.toString(), {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    });
    
    if (!gnewsResponse.ok) {
      const errorText = await gnewsResponse.text();
      console.error(`[${timestamp}] GNews API error:`, gnewsResponse.status, errorText);
      return errorResponse(`GNews API error: ${gnewsResponse.status}`, gnewsResponse.status);
    }

    const data = await gnewsResponse.json();
    console.log(`[${timestamp}] GNews response received, articles: ${data.articles?.length || 0}`);

    // Add fetch timestamp to response for debugging
    return jsonResponse({
      ...data,
      fetchedAt: timestamp,
      dateRange: { from: fromDate, to: toDate }
    });

  } catch (error) {
    console.error("Error in gnews-proxy:", error);
    return errorResponse(error.message || "Internal server error");
  }
});
