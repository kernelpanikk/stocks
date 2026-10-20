// Indicatori di bilancio e stime di valore (Yahoo quoteSummary, richiede cookie+crumb)
// GET /api/fundamentals?symbol=AAPL
import { yahooJson } from "../lib/yahoo.mjs";
import { fromQuoteSummary } from "../lib/valuation.mjs";

// i bilanci cambiano di rado: 6 ore di cache CDN
const CACHE = { "Cache-Control": "public, max-age=3600", "Netlify-CDN-Cache-Control": "public, max-age=21600", "Netlify-Vary": "query=symbol" };
const MODULES = "summaryDetail,defaultKeyStatistics,financialData,price,assetProfile";

export default async (req) => {
  const symbol = (new URL(req.url).searchParams.get("symbol") || "").trim();
  if (!symbol || symbol.length > 30) return Response.json({ error: "symbol mancante" }, { status: 400 });
  try {
    const json = await yahooJson(`/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${MODULES}`);
    const r = json && json.quoteSummary && json.quoteSummary.result && json.quoteSummary.result[0];
    if (!r) return Response.json({ error: "dati non disponibili" }, { status: 404 });
    return Response.json(fromQuoteSummary(symbol, r), { headers: CACHE });
  } catch (e) {
    return Response.json({ error: "dati non disponibili", detail: String(e.message || e) }, { status: 502 });
  }
};

// cache manual: la CDN rispetta Netlify-CDN-Cache-Control
export const config = { path: "/api/fundamentals", cache: "manual" };
