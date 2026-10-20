# Borsa — webapp watchlist

Web app (PWA) per seguire titoli e indici: aggiungi/rimuovi ticker, scegli valuta (originale/EUR/USD), grafico interattivo 1G/1S/1M/1A.

## Struttura
- `public/index.html` — tutta l'interfaccia (HTML/CSS/JS, nessuna dipendenza). Watchlist salvata in localStorage.
- `netlify/functions/chart.mjs` — `/api/chart?symbol=GOOGL&range=1d|1w|1m|1y`, proxy verso Yahoo Finance (serve per evitare il blocco CORS del browser).
- `netlify/functions/search.mjs` — `/api/search?q=nvidia`, ricerca ticker.
- `netlify.toml` — publish `public`, functions `netlify/functions`.

## Avvio in locale
    npm install -g netlify-cli
    netlify dev
Poi apri http://localhost:8888

## Yahoo e rate limit
Yahoo risponde a intermittenza 429 (Too Many Requests), soprattutto dagli IP dei data center.
`netlify/lib/yahoo.mjs` prova query1; su 401/429 ritenta su query2 con cookie (fc.yahoo.com) + crumb.
Le risposte sono in cache CDN (chart 5 min, search 1 h) per ridurre le chiamate.
Se non basta: Twelve Data (API key gratuita, ma solo titoli USA nel piano free).
