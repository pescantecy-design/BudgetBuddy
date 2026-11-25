export const api = {
  async post(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const raw = await res.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch (e) {}
    if (!res.ok) {
      const err: any = new Error((data && data.error) || 'Request failed (' + res.status + ')');
      err.response = { status: res.status, data };
      throw err;
    }
    return { data };
  },
};
