import { handler } from '../backend/index';

export default async function vercelHandler(req: any, res: any) {
  const pathname = new URL(req.url, 'http://localhost').pathname.replace(/\/+$/, '');
  const route = (handler as any)[req.method + ' ' + pathname];
  if (!route) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const event = { requestContext: { http: { sourceIp: forwarded } } };
  try {
    const result = await route[0]({ body: body || {}, event });
    res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
