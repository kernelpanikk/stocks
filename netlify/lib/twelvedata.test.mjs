// node --test netlify/lib/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { tdSymbol, toChart } from "./twelvedata.mjs";

test("tdSymbol", () => {
  assert.equal(tdSymbol("GOOGL"), "GOOGL");
  assert.equal(tdSymbol("BRK-B"), "BRK.B");
  assert.equal(tdSymbol("EURUSD=X"), "EUR/USD");
  assert.equal(tdSymbol("SWDA.MI"), null);
  assert.equal(tdSymbol("^GSPC"), null);
});

test("toChart 1d: solo l'ultimo giorno, prevClose = ultima barra di ieri", () => {
  const values = [ // Twelve Data: dal più recente
    { datetime: "2026-10-20 14:00:00", close: "12" },
    { datetime: "2026-10-20 13:30:00", close: "11" },
    { datetime: "2026-10-19 19:55:00", close: "10" },
    { datetime: "2026-10-19 13:30:00", close: "9" },
  ];
  const d = toChart("X", { currency: "USD" }, values, "1d");
  assert.equal(d.price, 12);
  assert.equal(d.prevClose, 10);
  assert.deepEqual(d.points, [[Date.UTC(2026, 9, 20, 13, 30), 11], [Date.UTC(2026, 9, 20, 14), 12]]);
});

test("toChart 1m: ultime 22 barre giornaliere", () => {
  const values = Array.from({ length: 23 }, (_, i) => ({ datetime: `2026-09-${String(28 - i).padStart(2, "0")}`, close: String(100 - i) }));
  const d = toChart("X", {}, values, "1m");
  assert.equal(d.points.length, 22);
  assert.equal(d.prevClose, 78);
  assert.equal(d.price, 100);
});
