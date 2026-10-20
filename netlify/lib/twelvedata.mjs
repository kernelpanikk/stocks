// Fallback Twelve Data quando Yahoo non risponde. Piano gratuito: solo titoli USA e forex, 8 crediti/min.
const BASE = "https://api.twelvedata.com";

const RANGES = {
  "1d": { interval: "5min", outputsize: 400, dates: 1 }, // 400: copre anche il forex, che quota 24h
  "1w": { interval: "30min", outputsize: 300, dates: 5 },
  "1m": { interval: "1day", outputsize: 23, bars: 22 },
  "1y": { interval: "1day", outputsize: 253, bars: 252 },
};

// Simbolo Yahoo → Twelve Data; null se il piano gratuito non lo copre (es. SWDA.MI, ^GSPC)
export function tdSymbol(sym) {
  const fx = /^([A-Z]{3})([A-Z]{3})=X$/.exec(sym);
  if (fx) return fx[1] + "/" + fx[2];
  if (/^[A-Z]{1,5}(-[A-Z])?$/.test(sym)) return sym.replace("-", ".");
  return null;
}

async function td(path, params) {
  // Netlify.env esiste nelle Edge Functions (Deno); process.env solo in Node (test)
  const key = globalThis.Netlify ? Netlify.env.get("TWELVEDATA_API_KEY") : process.env.TWELVEDATA_API_KEY;
  if (!key) throw new Error("TWELVEDATA_API_KEY mancante");
  const res = await fetch(BASE + path + "?" + new URLSearchParams({ ...params, apikey: key }));
  const json = await res.json();
  if (json.status === "error") throw new Error("Twelve Data " + json.code + ": " + json.message);
  return json;
}

const toMs = (s) => Date.parse(s.length === 10 ? s + "T00:00:00Z" : s.replace(" ", "T") + "Z");

// Converte la risposta time_series nello stesso formato di /api/chart con Yahoo
export function toChart(symbol, meta, values, rangeKey) {
  const r = RANGES[rangeKey] || RANGES["1d"];
  const bars = values.map((v) => ({ day: v.datetime.slice(0, 10), t: toMs(v.datetime), c: Number(v.close) })).reverse();
  let start = Math.max(0, bars.length - (r.bars || bars.length));
  if (r.dates) {
    const days = [...new Set(bars.map((b) => b.day))];
    const firstDay = days[Math.max(0, days.length - r.dates)];
    start = bars.findIndex((b) => b.day === firstDay);
  }
  const last = bars[bars.length - 1];
  // prevClose = ultima chiusura prima della finestra (per 1d: l'ultima barra di ieri, ≈ chiusura di ieri)
  const prev = start > 0 ? bars[start - 1].c : null;
  return {
    symbol,
    name: symbol,
    currency: meta.currency || meta.currency_quote || "",
    exchange: meta.exchange || "",
    instrumentType: meta.type || "",
    price: last ? last.c : null,
    prevClose: prev,
    chartPrevClose: prev,
    marketTime: last ? last.t : 0,
    points: bars.slice(start).map((b) => [b.t, b.c]),
  };
}

export async function tdChart(symbol, rangeKey) {
  const s = tdSymbol(symbol);
  if (!s) throw new Error(symbol + " non disponibile nel piano gratuito Twelve Data");
  const r = RANGES[rangeKey] || RANGES["1d"];
  const json = await td("/time_series", { symbol: s, interval: r.interval, outputsize: r.outputsize, timezone: "UTC" });
  return toChart(symbol, json.meta || {}, json.values || [], rangeKey);
}

export async function tdSearch(q) {
  const json = await td("/symbol_search", { symbol: q, outputsize: 30 });
  return (json.data || [])
    .filter((x) => x.country === "United States" && tdSymbol(x.symbol.replace(".", "-")))
    .slice(0, 10)
    .map((x) => ({ symbol: x.symbol.replace(".", "-"), name: x.instrument_name, exchange: x.exchange, type: x.instrument_type }));
}
