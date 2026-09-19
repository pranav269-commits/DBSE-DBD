const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..', '..');

test('database review command exposes help without requiring MySQL', () => {
  const result = spawnSync(process.execPath, ['database/review.js', '--help'], {
    cwd: root,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Dine Database Review/i);
  assert.match(result.stdout, /npm run db:review/i);
});
