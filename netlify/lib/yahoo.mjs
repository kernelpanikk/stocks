// Fetch verso Yahoo Finance con fallback cookie+crumb quando Yahoo limita l'IP (401/429)
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const HEADERS = { "User-Agent": UA, Accept: "application/json" };

let session = null; // { cookie, crumb } riusato tra invocazioni "calde" della function

async function getSession() {
  if (session) return session;
  const fc = await fetch("https://fc.yahoo.com", { headers: HEADERS, redirect: "manual" });
  const cookie = fc.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("cookie Yahoo non ricevuto");
  // il crumb è text/plain: con Accept: application/json Yahoo risponde 406
  const res = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers: { ...HEADERS, Accept: "*/*", Cookie: cookie } });
  const crumb = (await res.text()).trim();
  if (!res.ok || !crumb || crumb.includes("<")) throw new Error("crumb Yahoo non ricevuto: " + res.status);
  return (session = { cookie, crumb });
}

// path es. "/v8/finance/chart/GOOGL?range=1d&interval=5m" → JSON
export async function yahooJson(path) {
  const res = await fetch("https://query1.finance.yahoo.com" + path, { headers: HEADERS });
  if (res.status !== 401 && res.status !== 429) return res.json();

  for (let attempt = 0; attempt < 2; attempt++) {
    const s = await getSession();
    const sep = path.includes("?") ? "&" : "?";
    const r = await fetch("https://query2.finance.yahoo.com" + path + sep + "crumb=" + encodeURIComponent(s.crumb), {
      headers: { ...HEADERS, Cookie: s.cookie },
    });
    if (r.status !== 401 && r.status !== 429) return r.json();
    session = null; // crumb scaduto o bruciato: ne chiedo uno nuovo
  }
  throw new Error("Yahoo rate limit");
}
