const http = require('http');
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

function readJson(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => {
      try {
        resolve(d ? JSON.parse(d) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === 'GET' && (url === '/' || url === '/health'))
    return send(res, 200, { ok: true, service: 'wadatrip-mock', time: new Date().toISOString() });

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    return res.end();
  }

  if (method === 'POST' && url === '/pricing/predict') {
    const body = await readJson(req);
    const first = Array.isArray(body?.routes) && body.routes[0] ? body.routes[0] : {};
    const origin = String(first.origin || 'MEX').toUpperCase();
    const destination = String(first.destination || 'CUN').toUpperCase();
    const currency = String(body?.currency || 'USD').toUpperCase();
    const nowPrice = 199 + Math.round(Math.random() * 200);
    const low = Math.max(79, nowPrice - (50 + Math.round(Math.random() * 80)));
    const conf = Math.min(0.95, 0.6 + Math.random() * 0.35);
    const trend = nowPrice > low ? 'down' : 'flat';
    const action = nowPrice > low ? 'wait' : 'buy';
    return send(res, 200, {
      predictions: [
        {
          route: { origin, destination },
          current_price: nowPrice,
          predicted_low: low,
          trend,
          action,
          confidence: conf,
          currency,
        },
      ],
    });
  }

  if (method === 'GET' && (url === '/alerts' || url === '/alerts/list')) {
    const items = [
      { id: 'a1', route: 'MEX-CUN', current_price: 255, predicted_low: 189, action: 'wait', currency: 'USD' },
      { id: 'a2', route: 'JFK-MAD', current_price: 545, predicted_low: 479, action: 'buy', currency: 'USD' },
    ];
    return send(res, 200, { items });
  }

  if (method === 'POST' && url === '/alerts/subscribe') return send(res, 200, { ok: true });

  if (method === 'GET' && url === '/itineraries') {
    const items = [
      { id: 'i1', title: 'Weekend in Cancun', price: 699, currency: 'USD', activities: ['Beach day', 'Cenotes tour', 'Tacos night'] },
      { id: 'i2', title: 'Tokyo Explorer', price: 1299, currency: 'USD', activities: ['Shinjuku walk', 'Senso-ji', 'Sushi class'] },
    ];
    return send(res, 200, { items });
  }

  if (method === 'GET' && url === '/community') {
    const items = [
      { id: 'p1', author: 'alice@example.com', message: 'Just landed in Cancun! Any food tips?', location: { city: 'Cancun, MX' }, createdAt: new Date().toISOString() },
      { id: 'p2', author: 'bob@example.com', message: 'Tokyo in autumn is amazing 🍁', location: { city: 'Tokyo, JP' }, createdAt: new Date(Date.now() - 3600_000).toISOString() },
    ];
    return send(res, 200, { items });
  }

  return notFound(res);
});

server.listen(PORT, '0.0.0.0', () => console.log(`[mock-backend] listening on http://0.0.0.0:${PORT}`));

