const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const toast = $('#toast');
let orders = [], restaurant = {};
const STATUS_FLOW = ['CONFIRMED', 'PREPARING', 'COOKING', 'PLATING', 'READY', 'SERVED'];
function money(n) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));
}
function esc(s) {
    return String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}
function showToast(m) {
    toast.textContent = m;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}
async function api(url, opt = {}) {
    const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opt });
    const d = await r.json().catch(() => ({}));
    if (!r.ok)
        throw new Error(d.error || 'Request failed');
    return d;
}
function statusLabel(s) {
    return s[0] + s.slice(1).toLowerCase();
}
function renderMetrics() {
    const active = orders.length;
    const preparing = orders.filter(o => ['PREPARING', 'COOKING', 'PLATING'].includes(o.status)).length;
    const ready = orders.filter(o => o.status === 'READY').length;
    $('#activeCount').textContent = active;
    $('#loadValue').textContent = `${restaurant.kitchenLoad || 0}%`;
    $('#preparingCount').textContent = preparing;
    $('#readyCount').textContent = ready;
}
function render() {
    renderMetrics();
    const grid = $('#kitchenGrid');
    if (!orders.length) {
        grid.innerHTML = '<div class="empty-state"><strong>Kitchen is clear</strong>New table orders will appear here automatically.</div>';
        return;
    }
    grid.innerHTML = orders.map(o => {
        const urgent = Number(o.elapsedMinutes) >= Number(o.estimatedWait);
        const notes = o.items.filter(i => i.notes).map(i => `${i.name}: ${i.notes}`).join(' · ');
        return `<article class="order-card ${urgent ? 'urgent' : ''} ${o.status === 'READY' ? 'ready' : ''}" data-id="${o.id}"><div class="order-card-head"><div><div class="order-table">Table ${String(o.tableNumber).padStart(2, '0')}</div><div class="order-code">${esc(o.code)} · ${esc(o.guestName || 'Guest')}</div></div><span class="timer">${o.elapsedMinutes || 0} min</span></div><div class="order-items">${o.items.map(i => `<div class="order-item"><strong>${i.quantity} × ${esc(i.name)}</strong><span>${i.notes ? esc(i.notes) : ''}</span></div>`).join('')}</div>${notes ? `<div class="special">Special request · ${esc(notes)}</div>` : ''}<div class="order-meta"><span>ETA ${o.estimatedWait} min</span><span>${money(o.total)} · ${esc(o.paymentStatus || 'UNPAID')}</span></div><div class="status-actions">${STATUS_FLOW.map(s => `<button data-status="${s}" ${o.status === s ? 'class="current"' : ''}>${statusLabel(s)}</button>`).join('')}</div></article>`;
    }).join('');
    $$('.status-actions button').forEach(b => b.onclick = () => updateStatus(Number(b.closest('.order-card').dataset.id), b.dataset.status));
}
async function load() {
    try {
        [orders, restaurant] = await Promise.all([api('/api/kitchen/orders'), api('/api/status')]);
        render();
    }
    catch (e) {
        showToast(e.message);
    }
}
async function updateStatus(id, status) {
    try {
        const o = await api(`/api/kitchen/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
        if (status === 'SERVED') {
            orders = orders.filter(x => x.id !== id);
        }
        else {
            const i = orders.findIndex(x => x.id === id);
            if (i >= 0)
                orders[i] = { ...orders[i], ...o };
        }
        restaurant = await api('/api/status');
        render();
        showToast(`Table ${String(o.tableNumber).padStart(2, '0')} · ${statusLabel(status)}`);
    }
    catch (e) {
        showToast(e.message);
    }
}
$('#refreshKitchen').onclick = load;
const stream = new EventSource('/events?kitchen=1');
stream.addEventListener('new_order', e => {
    const o = JSON.parse(e.data);
    if (!orders.some(x => x.id === o.id))
        orders.push({ ...o, elapsedMinutes: 0 });
    orders.sort((a, b) => a.createdAt - b.createdAt);
    render();
    showToast(`New order · Table ${String(o.tableNumber).padStart(2, '0')}`);
});
stream.addEventListener('order_update', e => {
    const o = JSON.parse(e.data);
    const i = orders.findIndex(x => x.id === o.id);
    if (['SERVED', 'CANCELLED'].includes(o.status)) {
        if (i >= 0)
            orders.splice(i, 1);
    }
    else if (i >= 0)
        orders[i] = { ...orders[i], ...o };
    render();
});
stream.addEventListener('restaurant_change', e => {
    restaurant = JSON.parse(e.data);
    renderMetrics();
});
stream.addEventListener('system_reset', () => {
    orders = [];
    load();
    showToast('System reset complete');
});
setInterval(() => {
    orders = orders.map(o => ({ ...o, elapsedMinutes: Math.floor((Date.now() - o.createdAt) / 60000) }));
    render();
}, 30000);
load();
