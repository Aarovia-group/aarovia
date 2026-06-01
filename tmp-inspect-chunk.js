const https = require('https');
const url = 'https://web-aarovia.vercel.app/_next/static/chunks/06h_kovohq3~c.js?dpl=dpl_FJNV7ZbPZpV9BdgeVykNiwjLhiag';
const keywords = ['api-black-rho.vercel.app','web-aarovia.vercel.app','NEXT_PUBLIC_API_URL','baseURL','baseUrl'];
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
      res.on('error', reject);
    }).on('error', reject);
  });
}
(async () => {
  const { status, body } = await fetch(url);
  console.log('status', status);
  for (const key of keywords) {
    let idx = body.indexOf(key);
    while (idx >= 0) {
      console.log('FOUND', key, 'at', idx);
      console.log(body.slice(Math.max(0, idx - 120), idx + 120).replace(/\n/g, ' '));
      idx = body.indexOf(key, idx + 1);
    }
  }
})();
