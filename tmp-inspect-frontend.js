const https = require('https');
const { URL } = require('url');

const pageUrl = 'https://web-aarovia.vercel.app/auth/login';
const keywords = ['api-black-rho.vercel.app','NEXT_PUBLIC_API_URL','api/auth/login','process.env.NEXT_PUBLIC_API_URL'];

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
  console.log('Fetching page', pageUrl);
  const page = await fetch(pageUrl);
  const scriptUrls = Array.from(page.body.matchAll(/<script[^>]+src="([^"]+)"/g)).map(m => m[1]);
  console.log('Found', scriptUrls.length, 'script URLs');
  for (const script of scriptUrls) {
    const url = script.startsWith('http') ? script : new URL(script, pageUrl).toString();
    process.stdout.write('Checking ' + url + ' ... ');
    try {
      const result = await fetch(url);
      if (result.status !== 200) {
        console.log('STATUS', result.status);
        continue;
      }
      const found = keywords.filter(k => result.body.includes(k));
      if (found.length) {
        console.log('FOUND', found.join(', '));
        for (const k of found) {
          const idx = result.body.indexOf(k);
          console.log('  SNIPPET', result.body.slice(Math.max(0, idx - 80), idx + 80).replace(/\n/g, ' '));
        }
      } else {
        console.log('none');
      }
    } catch (e) {
      console.log('ERR', e.message);
    }
  }
})().catch((err) => { console.error('ERROR', err); process.exit(1) });
