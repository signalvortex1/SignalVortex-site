
const fetch = require('node-fetch');
exports.handler = async function(event, context) {
  const chain = event.queryStringParameters && event.queryStringParameters.chain;
  if(!chain) return { statusCode: 400, body: 'chain required' };
  const url = `https://api.dexscreener.com/latest/dex/search?q=chain:${encodeURIComponent(chain)}`;
  try{
    const r = await fetch(url);
    const json = await r.json();
    return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify(json) };
  }catch(e){
    return { statusCode: 500, body: 'proxy error' };
  }
};
