const fs = require('fs');
const path = require('path');
const { toSvg } = require('./qr');
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon' };
function send(res, status, body, type = 'text/plain; charset=utf-8', headers = {}) {
    const b = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
    res.writeHead(status, { 'Content-Type': type, 'Content-Length': b.length, 'Cache-Control': 'no-store', ...headers });
    res.end(b);
}
function json(res, status, data) {
    send(res, status, JSON.stringify(data), 'application/json; charset=utf-8');
}
async function body(req) {
    let raw = '';
    for await (const c of req) {
        raw += c;
        if (raw.length > 524288)
            throw new Error('Request body too large.');
    }
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new Error('Invalid JSON body.');
    }
}
function staticFile(urlPath) {
    let p = decodeURIComponent(urlPath.split('?')[0]);
    if (p === '/')
        p = '/index.html';
    if (!path.extname(p))
        p += '.html';
    const target = path.resolve(FRONTEND_DIR, '.' + p);
    return target.startsWith(path.resolve(FRONTEND_DIR) + path.sep) || target === path.join(FRONTEND_DIR, 'index.html') ? target : null;
}
async function serveStatic(req, res, url) {
    const f = staticFile(url.pathname);
    if (!f)
        return send(res, 403, 'Forbidden');
    try {
        const data = await fs.promises.readFile(f);
        send(res, 200, data, mime[path.extname(f)] || 'application/octet-stream', { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
    }
    catch (e) {
        if (e.code === 'ENOENT')
            send(res, 404, 'Not found');
        else
            throw e;
    }
}
function createHandler({ store, getBaseUrl, emit, events }) {
    return async function handler(req, res) {
        try {
            const url = new URL(req.url, 'http://local');
            const method = req.method || 'GET';
            if (method === 'GET' && url.pathname === '/events')
                return events.subscribe(req, res, url, store);
            if (url.pathname.startsWith('/api/')) {
                if (method === 'GET' && url.pathname === '/api/health')
                    return json(res, 200, await store.health());
                if (method === 'GET' && url.pathname === '/api/config')
                    return json(res, 200, { name: 'Dine', baseUrl: getBaseUrl(), tableCount: 12, realtime: 'SSE' });
                if (method === 'GET' && url.pathname === '/api/categories')
                    return json(res, 200, await store.getCategories());
                if (method === 'GET' && url.pathname === '/api/menu')
                    return json(res, 200, await store.getMenu(Object.fromEntries(url.searchParams.entries())));
                if (method === 'GET' && url.pathname === '/api/status')
                    return json(res, 200, await store.getRestaurantStatus());
                if (method === 'GET' && url.pathname === '/api/tables')
                    return json(res, 200, await store.getTables());
                if (method === 'GET' && url.pathname === '/api/tables/validate') {
                    const t = await store.validateTable(url.searchParams.get('table'), url.searchParams.get('token'));
                    return t ? json(res, 200, { valid: true, table: t }) : json(res, 403, { valid: false, error: 'Invalid table QR.' });
                }
                let m = url.pathname.match(/^\/api\/tables\/(\d+)\/qr$/);
                if (method === 'GET' && m) {
                    const tables = await store.getTables();
                    const t = tables.find(x => x.number === Number(m[1]));
                    if (!t)
                        return json(res, 404, { error: 'Table not found.' });
                    const target = `${getBaseUrl()}/menu.html?table=${t.number}&token=${encodeURIComponent(t.token)}`;
                    return send(res, 200, toSvg(target, { size: 320, margin: 4 }), 'image/svg+xml; charset=utf-8');
                }
                m = url.pathname.match(/^\/api\/tables\/(\d+)\/active-order$/);
                if (method === 'GET' && m) {
                    const o = await store.getActiveOrderForTable(Number(m[1]), url.searchParams.get('token'));
                    return json(res, 200, o || null);
                }
                if (method === 'POST' && url.pathname === '/api/orders') {
                    const o = await store.placeOrder(await body(req));
                    emit('new-order', o);
                    emit('table-change', { tableNumber: o.tableNumber, status: 'ACTIVE', orderCode: o.code });
                    emit('restaurant-change', await store.getRestaurantStatus());
                    emit('dashboard-change');
                    return json(res, 201, o);
                }
                m = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
                if (method === 'GET' && m) {
                    const o = await store.getOrderByCode(decodeURIComponent(m[1]));
                    return o ? json(res, 200, o) : json(res, 404, { error: 'Order not found.' });
                }
                if (method === 'GET' && url.pathname === '/api/kitchen/orders')
                    return json(res, 200, await store.getKitchenOrders());
                m = url.pathname.match(/^\/api\/kitchen\/orders\/(\d+)\/status$/);
                if (method === 'PATCH' && m) {
                    const p = await body(req);
                    const o = await store.updateOrderStatus(Number(m[1]), p.status);
                    if (!o)
                        return json(res, 404, { error: 'Order not found.' });
                    emit('order-update', o);
                    if ((['SERVED', 'CANCELLED'].includes(o.status) && o.paymentStatus === 'PAID') || o.status === 'CANCELLED')
                        emit('table-change', { tableNumber: o.tableNumber, status: 'AVAILABLE', orderCode: null });
                    emit('restaurant-change', await store.getRestaurantStatus());
                    emit('dashboard-change');
                    return json(res, 200, o);
                }
                m = url.pathname.match(/^\/api\/orders\/([^/]+)\/payment\/start$/);
                if (method === 'POST' && m) {
                    const p = await body(req);
                    const o = await store.startPayment(decodeURIComponent(m[1]), p.method);
                    if (!o)
                        return json(res, 404, { error: 'Order not found.' });
                    emit('order-update', o);
                    emit('dashboard-change');
                    return json(res, 200, o);
                }
                m = url.pathname.match(/^\/api\/orders\/([^/]+)\/payment\/complete$/);
                if (method === 'POST' && m) {
                    const p = await body(req);
                    const o = await store.completePayment(decodeURIComponent(m[1]), p.method);
                    if (!o)
                        return json(res, 404, { error: 'Order not found.' });
                    emit('order-update', o);
                    if (o.status === 'SERVED')
                        emit('table-change', { tableNumber: o.tableNumber, status: 'AVAILABLE', orderCode: null });
                    emit('dashboard-change');
                    return json(res, 200, o);
                }
                m = url.pathname.match(/^\/api\/orders\/([^/]+)\/upi-qr$/);
                if (method === 'GET' && m) {
                    const o = await store.getOrderByCode(decodeURIComponent(m[1]));
                    if (!o)
                        return json(res, 404, { error: 'Order not found.' });
                    const upi = `upi://pay?pa=dine.restaurant@upi&pn=Dine%20Restaurant&am=${Number(o.total).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Dine order ${o.code}`)}`;
                    return send(res, 200, toSvg(upi, { size: 300, margin: 4 }), 'image/svg+xml; charset=utf-8');
                }
                if (method === 'GET' && url.pathname === '/api/admin/dashboard')
                    return json(res, 200, await store.adminDashboard());
                if (method === 'GET' && url.pathname === '/api/admin/inventory')
                    return json(res, 200, await store.getInventory());
                m = url.pathname.match(/^\/api\/admin\/inventory\/(\d+)\/restock$/);
                if (method === 'PATCH' && m) {
                    const p = await body(req);
                    const x = await store.restockInventory(Number(m[1]), p.amount);
                    emit('dashboard-change');
                    return x ? json(res, 200, x) : json(res, 404, { error: 'Ingredient not found.' });
                }
                m = url.pathname.match(/^\/api\/admin\/menu\/(\d+)\/availability$/);
                if (method === 'PATCH' && m) {
                    const p = await body(req);
                    const x = await store.toggleMenuAvailability(Number(m[1]), p.available);
                    emit('menu-change');
                    return x ? json(res, 200, x) : json(res, 404, { error: 'Menu item not found.' });
                }
                if (method === 'POST' && url.pathname === '/api/admin/reset') {
                    const r = await store.reset();
                    emit('system-reset');
                    return json(res, 200, r);
                }
                return json(res, 404, { error: 'API route not found.' });
            }
            if (method !== 'GET' && method !== 'HEAD')
                return send(res, 405, 'Method not allowed');
            return serveStatic(req, res, url);
        }
        catch (e) {
            console.error('[Dine]', e);
            return json(res, 400, { error: e.message || 'Something went wrong.' });
        }
    };
}
module.exports = { createHandler };
