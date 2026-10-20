# StocksWatcher — webapp watchlist

Web app (PWA) per seguire titoli e indici: aggiungi/rimuovi ticker, scegli valuta (originale/EUR/USD), grafico interattivo 1G/1S/1M/1A.

## Struttura
- `public/index.html` — tutta l'interfaccia (HTML/CSS/JS, nessuna dipendenza). Watchlist salvata in localStorage.
- `netlify/edge-functions/chart.js` — `/api/chart?symbol=GOOGL&range=1d|1w|1m|1y`, proxy verso Yahoo Finance (serve per evitare il blocco CORS del browser).
- `netlify/edge-functions/search.js` — `/api/search?q=nvidia`, ricerca ticker.
- `netlify.toml` — publish `public`.

## Avvio in locale
    npm install -g netlify-cli
    netlify dev
Poi apri http://localhost:8888

## Yahoo e rate limit
Yahoo risponde 429 (Too Many Requests) alle Netlify Functions (AWS), ma non alle Edge Functions (Deno): per questo chart e search sono Edge Functions (verificato il 2026-10-20).
`netlify/lib/yahoo.mjs` prova query1; su 401/429 ritenta su query2 con cookie (fc.yahoo.com) + crumb.
Le risposte sono in cache CDN (chart 5 min, search 1 h) per ridurre le chiamate.
Se Yahoo fallisce, `netlify/lib/twelvedata.mjs` usa Twelve Data (piano gratuito: solo titoli USA e cambi, 8 richieste/min).
Serve `TWELVEDATA_API_KEY`: in locale nel file `.env` (escluso da git), in produzione nelle Environment variables di Netlify.
Test: `node --test netlify/lib/*.test.mjs`
