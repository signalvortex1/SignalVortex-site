document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("token-list");
  list.innerHTML = "Fetching data from DexScreener...";

  fetch("https://api.dexscreener.com/latest/dex/tokens/solana")
    .then(r => r.json())
    .then(data => {
      list.innerHTML = "";
      if (!data || !data.pairs) {
        list.innerHTML = "No data available.";
        return;
      }
      data.pairs.slice(0, 3).forEach(pair => {
        const card = document.createElement("div");
        card.className = "token-card";
        card.innerHTML = `
          <h3>${pair.baseToken.symbol} / ${pair.quoteToken.symbol}</h3>
          <p>FDV: $${pair.fdv?.toLocaleString() || "N/A"}</p>
          <p>Liquidity: $${pair.liquidity?.usd?.toLocaleString() || "N/A"}</p>
          <iframe src="https://dexscreener.com/solana/${pair.pairAddress}?embed=1"></iframe>
        `;
        list.appendChild(card);
      });
    })
    .catch(err => {
      list.innerHTML = "Error fetching data.";
    });
});
