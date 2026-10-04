const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { DemoStore, billFromLines } = require('../src/store');
const runtime = path.join(__dirname, '..', 'data', 'runtime.json');
function fresh() {
    try {
        fs.unlinkSync(runtime);
    }
    catch {
    }
    return new DemoStore();
}
test('bill uses exact locked item prices plus 5% GST', () => {
    const b = billFromLines([{ unitPrice: 329, quantity: 2 }, { unitPrice: 79, quantity: 3 }, { unitPrice: 149, quantity: 1 }]);
    assert.equal(b.subtotal, 1044);
    assert.equal(b.gst, 52.2);
    assert.equal(b.total, 1096.2);
});
test('all 12 QR table tokens are unique', async () => {
    const s = fresh();
    const t = await s.getTables();
    assert.equal(t.length, 12);
    assert.equal(new Set(t.map(x => x.token)).size, 12);
    assert.deepEqual(t.map(x => x.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});
test('every menu item has a matching local artwork file', async () => {
    const s = fresh();
    const m = await s.getMenu();
    assert.equal(m.length, 32);
    for (const i of m) {
        assert.ok(i.image.includes(i.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')), `${i.name} artwork slug mismatch`);
        const f = path.join(__dirname, '..', '..', 'frontend', i.image);
        assert.ok(fs.existsSync(f), `Missing artwork: ${f}`);
    }
});
test('one table order is isolated and exact', async () => {
    const s = fresh();
    const t = (await s.getTables())[4];
    const o = await s.placeOrder({ tableNumber: 5, token: t.token, items: [{ menuItemId: 5, quantity: 2 }, { menuItemId: 14, quantity: 2 }, { menuItemId: 30, quantity: 1 }] });
    assert.equal(o.tableNumber, 5);
    assert.equal(o.items.length, 3);
    assert.equal(o.subtotal, 955);
    assert.equal(o.gst, 47.75);
    assert.equal(o.total, 1002.75);
    const tab = (await s.getTables()).find(x => x.number === 5);
    assert.equal(tab.status, 'ACTIVE');
    assert.equal(tab.currentOrderCode, o.code);
});
