const $ = s => document.querySelector(s);
const toast = $('#toast');
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
async function load() {
    try {
        const [d, inv, health] = await Promise.all([api('/api/admin/dashboard'), api('/api/admin/inventory'), api('/api/health')]);
        $('#resetSystem').classList.toggle('hidden', health.mode !== 'demo');
        $('#adminMetrics').innerHTML = [['Revenue', money(d.revenue)], ['Orders', d.ordersToday], ['Average bill', money(d.averageOrder)], ['Active', d.activeOrders], ['Occupied tables', `${d.occupiedTables}/12`], ['Kitchen load', `${d.kitchenLoad}%`]].map(([a, b]) => `<article><span>${a}</span><strong>${b}</strong></article>`).join('');
        $('#recentOrders').innerHTML = d.recentOrders.length ? d.recentOrders.map(o => `<div class="panel-row"><div><strong>${esc(o.code)} · Table ${String(o.tableNumber).padStart(2, '0')}</strong><span>${esc(o.status)} · ${esc(o.paymentStatus)}</span></div><strong>${money(o.total)}</strong></div>`).join('') : '<div class="panel-row"><span>No orders yet</span></div>';
        $('#topItems').innerHTML = d.topItems.length ? d.topItems.map((x, i) => `<div class="panel-row"><div><strong>${i + 1}. ${esc(x.name)}</strong><span>Ordered quantity</span></div><strong>${x.quantity}</strong></div>`).join('') : '<div class="panel-row"><span>No order data yet</span></div>';
        $('#inventoryTable').innerHTML = `<div class="inventory-head"><span>Ingredient</span><span>Stock</span><span>Reorder at</span><span></span></div>${inv.map(x => `<div class="inventory-row ${x.lowStock ? 'low' : ''}" data-id="${x.id}"><strong>${esc(x.name)}</strong><span>${x.quantity} ${esc(x.unit)}</span><span>${x.reorderLevel} ${esc(x.unit)}</span><button class="restock-btn">+ Restock</button></div>`).join('')}`;
        document.querySelectorAll('.restock-btn').forEach(b => b.onclick = () => restock(Number(b.closest('.inventory-row').dataset.id)));
    }
    catch (e) {
        showToast(e.message);
    }
}
async function restock(id) {
    const raw = prompt('Restock amount:');
    if (raw === null)
        return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0)
        return showToast('Enter a valid amount.');
    try {
        await api(`/api/admin/inventory/${id}/restock`, { method: 'PATCH', body: JSON.stringify({ amount }) });
        showToast('Inventory updated');
        load();
    }
    catch (e) {
        showToast(e.message);
    }
}
$('#resetSystem').onclick = async () => {
    if (!confirm('Reset all orders, table sessions and inventory to the original state?'))
        return;
    try {
        await api('/api/admin/reset', { method: 'POST' });
        showToast('System reset complete');
        load();
    }
    catch (e) {
        showToast(e.message);
    }
};
const stream = new EventSource('/events?admin=1');
stream.addEventListener('dashboard_change', load);
stream.addEventListener('system_reset', load);
load();
