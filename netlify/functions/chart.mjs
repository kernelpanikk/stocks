// Proxy verso Yahoo Finance (evita il blocco CORS del browser)
// GET /api/chart?symbol=GOOGL&range=1d|1w|1m|1y
const RANGES = {
  "1d": { range: "1d", interval: "5m" },
  "1w": { range: "5d", interval: "30m" },
  "1m": { range: "1mo", interval: "1d" },
  "1y": { range: "1y", interval: "1d" },
};


import { yahooJson } from "../lib/yahoo.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") || "").trim();
  const r = RANGES[url.searchParams.get("range")] || RANGES["1d"];

  if (!symbol || symbol.length > 30) {
    return Response.json({ error: "symbol mancante" }, { status: 400 });
  }

  const yPath =
    "/v8/finance/chart/" +
    encodeURIComponent(symbol) +
    `?range=${r.range}&interval=${r.interval}&includePrePost=false`;

  try {
    const json = await yahooJson(yPath);
    const result = json && json.chart && json.chart.result && json.chart.result[0];
    if (!result) {
      return Response.json({ error: "ticker non trovato" }, { status: 404 });
    }
    const m = result.meta || {};
    const ts = result.timestamp || [];
    const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0].close) || [];

    const points = [];
    for (let i = 0; i < ts.length; i++) {
      if (closes[i] != null) points.push([ts[i] * 1000, closes[i]]);
    }

    return Response.json(
      {
        symbol: m.symbol || symbol,
        name: m.longName || m.shortName || symbol,
        currency: m.currency || "",
        exchange: m.fullExchangeName || m.exchangeName || "",
        instrumentType: m.instrumentType || "",
        price: m.regularMarketPrice,
        prevClose: m.previousClose != null ? m.previousClose : m.chartPreviousClose,
        chartPrevClose: m.chartPreviousClose,
        marketTime: (m.regularMarketTime || 0) * 1000,
        points,
      },
      { headers: { "Cache-Control": "public, max-age=300", "Netlify-CDN-Cache-Control": "public, max-age=300" } }
    );
  } catch (e) {
    return Response.json({ error: "errore di rete verso Yahoo", detail: String(e.message || e) }, { status: 502 });
  }
};

export const config = { path: "/api/chart" };
