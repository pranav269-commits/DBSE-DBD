const fs = require('fs');
const path = require('path');
const seed = require('../data/seed');
const clone = (x) => JSON.parse(JSON.stringify(x));
const RUNTIME = path.join(__dirname, '..', 'data', 'runtime.json');
const PAID = 'PAID';
const ACTIVE_STATUSES = ['CONFIRMED', 'PREPARING', 'COOKING', 'PLATING', 'READY'];
function rupeesFromPaise(paise) {
    return Math.round(Number(paise)) / 100;
}
function billFromLines(lines) {
    const subtotalPaise = lines.reduce((sum, l) => sum + Math.round(Number(l.unitPrice) * 100) * Number(l.quantity), 0);
    const gstPaise = Math.round(subtotalPaise * 0.05);
    return { subtotal: rupeesFromPaise(subtotalPaise), gst: rupeesFromPaise(gstPaise), total: rupeesFromPaise(subtotalPaise + gstPaise) };
}
class DemoStore {
    constructor() {
        this.state = this.load();
    }
    load() {
        if (fs.existsSync(RUNTIME)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(RUNTIME, 'utf8'));
                if (parsed && parsed.version === 2)
                    return parsed;
            }
            catch {
            }
        }
        return this.fresh();
    }
    fresh() {
        return {
            version: 2,
            categories: clone(seed.categories),
            tables: clone(seed.tables),
            menuItems: clone(seed.menuItems),
            ingredients: clone(seed.ingredients),
            recipes: clone(seed.recipes),
            orders: [],
            nextOrderId: 1001,
            payments: []
        };
    }
    persist() {
        fs.writeFileSync(RUNTIME, JSON.stringify(this.state, null, 2));
    }
    async reset() {
        this.state = this.fresh();
        this.persist();
        return { ok: true };
    }
    async health() {
        return { ok: true, mode: 'demo', persistent: true };
    }
    async getCategories() {
        return clone(this.state.categories);
    }
    async getTables() {
        return clone(this.state.tables);
    }
    async validateTable(number, token) {
        const t = this.state.tables.find(x => x.number === Number(number));
        if (!t || t.token !== String(token || ''))
            return null;
        return clone(t);
    }
    getLoad() {
        const active = this.state.orders.filter(o => ACTIVE_STATUSES.includes(o.status));
        const age = active.reduce((s, o) => s + Math.min(12, (Date.now() - o.createdAt) / 60000), 0);
        return Math.max(18, Math.min(96, Math.round(18 + active.length * 7 + age)));
    }
    async getRestaurantStatus() {
        const load = this.getLoad();
        const quick = this.state.menuItems.filter(i => i.available && i.prepMinutes <= 10).sort((a, b) => b.rating - a.rating).slice(0, 4);
        return { kitchenLoad: load, rushMode: load >= 65, activeOrders: this.state.orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length, quickServe: quick.map(i => ({ id: i.id, name: i.name, prepMinutes: i.prepMinutes })) };
    }
    itemAvailable(item) {
        if (!item.available)
            return false;
        const recipe = this.state.recipes[String(item.id)] || [];
        return recipe.every(r => {
            const inv = this.state.ingredients.find(i => i.id === r.ingredientId);
            return inv && Number(inv.quantity) >= Number(r.amount);
        });
    }
    async getMenu(filters = {}) {
        const q = String(filters.search || '').trim().toLowerCase();
        const category = String(filters.category || '').trim().toLowerCase();
        const dietary = String(filters.dietary || '').trim().toLowerCase();
        const allergen = String(filters.excludeAllergen || '').trim().toLowerCase();
        return this.state.menuItems.filter(item => {
            const cat = this.state.categories.find(c => c.id === item.categoryId);
            if (q && !`${item.name} ${item.description} ${item.tags.join(' ')}`.toLowerCase().includes(q))
                return false;
            if (category && category !== 'all' && cat?.slug !== category)
                return false;
            if (dietary === 'veg' && !item.veg)
                return false;
            if (allergen && item.allergens.map(a => a.toLowerCase()).includes(allergen))
                return false;
            return true;
        }).map(item => ({ ...clone(item), available: this.itemAvailable(item), category: this.state.categories.find(c => c.id === item.categoryId)?.name || '' }));
    }
    estimateWait(lines) {
        const load = this.getLoad();
        const maxPrep = Math.max(8, ...lines.map(l => this.state.menuItems.find(m => m.id === l.menuItemId)?.prepMinutes || 8));
        return Math.max(maxPrep, Math.round(maxPrep * (1 + Math.max(0, load - 35) / 150)));
    }
    validateCombinedStock(lines) {
        const needed = new Map();
        for (const l of lines)
            for (const r of (this.state.recipes[String(l.menuItemId)] || []))
                needed.set(r.ingredientId, (needed.get(r.ingredientId) || 0) + Number(r.amount) * l.quantity);
        for (const [ingredientId, amount] of needed) {
            const inv = this.state.ingredients.find(i => i.id === ingredientId);
            if (!inv || Number(inv.quantity) + 1e-9 < amount)
                throw new Error('One or more dishes are currently unavailable due to ingredient stock.');
        }
    }
    reduceInventory(lines) {
        for (const l of lines) {
            for (const r of (this.state.recipes[String(l.menuItemId)] || [])) {
                const inv = this.state.ingredients.find(i => i.id === r.ingredientId);
                if (inv)
                    inv.quantity = Math.max(0, Math.round((Number(inv.quantity) - Number(r.amount) * l.quantity) * 100) / 100);
            }
        }
    }
    async placeOrder(payload) {
        const tableNumber = Number(payload.tableNumber);
        const token = String(payload.token || '');
        const table = this.state.tables.find(t => t.number === tableNumber);
        if (!table || table.token !== token)
            throw new Error('Invalid table QR. Please scan the QR again.');
        if (table.currentOrderCode) {
            const existing = this.state.orders.find(o => o.code === table.currentOrderCode && o.status !== 'CANCELLED');
            if (existing && !(existing.status === 'SERVED' && existing.paymentStatus === PAID))
                throw new Error(`Table ${String(tableNumber).padStart(2, '0')} already has an active order (${existing.code}).`);
        }
        const items = Array.isArray(payload.items) ? payload.items : [];
        if (!items.length)
            throw new Error('Your cart is empty.');
        const lines = items.map(x => {
            const m = this.state.menuItems.find(i => i.id === Number(x.menuItemId));
            const quantity = Number(x.quantity);
            if (!m || !this.itemAvailable(m))
                throw new Error('One of the selected dishes is unavailable.');
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10)
                throw new Error('Invalid item quantity.');
            return { menuItemId: m.id, name: m.name, quantity, unitPrice: Number(m.price), notes: String(x.notes || '').trim().slice(0, 140) };
        });
        this.validateCombinedStock(lines);
        const bill = billFromLines(lines);
        const id = this.state.nextOrderId++;
        const code = `DN${String(id).padStart(5, '0')}`;
        const now = Date.now();
        const order = { id, code, tableNumber, guestName: String(payload.guestName || 'Guest').trim().slice(0, 50) || 'Guest', status: 'CONFIRMED', paymentMethod: null, paymentStatus: 'UNPAID', ...bill, estimatedWait: this.estimateWait(lines), createdAt: now, updatedAt: now, items: lines, statusHistory: [{ status: 'CONFIRMED', at: now }] };
        this.state.orders.push(order);
        table.status = 'ACTIVE';
        table.currentOrderCode = code;
        this.reduceInventory(lines);
        this.persist();
        return clone(order);
    }
    async getOrderByCode(code) {
        const o = this.state.orders.find(x => x.code.toLowerCase() === String(code).toLowerCase());
        if (!o)
            return null;
        return { ...clone(o), elapsedMinutes: Math.floor((Date.now() - o.createdAt) / 60000) };
    }
    async getActiveOrderForTable(tableNumber, token) {
        const table = this.state.tables.find(t => t.number === Number(tableNumber) && t.token === String(token || ''));
        if (!table || !table.currentOrderCode)
            return null;
        return this.getOrderByCode(table.currentOrderCode);
    }
    async getKitchenOrders() {
        return this.state.orders.filter(o => !['SERVED', 'CANCELLED'].includes(o.status)).sort((a, b) => a.createdAt - b.createdAt).map(o => ({ ...clone(o), elapsedMinutes: Math.floor((Date.now() - o.createdAt) / 60000) }));
    }
    async updateOrderStatus(id, status) {
        const allowed = ['CONFIRMED', 'PREPARING', 'COOKING', 'PLATING', 'READY', 'SERVED', 'CANCELLED'];
        if (!allowed.includes(status))
            throw new Error('Invalid order status.');
        const o = this.state.orders.find(x => x.id === Number(id));
        if (!o)
            return null;
        o.status = status;
        o.updatedAt = Date.now();
        o.statusHistory.push({ status, at: o.updatedAt });
        if (status === 'CANCELLED')
            this.releaseTable(o.tableNumber);
        if (status === 'SERVED' && o.paymentStatus === PAID)
            this.releaseTable(o.tableNumber);
        this.persist();
        return clone(o);
    }
    releaseTable(tableNumber) {
        const t = this.state.tables.find(x => x.number === Number(tableNumber));
        if (t) {
            t.status = 'AVAILABLE';
            t.currentOrderCode = null;
        }
    }
    async startPayment(code, method) {
        const o = this.state.orders.find(x => x.code === String(code));
        if (!o)
            return null;
        if (!['CASH', 'UPI'].includes(method))
            throw new Error('Choose Cash or UPI.');
        o.paymentMethod = method;
        o.paymentStatus = method === 'CASH' ? 'AWAITING_CASH' : 'AWAITING_UPI';
        o.updatedAt = Date.now();
        this.persist();
        return clone(o);
    }
    async completePayment(code, method) {
        const o = this.state.orders.find(x => x.code === String(code));
        if (!o)
            return null;
        const chosen = method || o.paymentMethod;
        if (!['CASH', 'UPI'].includes(chosen))
            throw new Error('Choose a payment method first.');
        o.paymentMethod = chosen;
        o.paymentStatus = PAID;
        o.paidAt = Date.now();
        o.updatedAt = o.paidAt;
        this.state.payments.push({ id: this.state.payments.length + 1, orderId: o.id, orderCode: o.code, method: chosen, amount: o.total, status: PAID, paidAt: o.paidAt });
        if (o.status === 'SERVED')
            this.releaseTable(o.tableNumber);
        this.persist();
        return clone(o);
    }
    async adminDashboard() {
        const paid = this.state.orders.filter(o => o.paymentStatus === PAID);
        const revenue = paid.reduce((s, o) => s + o.total, 0);
        const counts = new Map();
        for (const o of this.state.orders)
            for (const i of o.items)
                counts.set(i.name, (counts.get(i.name) || 0) + i.quantity);
        return { revenue: Math.round(revenue * 100) / 100, ordersToday: this.state.orders.length, averageOrder: this.state.orders.length ? Math.round(this.state.orders.reduce((s, o) => s + o.total, 0) / this.state.orders.length * 100) / 100 : 0, activeOrders: this.state.orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length, kitchenLoad: this.getLoad(), lowStockCount: this.state.ingredients.filter(i => i.quantity <= i.reorderLevel).length, occupiedTables: this.state.tables.filter(t => t.status === 'ACTIVE').length, topItems: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, quantity]) => ({ name, quantity })), recentOrders: this.state.orders.slice(-8).reverse().map(o => ({ code: o.code, tableNumber: o.tableNumber, total: o.total, status: o.status, paymentStatus: o.paymentStatus })) };
    }
    async getInventory() {
        return this.state.ingredients.map(i => ({ ...clone(i), lowStock: i.quantity <= i.reorderLevel }));
    }
    async restockInventory(id, amount) {
        const x = this.state.ingredients.find(i => i.id === Number(id));
        if (!x)
            return null;
        const a = Number(amount);
        if (!Number.isFinite(a) || a <= 0)
            throw new Error('Restock amount must be greater than zero.');
        x.quantity = Math.round((x.quantity + a) * 100) / 100;
        this.persist();
        return { ...clone(x), lowStock: x.quantity <= x.reorderLevel };
    }
    async toggleMenuAvailability(id, available) {
        const x = this.state.menuItems.find(i => i.id === Number(id));
        if (!x)
            return null;
        x.available = Boolean(available);
        this.persist();
        return clone(x);
    }
}
class MySQLStore {
    constructor(config) {
        const mysql = require('mysql2/promise');
        this.pool = mysql.createPool({ ...config, waitForConnections: true, connectionLimit: 10, decimalNumbers: true });
    }
    async health() {
        await this.pool.query('SELECT 1');
        return { ok: true, mode: 'mysql', persistent: true };
    }
    async reset() {
        throw new Error('Reset is available only in Demo Mode.');
    }
    async getCategories() {
        const [r] = await this.pool.query('SELECT id,name,slug,display_order displayOrder FROM categories ORDER BY display_order');
        return r;
    }
    async getTables() {
        const [r] = await this.pool.query("SELECT id,table_number number,qr_token token,capacity,status,current_order_code currentOrderCode FROM restaurant_tables ORDER BY table_number");
        return r;
    }
    async validateTable(number, token) {
        const [r] = await this.pool.query('SELECT id,table_number number,qr_token token,capacity,status,current_order_code currentOrderCode FROM restaurant_tables WHERE table_number=? AND qr_token=? LIMIT 1', [Number(number), String(token || '')]);
        return r[0] || null;
    }
    async getRestaurantStatus() {
        const [[a]] = await this.pool.query("SELECT COUNT(*) c,COALESCE(SUM(LEAST(12,TIMESTAMPDIFF(MINUTE,created_at,NOW()))),0) age FROM orders WHERE status IN ('CONFIRMED','PREPARING','COOKING','PLATING','READY')");
        const load = Math.max(18, Math.min(96, Math.round(18 + a.c * 7 + Number(a.age))));
        const [q] = await this.pool.query(`SELECT m.id,m.name,m.prep_minutes prepMinutes FROM menu_items m WHERE m.available=1 AND m.prep_minutes<=10 AND NOT EXISTS (SELECT 1 FROM recipes r JOIN ingredients i ON i.id=r.ingredient_id WHERE r.menu_item_id=m.id AND i.quantity<r.quantity_required) ORDER BY m.rating DESC LIMIT 4`);
        return { kitchenLoad: load, rushMode: load >= 65, activeOrders: a.c, quickServe: q };
    }
    async getMenu(filters = {}) {
        const w = ['1=1'], p = [];
        if (filters.search) {
            w.push('(LOWER(m.name) LIKE ? OR LOWER(m.description) LIKE ?)');
            const q = `%${String(filters.search).toLowerCase()}%`;
            p.push(q, q);
        }
        if (filters.category && filters.category !== 'all') {
            w.push('c.slug=?');
            p.push(filters.category);
        }
        if (filters.dietary === 'veg')
            w.push('m.veg=1');
        if (filters.excludeAllergen) {
            w.push('NOT EXISTS (SELECT 1 FROM menu_item_allergens mia JOIN allergens a ON a.id=mia.allergen_id WHERE mia.menu_item_id=m.id AND LOWER(a.name)=LOWER(?))');
            p.push(filters.excludeAllergen);
        }
        const [r] = await this.pool.query(`SELECT m.id,m.category_id categoryId,c.name category,m.name,m.description,m.price,m.prep_minutes prepMinutes,m.rating,m.veg,m.spice,m.tags_json tags,m.image_path image,(m.available AND NOT EXISTS (SELECT 1 FROM recipes r2 JOIN ingredients i2 ON i2.id=r2.ingredient_id WHERE r2.menu_item_id=m.id AND i2.quantity<r2.quantity_required)) available FROM menu_items m JOIN categories c ON c.id=m.category_id WHERE ${w.join(' AND ')} ORDER BY c.display_order,m.id`, p);
        for (const x of r) {
            const [a] = await this.pool.query('SELECT a.name FROM menu_item_allergens mia JOIN allergens a ON a.id=mia.allergen_id WHERE mia.menu_item_id=?', [x.id]);
            x.allergens = a.map(z => z.name);
            x.tags = typeof x.tags === 'string' ? JSON.parse(x.tags) : x.tags || [];
            x.veg = !!x.veg;
            x.available = !!x.available;
        }
        return r;
    }
    async placeOrder(payload) {
        const tableNumber = Number(payload.tableNumber), token = String(payload.token || ''), items = Array.isArray(payload.items) ? payload.items : [];
        if (!items.length)
            throw new Error('Your cart is empty.');
        const c = await this.pool.getConnection();
        try {
            await c.beginTransaction();
            const [tr] = await c.query('SELECT id,status,current_order_code currentOrderCode FROM restaurant_tables WHERE table_number=? AND qr_token=? FOR UPDATE', [tableNumber, token]);
            if (!tr.length)
                throw new Error('Invalid table QR. Please scan the QR again.');
            if (tr[0].currentOrderCode)
                throw new Error(`Table ${String(tableNumber).padStart(2, '0')} already has an active order (${tr[0].currentOrderCode}).`);
            const lines = [];
            const stockNeed = new Map();
            const stockHave = new Map();
            for (const x of items) {
                const [mr] = await c.query('SELECT id,name,price,prep_minutes prepMinutes,available FROM menu_items WHERE id=? FOR UPDATE', [Number(x.menuItemId)]);
                const m = mr[0], q = Number(x.quantity);
                if (!m || !m.available)
                    throw new Error('One of the selected dishes is unavailable.');
                if (!Number.isInteger(q) || q < 1 || q > 10)
                    throw new Error('Invalid item quantity.');
                const [stockRows] = await c.query('SELECT i.id,i.quantity,r.quantity_required required FROM recipes r JOIN ingredients i ON i.id=r.ingredient_id WHERE r.menu_item_id=? FOR UPDATE', [m.id]);
                for (const z of stockRows) {
                    stockHave.set(z.id, Number(z.quantity));
                    stockNeed.set(z.id, (stockNeed.get(z.id) || 0) + Number(z.required) * q);
                }
                lines.push({ menuItemId: m.id, name: m.name, quantity: q, unitPrice: Number(m.price), prepMinutes: m.prepMinutes, notes: String(x.notes || '').trim().slice(0, 140) });
            }
            for (const [ingredientId, needed] of stockNeed)
                if ((stockHave.get(ingredientId) || 0) + 1e-9 < needed)
                    throw new Error('One or more dishes are currently unavailable due to ingredient stock.');
            const bill = billFromLines(lines);
            const [[act]] = await c.query("SELECT COUNT(*) c FROM orders WHERE status IN ('CONFIRMED','PREPARING','COOKING','PLATING','READY')");
            const maxPrep = Math.max(8, ...lines.map(l => l.prepMinutes));
            const load = Math.max(18, 18 + act.c * 7);
            const wait = Math.max(maxPrep, Math.round(maxPrep * (1 + Math.max(0, load - 35) / 150)));
            const [ins] = await c.query("INSERT INTO orders(table_id,table_number,guest_name,status,payment_status,subtotal,gst,total,estimated_wait_minutes) VALUES(?,?,?,'CONFIRMED','UNPAID',?,?,?,?)", [tr[0].id, tableNumber, String(payload.guestName || 'Guest').trim().slice(0, 50) || 'Guest', bill.subtotal, bill.gst, bill.total, wait]);
            const code = `DN${String(ins.insertId).padStart(5, '0')}`;
            await c.query('UPDATE orders SET order_code=? WHERE id=?', [code, ins.insertId]);
            for (const l of lines)
                await c.query('INSERT INTO order_items(order_id,menu_item_id,quantity,unit_price,notes) VALUES(?,?,?,?,?)', [ins.insertId, l.menuItemId, l.quantity, l.unitPrice, l.notes]);
            await c.query("UPDATE restaurant_tables SET status='ACTIVE',current_order_code=? WHERE id=?", [code, tr[0].id]);
            await c.commit();
            return this.getOrderByCode(code);
        }
        catch (e) {
            await c.rollback();
            throw e;
        }
        finally {
            c.release();
        }
    }
    async getOrderByCode(code) {
        const [r] = await this.pool.query('SELECT id,order_code code,table_number tableNumber,guest_name guestName,status,payment_method paymentMethod,payment_status paymentStatus,subtotal,gst,total,estimated_wait_minutes estimatedWait,UNIX_TIMESTAMP(created_at)*1000 createdAt,UNIX_TIMESTAMP(updated_at)*1000 updatedAt,TIMESTAMPDIFF(MINUTE,created_at,NOW()) elapsedMinutes FROM orders WHERE order_code=? LIMIT 1', [code]);
        if (!r.length)
            return null;
        const o = r[0];
        const [i] = await this.pool.query('SELECT oi.menu_item_id menuItemId,m.name,oi.quantity,oi.unit_price unitPrice,oi.notes FROM order_items oi JOIN menu_items m ON m.id=oi.menu_item_id WHERE oi.order_id=?', [o.id]);
        o.items = i;
        return o;
    }
    async getActiveOrderForTable(tableNumber, token) {
        const t = await this.validateTable(tableNumber, token);
        if (!t || !t.currentOrderCode)
            return null;
        return this.getOrderByCode(t.currentOrderCode);
    }
    async getKitchenOrders() {
        const [r] = await this.pool.query("SELECT id,order_code code,table_number tableNumber,guest_name guestName,status,payment_status paymentStatus,total,estimated_wait_minutes estimatedWait,UNIX_TIMESTAMP(created_at)*1000 createdAt,TIMESTAMPDIFF(MINUTE,created_at,NOW()) elapsedMinutes FROM orders WHERE status NOT IN ('SERVED','CANCELLED') ORDER BY created_at");
        for (const o of r) {
            const [i] = await this.pool.query('SELECT m.name,oi.quantity,oi.notes FROM order_items oi JOIN menu_items m ON m.id=oi.menu_item_id WHERE oi.order_id=?', [o.id]);
            o.items = i;
        }
        return r;
    }
    async releaseIfDone(order) {
        if (order.status === 'SERVED' && order.paymentStatus === PAID)
            await this.pool.query("UPDATE restaurant_tables SET status='AVAILABLE',current_order_code=NULL WHERE table_number=?", [order.tableNumber]);
    }
    async updateOrderStatus(id, status) {
        const ok = ['CONFIRMED', 'PREPARING', 'COOKING', 'PLATING', 'READY', 'SERVED', 'CANCELLED'];
        if (!ok.includes(status))
            throw new Error('Invalid order status.');
        await this.pool.query('CALL sp_update_order_status(?,?)', [Number(id), status]);
        const [[o]] = await this.pool.query('SELECT id,order_code code,table_number tableNumber,status,payment_status paymentStatus FROM orders WHERE id=?', [Number(id)]);
        if (!o)
            return null;
        if (status === 'CANCELLED')
            await this.pool.query("UPDATE restaurant_tables SET status='AVAILABLE',current_order_code=NULL WHERE table_number=?", [o.tableNumber]);
        else
            await this.releaseIfDone(o);
        return this.getOrderByCode(o.code);
    }
    async startPayment(code, method) {
        if (!['CASH', 'UPI'].includes(method))
            throw new Error('Choose Cash or UPI.');
        const st = method === 'CASH' ? 'AWAITING_CASH' : 'AWAITING_UPI';
        const [u] = await this.pool.query('UPDATE orders SET payment_method=?,payment_status=? WHERE order_code=?', [method, st, code]);
        if (!u.affectedRows)
            return null;
        return this.getOrderByCode(code);
    }
    async completePayment(code, method) {
        const o = await this.getOrderByCode(code);
        if (!o)
            return null;
        const chosen = method || o.paymentMethod;
        if (!['CASH', 'UPI'].includes(chosen))
            throw new Error('Choose a payment method first.');
        const c = await this.pool.getConnection();
        try {
            await c.beginTransaction();
            await c.query("UPDATE orders SET payment_method=?,payment_status='PAID',paid_at=NOW() WHERE order_code=?", [chosen, code]);
            await c.query("INSERT INTO payments(order_id,method,amount,status,paid_at) VALUES(?,?,?,'PAID',NOW()) ON DUPLICATE KEY UPDATE method=VALUES(method),amount=VALUES(amount),status='PAID',paid_at=NOW()", [o.id, chosen, o.total]);
            await c.commit();
        }
        catch (e) {
            await c.rollback();
            throw e;
        }
        finally {
            c.release();
        }
        const updated = await this.getOrderByCode(code);
        await this.releaseIfDone(updated);
        return updated;
    }
    async adminDashboard() {
        const [[s]] = await this.pool.query("SELECT COALESCE(SUM(CASE WHEN payment_status='PAID' THEN total ELSE 0 END),0) revenue,COUNT(*) ordersToday,COALESCE(AVG(total),0) averageOrder,SUM(status IN ('CONFIRMED','PREPARING','COOKING','PLATING','READY')) activeOrders FROM orders WHERE DATE(created_at)=CURDATE()");
        const [[low]] = await this.pool.query('SELECT COUNT(*) lowStockCount FROM ingredients WHERE quantity<=reorder_level');
        const [[occ]] = await this.pool.query("SELECT COUNT(*) occupiedTables FROM restaurant_tables WHERE status='ACTIVE'");
        const st = await this.getRestaurantStatus();
        const [top] = await this.pool.query('SELECT m.name,SUM(oi.quantity) quantity FROM order_items oi JOIN menu_items m ON m.id=oi.menu_item_id JOIN orders o ON o.id=oi.order_id WHERE DATE(o.created_at)=CURDATE() GROUP BY m.id,m.name ORDER BY quantity DESC LIMIT 5');
        const [recent] = await this.pool.query('SELECT order_code code,table_number tableNumber,total,status,payment_status paymentStatus FROM orders ORDER BY created_at DESC LIMIT 8');
        return { ...s, lowStockCount: low.lowStockCount, occupiedTables: occ.occupiedTables, kitchenLoad: st.kitchenLoad, topItems: top, recentOrders: recent };
    }
    async getInventory() {
        const [r] = await this.pool.query('SELECT id,name,unit,quantity,reorder_level reorderLevel,(quantity<=reorder_level) lowStock FROM ingredients ORDER BY lowStock DESC,name');
        return r.map(x => ({ ...x, lowStock: !!x.lowStock }));
    }
    async restockInventory(id, amount) {
        const a = Number(amount);
        if (!Number.isFinite(a) || a <= 0)
            throw new Error('Restock amount must be greater than zero.');
        await this.pool.query('UPDATE ingredients SET quantity=quantity+? WHERE id=?', [a, Number(id)]);
        const [[x]] = await this.pool.query('SELECT id,name,unit,quantity,reorder_level reorderLevel,(quantity<=reorder_level) lowStock FROM ingredients WHERE id=?', [Number(id)]);
        return x ? { ...x, lowStock: !!x.lowStock } : null;
    }
    async toggleMenuAvailability(id, available) {
        await this.pool.query('UPDATE menu_items SET available=? WHERE id=?', [available ? 1 : 0, Number(id)]);
        const [[x]] = await this.pool.query('SELECT id,name,available FROM menu_items WHERE id=?', [Number(id)]);
        return x ? { ...x, available: !!x.available } : null;
    }
}
async function createStore(env) {
    if (String(env.USE_MYSQL || 'false').toLowerCase() !== 'true')
        return new DemoStore();
    const store = new MySQLStore({ host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 3306), user: env.DB_USER || 'root', password: env.DB_PASSWORD || '', database: env.DB_NAME || 'dine_db' });
    await store.health();
    return store;
}
module.exports = { createStore, DemoStore, billFromLines };
