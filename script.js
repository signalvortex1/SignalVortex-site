
const CHAINS=['solana','base','ethereum','bsc'];const CARDS_LIMIT=24;let currentTime='m1';let lowcap=false;const el=s=>document.querySelector(s),els=s=>Array.from(document.querySelectorAll(s));
function fmtUSD(v){if(v===null||v===undefined) return '—';const n=Number(v);if(!isFinite(n))return '—';if(n>=1e9)return '$'+(n/1e9).toFixed(2)+'B';if(n>=1e6)return '$'+(n/1e6).toFixed(2)+'M';if(n>=1e3)return '$'+(n/1e3).toFixed(1)+'k';if(n<1)return '$'+n.toFixed(6);return '$'+n.toFixed(2);}function pct(v){if(v===null||v===undefined)return '—';const n=Number(v);return (n>=0?'+':'')+n.toFixed(2)+'%';}
async function fetchChain(chain){const proxy=`/.netlify/functions/proxy?chain=${encodeURIComponent(chain)}`;try{const r=await fetch(proxy);if(r.ok){const j=await r.json();return j.pairs||[]}}catch(e){}const url=`https://api.dexscreener.com/latest/dex/search?q=chain:${encodeURIComponent(chain)}`;const r2=await fetch(url);if(!r2.ok) throw new Error('api fail');const j2=await r2.json();return j2.pairs||[];}
async function loadAll(){el('#cards').innerHTML='<div class="empty">Scanning live markets…</div>';try{const res=await Promise.all(CHAINS.map(c=>fetchChain(c)));let pairs=res.flat().map(p=>({chainId:p.chainId,pairAddress:p.pairAddress,baseToken:p.baseToken,priceUsd:Number(p.priceUsd||0),fdv:Number(p.fdvUsd||p.fdv||0),liquidity:p.liquidity||null,priceChange:p.priceChange||{},marketCap:p.marketCap||null,url:p.url||( 'https://dexscreener.com/'+p.chainId+'/'+p.pairAddress ),info:p.info||{}}));if(lowcap) pairs=pairs.filter(x=>x.fdv && x.fdv>0 && x.fdv<100000);pairs.sort((a,b)=>(Number(b.priceChange[currentTime]||0)-Number(a.priceChange[currentTime]||0)));pairs=pairs.slice(0,CARDS_LIMIT);renderCards(pairs);buildDigest(pairs);el('#last').textContent='Last updated: '+new Date().toLocaleTimeString();}catch(e){console.error(e);el('#cards').innerHTML='<div class="empty">Could not load markets. Try refresh.</div>';}}
function renderCards(pairs){if(!pairs.length){el('#cards').innerHTML='<div class="empty">No movers found.</div>';return;}el('#cards').innerHTML=pairs.map(p=>{const up1=Number(p.priceChange.m1||0)>=0;const up5=Number(p.priceChange.m5||0)>=0;const up24=Number(p.priceChange.h24||0)>=0;const liq=p.liquidity?.usd||p.liquidity?.base||null;const circ=p.info?.circulatingSupply||p.circulatingSupply||'—';const mcap=p.marketCap|| (p.priceUsd && circ && !isNaN(circ) ? Number(p.priceUsd)*Number(circ) : null );return `
      <article class="card">
        <div class="head">
          <div>
            <div class="symbol">${p.baseToken?.symbol || '—'} <span class="muted">/${p.baseToken?.name||''}</span></div>
            <div class="price">${fmtUSD(p.priceUsd)}</div>
          </div>
          <div class="badges">
            <span class="badge">${(p.chainId||'').toUpperCase()}</span>
            ${p.fdv?`<span class="badge">FDV ${fmtUSD(p.fdv)}</span>`:''}
          </div>
        </div>
        <div class="metrics">
          <div class="metric"><span class="k">Market Cap</span><span class="v">${fmtUSD(mcap)}</span></div>
          <div class="metric"><span class="k">Liquidity</span><span class="v">${fmtUSD(liq)}</span></div>
          <div class="metric"><span class="k">Circulating</span><span class="v">${circ}</span></div>
          <div class="metric"><span class="k">FDV</span><span class="v">${fmtUSD(p.fdv)}</span></div>
        </div>
        <div class="changes">
          <div class="pill ${up1? 'pos':'neg'}">1m ${pct(p.priceChange.m1)}</div>
          <div class="pill ${up5? 'pos':'neg'}">5m ${pct(p.priceChange.m5)}</div>
          <div class="pill ${up24? 'pos':'neg'}">24h ${pct(p.priceChange.h24)}</div>
        </div>
        <div class="links">
          <a href="${p.url}" target="_blank">DexScreener</a>
          ${'${p.info?.coinmarketcapUrl?`<a href="'+p.info.coinmarketcapUrl+'" target="_blank">CMC</a>`:'' }'}
        </div>
        <div class="chart"><iframe src="${p.url}?embed=1&theme=dark" loading="lazy" referrerpolicy="no-referrer"></iframe></div>
      </article>`;}).join('');}
function buildDigest(pairs){const lines=[];lines.push('SignalVortex — Top Movers');lines.push(new Date().toLocaleString());lines.push('');pairs.slice(0,12).forEach((p,i)=>{const ch=p.priceChange.h24||0;lines.push(`${i+1}. ${p.baseToken?.symbol || '—'} [${(p.chainId||'').toUpperCase()}] — ${pct(ch)} | ${fmtUSD(p.priceUsd)} | FDV ${fmtUSD(p.fdv)} | ${p.url}`);});el('#digestText').textContent=lines.join('\n');}
function wire(){els('.tab').forEach(b=> b.addEventListener('click', ()=>{els('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentTime=b.dataset.tf;loadAll();}));els('.chain').forEach(c=> c.addEventListener('change', loadAll));document.getElementById('lowcap').addEventListener('change', e=>{lowcap=e.target.checked;loadAll();});document.getElementById('refresh').addEventListener('click', loadAll);document.getElementById('copyDigest').addEventListener('click', async ()=>{try{await navigator.clipboard.writeText(el('#digestText').textContent);alert('Digest copied ✅');}catch(e){alert('Copy failed — select text and copy manually');}});loadAll();setInterval(()=>{if(currentTime==='m1') loadAll();},60000);setInterval(loadAll,120000);}document.addEventListener('DOMContentLoaded', wire);
