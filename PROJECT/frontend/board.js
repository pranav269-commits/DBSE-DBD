const $ = s => document.querySelector(s);
const toast = $('#toast');
let tables = [];
let baseUrl = '';
function money(n) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));
}
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}
async function api(url, opt = {}) {
    const r = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) }, ...opt });
    const data = await r.json().catch(() => ({}));
    if (!r.ok)
        throw new Error(data.error || 'Request failed');
    return data;
}
function render() {
    const grid = $('#tablesGrid');
    const available = tables.filter(t => t.status === 'AVAILABLE').length;
    $('#summaryText').textContent = `${available} available · ${tables.length - available} currently active`;
    grid.innerHTML = tables.map(t => {
        const no = String(t.number).padStart(2, '0');
        const active = t.status === 'ACTIVE';
        return `<article class="table-card ${active ? 'active-table' : ''}" data-table="${t.number}"><div class="table-top"><span class="table-no">Table ${no}</span><span class="table-status ${active ? 'active' : ''}">${active ? 'Currently active' : 'Available'}</span></div>${active ? `<div class="qr-wrap"><div class="active-center"><div class="lock">●</div><strong>Dining session active</strong><span>${t.currentOrderCode || 'Order in progress'}</span></div></div>` : `<div class="qr-wrap"><img src="/api/tables/${t.number}/qr" alt="QR code for Table ${no}"></div>`}<div class="table-foot"><span>${t.capacity} seats</span>${active ? `<span>QR hidden while occupied</span>` : `<a href="/menu.html?table=${t.number}&token=${encodeURIComponent(t.token)}">Open menu ↗</a>`}</div></article>`;
    }).join('');
}
async function load() {
    try {
        const [cfg, t] = await Promise.all([api('/api/config'), api('/api/tables')]);
        baseUrl = cfg.baseUrl;
        tables = t;
        render();
        $('#connectionLabel').textContent = 'Phone-ready';
        $('#networkLabel').textContent = baseUrl.replace('http://', '');
    }
    catch (e) {
        $('#connectionLabel').textContent = 'Connection issue';
        $('#networkLabel').textContent = e.message;
        showToast(e.message);
    }
}
$('#refreshBtn').onclick = load;
const stream = new EventSource('/events?board=1');
stream.onopen = () => {
    $('#connectionLabel').textContent = 'Live connection ready';
};
stream.addEventListener('table_change', e => {
    const x = JSON.parse(e.data);
    const t = tables.find(a => a.number === Number(x.tableNumber));
    if (t) {
        t.status = x.status;
        t.currentOrderCode = x.orderCode || null;
        render();
    }
});
stream.addEventListener('system_reset', () => {
    showToast('System reset complete');
    load();
});
stream.onerror = () => {
    $('#connectionLabel').textContent = 'Reconnecting…';
};
load();
