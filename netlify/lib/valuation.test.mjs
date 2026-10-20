// node --test netlify/lib/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { graham, dcfEps, fromQuoteSummary } from "./valuation.mjs";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test("graham", () => {
  near(graham(2, 10), Math.sqrt(450));
  assert.equal(graham(-1, 10), null);
  assert.equal(graham(2, 0), null);
});

test("dcf: crescita zero = rendita perpetua attualizzata", () => {
  // con g=0: somma 5 anni di 1/(1.09)^t + valore terminale 1.025/(0.065)/(1.09)^5
  let v = 0; for (let t = 1; t <= 5; t++) v += 1 / 1.09 ** t;
  v += 1.025 / 0.065 / 1.09 ** 5;
  near(dcfEps(1, 0), v);
  assert.equal(dcfEps(0, 0.1), null);
  // la crescita viene limitata al 15%
  near(dcfEps(1, 0.9), dcfEps(1, 0.15));
});

const qs = (over = {}) => ({
  summaryDetail: { trailingPE: { raw: 20 }, dividendYield: { raw: 0.03 } },
  defaultKeyStatistics: { trailingEps: { raw: 2 }, bookValue: { raw: 10 } },
  financialData: { currentPrice: { raw: 25 }, financialCurrency: "EUR", targetMeanPrice: { raw: 30 }, numberOfAnalystOpinions: { raw: 7 }, earningsGrowth: { raw: 0.05 } },
  price: { currency: "EUR", quoteType: "EQUITY" },
  ...over,
});

test("fromQuoteSummary: stime e differenza dal prezzo", () => {
  const f = fromQuoteSummary("X", qs());
  const [g, d, a] = f.estimates;
  near(g.value, Math.sqrt(450));
  near(g.diff, (Math.sqrt(450) - 25) / 25);
  assert.ok(d.value > 0);
  assert.equal(a.value, 30); assert.equal(a.count, 7); near(a.diff, 0.2);
  assert.equal(f.metrics.pe, 20);
});

test("fromQuoteSummary: valuta di bilancio diversa → niente Graham/DCF", () => {
  const f = fromQuoteSummary("X", qs({ price: { currency: "GBp", quoteType: "EQUITY" } }));
  assert.equal(f.estimates[0].value, null); assert.equal(f.estimates[0].reason, "currency");
  assert.equal(f.estimates[1].reason, "currency");
});

test("fromQuoteSummary: utili negativi", () => {
  const f = fromQuoteSummary("X", qs({ defaultKeyStatistics: { trailingEps: { raw: -1 }, bookValue: { raw: 10 } } }));
  assert.equal(f.estimates[0].reason, "negative");
  assert.equal(f.estimates[1].reason, "negative");
});
