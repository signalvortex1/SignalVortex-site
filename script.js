// SignalVortex — client-only implementation using DexScreener public API
const TABS = { m1: "m1", m5: "m5", h24: "h24" };
let currentTab = TABS.m5; // default to 5m
let cache = []; // combined pairs
let lastDigest = "";

const el = (sel) => document.querySelector(sel);
const els = (sel) => Array.from(document.querySelectorAll(sel));

function fmtUsd(v){
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!isFinite(n)) return "—";
  if (n >= 1e9) return "$" + (n/1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n/1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n/1e3).toFixed(1) + "k";
  if (n < 1 && n > 0) return "$" + n.toFixed(6);
  return "$" + n.toFixed(4);
}

function pct(v){
  if (v === null || v === undefined) return "0";
  const n = Number(v);
  if (!isFinite(n)) return "0";
  const s = (n>=0?"+":"") + n.toFixed(2) + "%";
  return s;
}

function badgeClass(chainId){
  switch(chainId){
    case "solana": return "badge solana";
    case "base": return "badge base";
    case "ethereum": return "badge ethereum";
    case "bsc": return "badge bsc";
    default: return "badge";
  }
}

async function fetchChain(query){
  // DexScreener search by chain returns pairs with priceChange, liquidity, fdv, url
  const url = `https://api.dexscreener.com/latest/dex/search?q=chain:${encodeURIComponent(query)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("API error");
  const j = await r.json();
  return j.pairs || [];
}

async function loadAll(){
  el("#cards").innerHTML = `<div class="empty">Scanning live markets…</div>`;
  try{
    const [sol, base, eth, bsc] = await Promise.all([
      fetchChain("solana"),
      fetchChain("base"),
      fetchChain("ethereum"),
      fetchChain("bsc")
    ]);
    cache = [...sol, ...base, ...eth, ...bsc];
    render();
    buildDigest();
    el("#lastUpdate").textContent = "Updated: " + new Date().toLocaleTimeString();
  }catch(e){
    console.error(e);
    el("#cards").innerHTML = `<div class="empty">Could not load data. Try refresh.</div>`;
  }
}

function getTimefield(pair){
  const pc = pair.priceChange || {};
  return {
    m1: Number(pc.m1 ?? 0),
    m5: Number(pc.m5 ?? 0),
    h24: Number(pc.h24 ?? 0)
  };
}

function render(){
  const lowcap = el("#lowcapToggle").checked;
  const activeChains = els(".chain").filter(c=>c.checked).map(c=>c.value);
  let items = cache.filter(p => activeChains.includes(p.chainId));
  if (lowcap) items = items.filter(p => Number(p.fdv) > 0 && Number(p.fdv) < 100000);

  // sort by current tab change desc
  items.sort((a,b)=>{
    const A = getTimefield(a)[currentTab];
    const B = getTimefield(b)[currentTab];
    return B - A;
  });

  // limit
  items = items.slice(0, 20);

  const html = items.map(p => {
    const pc = getTimefield(p);
    const up5 = pc.m5 >= 0; const up24 = pc.h24 >=0;
    const up1 = pc.m1 >= 0;
    const liq = p.liquidity?.usd ?? p.liquidity?.base ?? null;
    const circ = p.circulatingSupply || null; // often not provided
    const mcap = p.marketCap || (p.priceUsd && circ ? Number(p.priceUsd) * Number(circ) : null);

    const linkDex = p.url || "#";
    const linkCmc = p.info?.cmcUrl || null;
    const linkCg  = p.info?.coingeckoUrl || null;

    return `
      <article class="card">
        <div class="card-head">
          <div>
            <div class="symbol">${p.baseToken?.symbol || "—"}</div>
            <div class="price">${fmtUsd(p.priceUsd)}</div>
          </div>
          <div class="badges">
            <span class="${badgeClass(p.chainId)}">${(p.chainId||"").toUpperCase()}</span>
            ${p.fdv ? `<span class="badge">FDV ${fmtUsd(p.fdv)}</span>` : ""}
          </div>
        </div>

        <div class="metrics">
          <div class="metric">
            <span class="k">Market Cap</span>
            <span class="v">${fmtUsd(mcap)}</span>
          </div>
          <div class="metric">
            <span class="k">Liquidity</span>
            <span class="v">${fmtUsd(liq)}</span>
          </div>
          <div class="metric">
            <span class="k">Circulating Supply</span>
            <span class="v">${circ ? Number(circ).toLocaleString() : "—"}</span>
          </div>
          <div class="metric">
            <span class="k">FDV</span>
            <span class="v">${fmtUsd(p.fdv)}</span>
          </div>
        </div>

        <div class="changes">
          <span class="pill ${up1?'up':'down'}">1m ${pct(pc.m1)}</span>
          <span class="pill ${up5?'up':'down'}">5m ${pct(pc.m5)}</span>
          <span class="pill ${up24?'up':'down'}">24h ${pct(pc.h24)}</span>
        </div>

        <div class="links">
          <a href="${linkDex}" target="_blank" rel="noopener">DexScreener</a>
          ${linkCmc ? `<a href="${linkCmc}" target="_blank" rel="noopener">CMC</a>` : ""}
          ${linkCg ? `<a href="${linkCg}" target="_blank" rel="noopener">CoinGecko</a>` : ""}
        </div>

        <div class="chart">
          ${linkDex && linkDex.startsWith("http") ? `<iframe src="${linkDex}?embed=1&theme=dark" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;border:0"></iframe>` : `<div class="empty">Chart not available</div>`}
        </div>
      </article>
    `;
  }).join("");

  el("#cards").innerHTML = html || `<div class="empty">No matches. Try turning off Low Cap or enabling more chains.</div>`;
}

function buildDigest(){
  const top = [...cache]
    .sort((a,b)=>(Number(b.priceChange?.h24||0) - Number(a.priceChange?.h24||0)))
    .slice(0, 12);

  const lines = [];
  lines.push(`SignalVortex — Top 24h Movers (Auto Digest)`);
  lines.push(new Date().toLocaleString());
  lines.push("");

  top.forEach((p,i)=>{
    const ch = (p.chainId||"").toUpperCase();
    const s = p.baseToken?.symbol || "—";
    const px = fmtUsd(p.priceUsd);
    const p24 = pct(p.priceChange?.h24||0);
    const liq = fmtUsd(p.liquidity?.usd || p.liquidity?.base || 0);
    const fdv = fmtUsd(p.fdv || 0);
    lines.push(`${i+1}. ${s} [${ch}] — ${p24} | ${px} | FDV ${fdv} | Liq ${liq} ${p.url? "• " + p.url : ""}`);
  });

  lastDigest = lines.join("\n");
  el("#digestText").value = lastDigest;
}

function wireUI(){
  // tabs
  els(".tab").forEach(b=>{
    b.addEventListener("click", e=>{
      els(".tab").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      currentTab = b.dataset.tf;
      render();
    })
  });

  // filters
  el("#lowcapToggle").addEventListener("change", render);
  els(".chain").forEach(c=>c.addEventListener("change", render));

  // refresh
  el("#refreshBtn").addEventListener("click", loadAll);

  // copy digest
  el("#copyDigest").addEventListener("click", async ()=>{
    try{
      await navigator.clipboard.writeText(el("#digestText").value);
      el("#copyDigest").textContent = "Copied ✓";
      setTimeout(()=> el("#copyDigest").textContent = "Copy for Telegram", 1200);
    }catch(e){
      alert("Copy failed. Select text manually.");
    }
  });

  // year
  el("#y").textContent = new Date().getFullYear();

  // auto refresh every 2 min
  setInterval(loadAll, 120000);
}

document.addEventListener("DOMContentLoaded", async ()=>{
  wireUI();
  loadAll();
});