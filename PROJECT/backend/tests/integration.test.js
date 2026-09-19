const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..', '..');
const runtime = path.join(root, 'backend', 'data', 'runtime.json');
const port = 18981, base = `http://127.0.0.1:${port}`;
let child;
async function wait() {
    for (let i = 0; i < 80; i++) {
        try {
            const r = await fetch(base + '/api/health');
            if (r.ok)
                return;
        }
        catch {
        }
        await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('server did not start');
}
async function api(url, opt = {}) {
    const r = await fetch(base + url, { headers: { 'Content-Type': 'application/json' }, ...opt });
    const d = await r.json().catch(() => ({}));
    if (!r.ok)
        throw new Error(d.error || 'request failed');
    return d;
}
async function waitSse(url, eventName, action) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3500);
    try {
        const r = await fetch(base + url, { signal: ac.signal, headers: { Accept: 'text/event-stream' } });
        assert.equal(r.status, 200);
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        const actionP = Promise.resolve().then(action);
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                throw new Error('SSE stream ended');
            buf += dec.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf('\n\n')) >= 0) {
                const frame = buf.slice(0, idx);
                buf = buf.slice(idx + 2);
                let ev = 'message', data = '';
                for (const line of frame.split('\n')) {
                    if (line.startsWith('event:'))
                        ev = line.slice(6).trim();
                    if (line.startsWith('data:'))
                        data += line.slice(5).trim();
                }
                if (ev === eventName) {
                    await actionP;
                    return data ? JSON.parse(data) : {};
                }
            }
        }
    }
    finally {
        clearTimeout(timer);
        ac.abort();
    }
}
test.before(async () => {
    try {
        fs.unlinkSync(runtime);
    }
    catch {
    }
    child = spawn(process.execPath, ['backend/src/server.js'], { cwd: root, env: { ...process.env, PORT: String(port), AUTO_OPEN: 'false', USE_MYSQL: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
    await wait();
});
test.after(() => {
    if (child)
        child.kill();
    try {
        fs.unlinkSync(runtime);
    }
    catch {
    }
});
test('QR endpoint generates 12 distinct table QR codes', async () => {
    const svgs = [];
    for (let i = 1; i <= 12; i++) {
        const r = await fetch(`${base}/api/tables/${i}/qr`);
        assert.equal(r.status, 200);
        const svg = await r.text();
        assert.match(svg, /^<svg/);
        svgs.push(svg);
    }
    assert.equal(new Set(svgs).size, 12);
});
test('12 tables can place independent orders concurrently', async () => {
    await api('/api/admin/reset', { method: 'POST' });
    const tables = await api('/api/tables');
    const orders = await Promise.all(tables.map((t, i) => api('/api/orders', { method: 'POST', body: JSON.stringify({ tableNumber: t.number, token: t.token, guestName: `Guest ${i + 1}`, items: [{ menuItemId: (i % 8) + 1, quantity: 1 }] }) })));
    assert.equal(orders.length, 12);
    assert.equal(new Set(orders.map(o => o.tableNumber)).size, 12);
    const kitchen = await api('/api/kitchen/orders');
    assert.equal(kitchen.length, 12);
    assert.equal(new Set(kitchen.map(o => o.code)).size, 12);
});
test('real-time stream delivers new order to kitchen and status back to the correct table', async () => {
    await api('/api/admin/reset', { method: 'POST' });
    const tables = await api('/api/tables');
    const t = tables.find(x => x.number === 7);
    let created;
    const seen = await waitSse('/events?kitchen=1', 'new_order', async () => {
        created = await api('/api/orders', { method: 'POST', body: JSON.stringify({ tableNumber: 7, token: t.token, items: [{ menuItemId: 5, quantity: 1 }, { menuItemId: 14, quantity: 2 }, { menuItemId: 29, quantity: 1 }] }) });
    });
    assert.equal(seen.code, created.code);
    assert.equal(seen.tableNumber, 7);
    const upd = await waitSse(`/events?table=7&token=${encodeURIComponent(t.token)}`, 'order_update', () => api(`/api/kitchen/orders/${created.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'PREPARING' }) }));
    assert.equal(upd.status, 'PREPARING');
    assert.equal(upd.tableNumber, 7);
});
test('payment amount equals the order total and table releases only after paid + served', async () => {
    await api('/api/admin/reset', { method: 'POST' });
    const t = (await api('/api/tables'))[0];
    const o = await api('/api/orders', { method: 'POST', body: JSON.stringify({ tableNumber: 1, token: t.token, items: [{ menuItemId: 5, quantity: 1 }, { menuItemId: 13, quantity: 2 }] }) });
    await api(`/api/orders/${o.code}/payment/start`, { method: 'POST', body: JSON.stringify({ method: 'UPI' }) });
    const paid = await api(`/api/orders/${o.code}/payment/complete`, { method: 'POST', body: JSON.stringify({ method: 'UPI' }) });
    assert.equal(paid.paymentStatus, 'PAID');
    assert.equal(paid.total, o.total);
    let tab = (await api('/api/tables')).find(x => x.number === 1);
    assert.equal(tab.status, 'ACTIVE');
    await api(`/api/kitchen/orders/${o.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'SERVED' }) });
    tab = (await api('/api/tables')).find(x => x.number === 1);
    assert.equal(tab.status, 'AVAILABLE');
});
