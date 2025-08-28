async function loadMovers(timeframe) {
  const moversEl = document.getElementById("movers");
  moversEl.innerHTML = `<p>Loading ${timeframe} movers...</p>`;

  try {
    const url = "https://api.dexscreener.com/latest/dex/tokens";
    const res = await fetch(url);
    const data = await res.json();

    const movers = data.pairs.slice(0, 5);

    moversEl.innerHTML = movers.map(pair => `
      <div class="mover-card">
        <h3>${pair.baseToken.symbol} / ${pair.quoteToken.symbol}</h3>
        <p>Price: $${pair.priceUsd || "N/A"}</p>
        <p>Liquidity: $${pair.liquidity?.usd || "N/A"}</p>
        <p>FDV: $${pair.fdv || "N/A"}</p>
        <a href="${pair.url}" target="_blank">View on DexScreener</a>
      </div>
    `).join("");
  } catch (e) {
    moversEl.innerHTML = "<p>Error loading data.</p>";
    console.error(e);
  }
}

loadMovers("1m");