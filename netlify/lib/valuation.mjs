// Indicatori e stime di valore con formule standard sui dati quoteSummary di Yahoo.
// Sono strumenti di analisi, non un consiglio d'investimento: ogni stima dipende dalle ipotesi qui sotto.
export const DCF = { years: 5, maxGrowth: 0.15, terminal: 0.025, discount: 0.09 };

// Numero di Graham: √(22,5 × utile per azione × patrimonio per azione); solo con entrambi positivi
export function graham(eps, bvps) {
  return eps > 0 && bvps > 0 ? Math.sqrt(22.5 * eps * bvps) : null;
}

export const dcfGrowth = (growth, a = DCF) => Math.min(a.maxGrowth, Math.max(0, growth ?? 0));

// Utili attualizzati a due fasi: crescita g per `years` anni, poi crescita perpetua `terminal`
export function dcfEps(eps, growth, a = DCF) {
  if (!(eps > 0)) return null;
  const g = dcfGrowth(growth, a);
  let v = 0, e = eps;
  for (let t = 1; t <= a.years; t++) { e *= 1 + g; v += e / (1 + a.discount) ** t; }
  return v + (e * (1 + a.terminal)) / (a.discount - a.terminal) / (1 + a.discount) ** a.years;
}

const raw = (o, k) => (o && o[k] && typeof o[k] === "object" ? o[k].raw : undefined) ?? null;

export function fromQuoteSummary(symbol, r) {
  const sd = r.summaryDetail, ks = r.defaultKeyStatistics, fd = r.financialData, pr = r.price, ap = r.assetProfile;
  const currency = pr?.currency || null, finCur = fd?.financialCurrency || null;
  const price = raw(fd, "currentPrice") ?? raw(pr, "regularMarketPrice");
  const m = {
    pe: raw(sd, "trailingPE"), fwdPe: raw(sd, "forwardPE"), peg: raw(ks, "pegRatio"), pb: raw(ks, "priceToBook"),
    evEbitda: raw(ks, "enterpriseToEbitda"), divYield: raw(sd, "dividendYield"), roe: raw(fd, "returnOnEquity"),
    debtEq: raw(fd, "debtToEquity"), eps: raw(ks, "trailingEps"), bvps: raw(ks, "bookValue"), growth: raw(fd, "earningsGrowth"),
  };
  // utile e patrimonio sono nella valuta di bilancio: confrontarli col prezzo ha senso solo se coincide (es. no ADR, no pence)
  const sameCur = !!currency && currency === finCur;
  const est = (id, value, reason, extra) => ({ id, value, reason: value == null ? reason : null, diff: value != null && price ? (value - price) / price : null, ...extra });
  const analyst = raw(fd, "targetMeanPrice");
  return {
    symbol, quoteType: pr?.quoteType || null, currency, price,
    sector: ap?.sector || null, industry: ap?.industry || null,
    metrics: m,
    estimates: [
      est("graham", sameCur ? graham(m.eps, m.bvps) : null, !sameCur ? "currency" : "negative"),
      est("dcf", sameCur ? dcfEps(m.eps, m.growth) : null, !sameCur ? "currency" : m.eps > 0 ? null : "negative", { growth: dcfGrowth(m.growth) }),
      est("analyst", analyst, "none", { count: raw(fd, "numberOfAnalystOpinions") }),
    ],
  };
}
