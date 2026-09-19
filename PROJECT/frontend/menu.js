const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const toast = $('#toast');
const params = new URLSearchParams(location.search);
const tableNumber = Number(params.get('table'));
const token = params.get('token') || '';
let categories = [], menu = [], status = {}, cart = new Map(), activeCategory = 'all', vegOnly = false, search = '', activeOrder = null;
let stream = null;
function money(n) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(Number(n || 0));
}
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2400);
}
async function api(url, opt = {}) {
    const r = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) }, ...opt });
    const d = await r.json().catch(() => ({}));
    if (!r.ok)
        throw new Error(d.error || 'Request failed');
    return d;
}
function esc(s) {
    return String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}
function billForCart() {
    const subtotal = [...cart.values()].reduce((s, l) => s + l.item.price * l.quantity, 0);
    const gst = Math.round(subtotal * 5) / 100;
    return { subtotal, gst, total: Math.round((subtotal + gst) * 100) / 100 };
}
function setTableBadge(valid = true) {
    $('#tableBadge').textContent = valid ? `Table ${String(tableNumber).padStart(2, '0')} · Verified ✓` : 'Invalid table QR';
}
function renderCategories() {
    $('#categories').innerHTML = [{ slug: 'all', name: 'All' }, ...categories].map(c => `<button class="category-btn ${activeCategory === c.slug ? 'active' : ''}" data-cat="${c.slug}">${esc(c.name)}</button>`).join('');
    $$('.category-btn').forEach(b => b.onclick = () => {
        activeCategory = b.dataset.cat;
        renderCategories();
        renderMenu();
    });
}
function filtered() {
    return menu.filter(i => (activeCategory === 'all' || categories.find(c => c.id === i.categoryId)?.slug === activeCategory) && (!vegOnly || i.veg) && (!search || `${i.name} ${i.description}`.toLowerCase().includes(search.toLowerCase())));
}
function renderMenu() {
    const quickIds = new Set((status.quickServe || []).map(x => Number(x.id)));
    const busy = status.rushMode;
    const list = filtered();
    $('#menuGrid').innerHTML = list.length ? list.map(i => `<article class="food-card"><div class="food-image"><img src="${i.image}" alt="${esc(i.name)}"><span class="food-chip ${busy && quickIds.has(i.id) ? 'rush' : ''}">${busy && quickIds.has(i.id) ? '⚡ Quick serve' : `${esc(i.category)} · ★ ${Number(i.rating).toFixed(1)}`}</span></div><div class="food-content"><div class="food-title-row"><h3>${esc(i.name)}</h3><span class="veg-dot ${i.veg ? '' : 'non'}" title="${i.veg ? 'Vegetarian' : 'Non-vegetarian'}"></span></div><p class="food-desc">${esc(i.description)}</p><div class="food-meta"><span>⏱ ${i.prepMinutes} min</span><span>${esc(i.spice)} spice</span>${i.allergens?.length ? `<span>Contains ${esc(i.allergens.slice(0, 2).join(', '))}</span>` : ''}</div><div class="food-bottom"><span class="price">${money(i.price)}</span><button class="add-btn" data-id="${i.id}" ${!i.available || activeOrder ? 'disabled' : ''}>${!i.available ? 'Unavailable' : activeOrder ? 'Order active' : 'Add +'}</button></div></div></article>`).join('') : `<div class="empty-state"><strong>No dishes found</strong>Try another category or search.</div>`;
    $$('.add-btn:not(:disabled)').forEach(b => b.onclick = () => addItem(Number(b.dataset.id)));
}
function addItem(id) {
    const item = menu.find(x => x.id === id);
    if (!item)
        return;
    const line = cart.get(id) || { item, quantity: 0 };
    line.quantity = Math.min(10, line.quantity + 1);
    cart.set(id, line);
    renderCartFab();
    showToast(`${item.name} added`);
}
function changeQty(id, delta) {
    const l = cart.get(id);
    if (!l)
        return;
    l.quantity += delta;
    if (l.quantity <= 0)
        cart.delete(id);
    else
        l.quantity = Math.min(10, l.quantity);
    renderCart();
    renderCartFab();
}
function renderCartFab() {
    const count = [...cart.values()].reduce((s, l) => s + l.quantity, 0);
    const b = billForCart();
    $('#cartCount').textContent = count;
    $('#cartTotal').textContent = money(b.total);
    $('#cartFab').classList.toggle('hidden', count === 0 || !!activeOrder);
}
function renderCart() {
    const lines = [...cart.values()];
    $('#cartLines').innerHTML = lines.map(l => `<div class="cart-line"><div><strong>${esc(l.item.name)}</strong><span>${money(l.item.price)} each · ${money(l.item.price * l.quantity)}</span></div><div class="qty"><button data-id="${l.item.id}" data-d="-1">−</button><strong>${l.quantity}</strong><button data-id="${l.item.id}" data-d="1">+</button></div></div>`).join('');
    $$('.qty button').forEach(b => b.onclick = () => changeQty(Number(b.dataset.id), Number(b.dataset.d)));
    const x = billForCart();
    $('#subtotalText').textContent = money(x.subtotal);
    $('#gstText').textContent = money(x.gst);
    $('#totalText').textContent = money(x.total);
}
function orderStage(st) {
    return ({ CONFIRMED: 0, PREPARING: 1, COOKING: 2, PLATING: 2, READY: 3, SERVED: 4, CANCELLED: 0 }[st] ?? 0);
}
function statusText(st) {
    return ({ CONFIRMED: ['Order received', 'The kitchen has received your order.'], PREPARING: ['Preparation started', 'Your dishes are being prepared.'], COOKING: ['Cooking now', 'Your order is on the heat.'], PLATING: ['Almost there', 'The kitchen is plating your order.'], READY: ['Ready to serve', 'Your food is ready.'], SERVED: ['Served', 'Enjoy your meal.'], CANCELLED: ['Order cancelled', 'Please speak with the restaurant team.'] }[st] || [st, '']);
}
function renderActivePanel() {
    const p = $('#activeOrderPanel');
    if (!activeOrder) {
        p.classList.add('hidden');
        return;
    }
    const [a, b] = statusText(activeOrder.status);
    p.classList.remove('hidden');
    p.innerHTML = `<div><strong>${esc(a)} · ${activeOrder.code}</strong><span>Table ${String(activeOrder.tableNumber).padStart(2, '0')} · ${esc(b)}</span></div><button class="btn btn-ghost" id="viewOrderBtn">View order</button>`;
    $('#viewOrderBtn').onclick = () => openOrder();
}
function billHtml(o) {
    return `<h3>Itemised bill · ${o.code}</h3>${o.items.map(i => `<div class="bill-line"><span>${esc(i.name)} · ${i.quantity} × ${money(i.unitPrice)}</span><strong>${money(i.unitPrice * i.quantity)}</strong></div>`).join('')}<div class="bill-line"><span>Subtotal</span><strong>${money(o.subtotal)}</strong></div><div class="bill-line"><span>GST · 5%</span><strong>${money(o.gst)}</strong></div><div class="bill-line total"><span>Exact amount to pay</span><strong>${money(o.total)}</strong></div>`;
}
function paymentHtml(o) {
    if (o.paymentStatus === 'PAID')
        return `<div class="paid-banner">✓ Payment complete · ${esc(o.paymentMethod || '')} · ${money(o.total)}</div>`;
    if (!['READY', 'SERVED'].includes(o.status))
        return `<div class="status-callout"><strong>Payment unlocks when the order is ready</strong><span>Your exact bill is already shown above. Kitchen status updates here automatically.</span></div>`;
    const method = o.paymentMethod || '';
    let inner = `<div class="pay-options"><button class="pay-option ${method === 'CASH' ? 'selected' : ''}" data-pay="CASH"><strong>Cash</strong><span>Pay ${money(o.total)} to restaurant staff</span></button><button class="pay-option ${method === 'UPI' ? 'selected' : ''}" data-pay="UPI"><strong>UPI QR</strong><span>${money(o.total)}</span></button></div>`;
    if (method === 'UPI')
        inner += `<div class="upi-demo"><img src="/api/orders/${encodeURIComponent(o.code)}/upi-qr" alt="UPI QR for ${money(o.total)}"><strong>${money(o.total)}</strong><small>Scan the QR to continue with UPI payment.</small><button class="btn btn-primary full" id="completeUpi" style="margin-top:12px">Confirm UPI payment</button></div>`;
    if (method === 'CASH')
        inner += `<div class="upi-demo"><strong>Cash amount: ${money(o.total)}</strong><small>Confirm once the exact cash amount is handed to restaurant staff.</small><button class="btn btn-primary full" id="completeCash" style="margin-top:12px">Confirm cash payment</button></div>`;
    return inner;
}
function renderOrder() {
    if (!activeOrder)
        return;
    $('#orderTitle').textContent = `${activeOrder.code} · Table ${String(activeOrder.tableNumber).padStart(2, '0')}`;
    const stage = orderStage(activeOrder.status);
    const [title, sub] = statusText(activeOrder.status);
    $('#orderTrack').innerHTML = `<div class="track-head"><strong>${esc(title)}</strong><span>${esc(sub)} · Estimated ${activeOrder.estimatedWait} min</span></div><div class="steps">${[0, 1, 2, 3, 4].map(i => `<span class="step ${i <= stage ? 'done' : ''}"></span>`).join('')}</div><div class="status-callout"><strong>Live from the kitchen</strong><span>Received → Preparing → Cooking → Ready → Served</span></div>`;
    $('#billBox').innerHTML = billHtml(activeOrder);
    $('#paymentBox').innerHTML = paymentHtml(activeOrder);
    $$('[data-pay]').forEach(b => b.onclick = () => choosePayment(b.dataset.pay));
    const u = $('#completeUpi');
    if (u)
        u.onclick = () => completePayment('UPI');
    const c = $('#completeCash');
    if (c)
        c.onclick = () => completePayment('CASH');
}
function openOrder() {
    if (!activeOrder)
        return;
    renderOrder();
    $('#orderModal').classList.remove('hidden');
}
async function choosePayment(method) {
    try {
        activeOrder = await api(`/api/orders/${encodeURIComponent(activeOrder.code)}/payment/start`, { method: 'POST', body: JSON.stringify({ method }) });
        renderOrder();
        renderActivePanel();
    }
    catch (e) {
        showToast(e.message);
    }
}
async function completePayment(method) {
    try {
        activeOrder = await api(`/api/orders/${encodeURIComponent(activeOrder.code)}/payment/complete`, { method: 'POST', body: JSON.stringify({ method }) });
        renderOrder();
        renderActivePanel();
        showToast(`Payment completed · ${money(activeOrder.total)}`);
    }
    catch (e) {
        showToast(e.message);
    }
}
async function sendOrder() {
    if (activeOrder)
        return showToast('This table already has an active order.');
    const items = [...cart.values()].map(l => ({ menuItemId: l.item.id, quantity: l.quantity }));
    if (!items.length)
        return;
    const btn = $('#sendOrderBtn');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
        activeOrder = await api('/api/orders', { method: 'POST', body: JSON.stringify({ tableNumber, token, guestName: $('#guestName').value || 'Guest', items }) });
        cart.clear();
        renderCartFab();
        $('#cartDrawer').classList.add('hidden');
        renderActivePanel();
        renderMenu();
        openOrder();
        showToast(`Order sent to kitchen · ${activeOrder.code}`);
    }
    catch (e) {
        showToast(e.message);
    }
    finally {
        btn.disabled = false;
        btn.textContent = 'Send order to kitchen';
    }
}
async function init() {
    if (!Number.isInteger(tableNumber) || !token) {
        setTableBadge(false);
        $('#menuGrid').innerHTML = '<div class="empty-state"><strong>Invalid table link</strong>Please scan one of Dine’s table QR codes.</div>';
        return;
    }
    try {
        const valid = await api(`/api/tables/validate?table=${tableNumber}&token=${encodeURIComponent(token)}`);
        setTableBadge(!!valid.valid);
        connectEvents();
        const [cs, ms, st, ao] = await Promise.all([api('/api/categories'), api('/api/menu'), api('/api/status'), api(`/api/tables/${tableNumber}/active-order?token=${encodeURIComponent(token)}`)]);
        categories = cs;
        menu = ms;
        status = st;
        activeOrder = ao;
        if (activeOrder)
            $('#rushCard').classList.toggle('hidden', !status.rushMode);
        renderCategories();
        renderMenu();
        renderActivePanel();
        renderCartFab();
    }
    catch (e) {
        setTableBadge(false);
        $('#menuGrid').innerHTML = `<div class="empty-state"><strong>Table verification failed</strong>${esc(e.message)}</div>`;
        showToast(e.message);
    }
}
$('#searchInput').oninput = e => {
    search = e.target.value.trim();
    renderMenu();
};
$('#vegToggle').onclick = () => {
    vegOnly = !vegOnly;
    $('#vegToggle').classList.toggle('on', vegOnly);
    renderMenu();
};
$('#cartFab').onclick = () => {
    renderCart();
    $('#cartDrawer').classList.remove('hidden');
};
$('#closeCart').onclick = () => $('#cartDrawer').classList.add('hidden');
$('#closeOrder').onclick = () => $('#orderModal').classList.add('hidden');
$('#sendOrderBtn').onclick = sendOrder;
$('#cartDrawer').onclick = e => {
    if (e.target === $('#cartDrawer'))
        $('#cartDrawer').classList.add('hidden');
};
$('#orderModal').onclick = e => {
    if (e.target === $('#orderModal'))
        $('#orderModal').classList.add('hidden');
};
function connectEvents() {
    if (stream)
        stream.close();
    stream = new EventSource(`/events?table=${tableNumber}&token=${encodeURIComponent(token)}`);
    stream.addEventListener('order_update', e => {
        const o = JSON.parse(e.data);
        if (Number(o.tableNumber) !== tableNumber)
            return;
        activeOrder = o;
        renderActivePanel();
        renderMenu();
        renderCartFab();
        if (!$('#orderModal').classList.contains('hidden'))
            renderOrder();
        showToast(`Kitchen update · ${statusText(o.status)[0]}`);
    });
    stream.addEventListener('menu_change', async () => {
        menu = await api('/api/menu');
        renderMenu();
    });
    stream.addEventListener('system_reset', () => {
        showToast('System reset. Reloading…');
        setTimeout(() => location.reload(), 800);
    });
}
init();
