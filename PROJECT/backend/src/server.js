const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { createStore } = require('./store');
const { createHandler } = require('./app');
function loadEnv() {
    const f = path.join(__dirname, '..', '..', '.env');
    if (!fs.existsSync(f))
        return;
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
        const s = line.trim();
        if (!s || s.startsWith('#') || !s.includes('='))
            continue;
        const i = s.indexOf('=');
        const k = s.slice(0, i).trim(), v = s.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
        if (process.env[k] === undefined)
            process.env[k] = v;
    }
}
function lanIp() {
    if (process.env.PUBLIC_HOST)
        return process.env.PUBLIC_HOST;
    const all = os.networkInterfaces();
    const candidates = [];
    for (const [name, group] of Object.entries(all))
        for (const n of group || []) {
            if (n.family !== 'IPv4' || n.internal || (n.address || '').startsWith('169.254.'))
                continue;
            const lower = name.toLowerCase();
            let score = 0;
            if (/wi-?fi|wlan|wireless/.test(lower))
                score += 100;
            if (/ethernet|lan/.test(lower))
                score += 60;
            if (/^192\.168\./.test(n.address))
                score += 30;
            else if (/^10\./.test(n.address))
                score += 20;
            else if (/^172\.(1[6-9]|2\d|3[01])\./.test(n.address))
                score += 15;
            if (/virtual|vmware|virtualbox|vethernet|docker|wsl|tailscale|loopback/.test(lower))
                score -= 100;
            candidates.push({ address: n.address, score });
        }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.address || '127.0.0.1';
}
function openBrowser(url) {
    if (String(process.env.AUTO_OPEN || 'true').toLowerCase() === 'false')
        return;
    const { spawn } = require('child_process');
    try {
        if (process.platform === 'win32')
            spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
        else if (process.platform === 'darwin')
            spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
        else
            spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
    catch {
    }
}
class EventHub {
    constructor() {
        this.clients = new Set();
        this.keepAlive = setInterval(() => {
            for (const c of this.clients) {
                try {
                    c.res.write(': ping\n\n');
                }
                catch {
                }
            }
        }, 15000);
        this.keepAlive.unref?.();
    }
    async subscribe(req, res, url, store) {
        const channels = new Set(['all']);
        if (url.searchParams.get('kitchen') === '1')
            channels.add('kitchen');
        if (url.searchParams.get('board') === '1')
            channels.add('board');
        if (url.searchParams.get('admin') === '1')
            channels.add('admin');
        if (url.searchParams.has('table')) {
            const table = await store.validateTable(url.searchParams.get('table'), url.searchParams.get('token'));
            if (!table) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Invalid table QR.' }));
            }
            channels.add(`table:${table.number}`);
        }
        const client = { res, channels };
        this.clients.add(client);
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);
        const cleanup = () => this.clients.delete(client);
        req.on('close', cleanup);
        req.on('aborted', cleanup);
    }
    publish(channel, event, data) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
        for (const c of this.clients) {
            if (!c.channels.has(channel))
                continue;
            try {
                c.res.write(payload);
            }
            catch {
                this.clients.delete(c);
            }
        }
    }
}
loadEnv();
const port = Number(process.env.PORT || 8080);
(async () => {
    const store = await createStore(process.env);
    const events = new EventHub();
    const getBaseUrl = () => `http://${lanIp()}:${port}`;
    const emit = (kind, payload) => {
        if (kind === 'new-order') {
            events.publish('kitchen', 'new_order', payload);
            events.publish(`table:${payload.tableNumber}`, 'order_update', payload);
            events.publish('admin', 'dashboard_change', {});
        }
        else if (kind === 'order-update') {
            events.publish('kitchen', 'order_update', payload);
            events.publish(`table:${payload.tableNumber}`, 'order_update', payload);
            events.publish('admin', 'dashboard_change', {});
        }
        else if (kind === 'table-change')
            events.publish('board', 'table_change', payload);
        else if (kind === 'restaurant-change') {
            events.publish('kitchen', 'restaurant_change', payload);
            events.publish('board', 'restaurant_change', payload);
        }
        else if (kind === 'dashboard-change')
            events.publish('admin', 'dashboard_change', {});
        else if (kind === 'menu-change')
            events.publish('all', 'menu_change', {});
        else if (kind === 'system-reset')
            events.publish('all', 'system_reset', {});
    };
    const handler = createHandler({ store, getBaseUrl, emit, events });
    const server = http.createServer(handler);
    server.listen(port, '0.0.0.0', () => {
        console.log('\n  DINE — Smart Restaurant Ordering System');
        console.log('  ---------------------------------------');
        console.log(`  Local:     http://localhost:${port}`);
        console.log(`  Phone QR:  ${getBaseUrl()}`);
        console.log(`  Kitchen:   http://localhost:${port}/kitchen.html`);
        console.log(`  Manager:   http://localhost:${port}/admin.html`);
        console.log(`  Storage:   ${(process.env.USE_MYSQL || 'false').toLowerCase() === 'true' ? 'MySQL' : 'Local persistent store'}`);
        console.log('  Realtime:  Server-Sent Events (instant server push)');
        console.log('\n  For phone scanning, connect phone + laptop to the same Wi-Fi/hotspot.');
        console.log('  If Windows asks, allow Node.js on Private networks.\n');
        openBrowser(`http://localhost:${port}`);
    });
})().catch(e => {
    console.error('Dine could not start:', e.message);
    if (/mysql2/i.test(e.message || ''))
        console.error('MySQL mode needs the optional mysql2 package: npm install mysql2');
    process.exit(1);
});
