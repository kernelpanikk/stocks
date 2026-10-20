// Ricerca ticker su Yahoo Finance
// GET /api/search?q=nvidia

import { yahooJson } from "../lib/yahoo.mjs";

export default async (req) => {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q || q.length > 50) return Response.json({ results: [] });

  const yPath =
    "/v1/finance/search?q=" +
    encodeURIComponent(q) +
    "&quotesCount=10&newsCount=0&listsCount=0&enableFuzzyQuery=true";

  try {
    const json = await yahooJson(yPath);
    const results = (json.quotes || [])
      .filter((x) => x.symbol)
      .map((x) => ({
        symbol: x.symbol,
        name: x.longname || x.shortname || x.symbol,
        exchange: x.exchDisp || x.exchange || "",
        type: x.typeDisp || x.quoteType || "",
      }));
    return Response.json({ results }, { headers: { "Cache-Control": "public, max-age=300", "Netlify-CDN-Cache-Control": "public, max-age=3600" } });
  } catch (e) {
    return Response.json({ results: [], error: "errore di rete" }, { status: 502 });
  }
};

export const config = { path: "/api/search" };
