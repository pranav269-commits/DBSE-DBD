const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

test('project is separated into frontend, backend and database layers', () => {
  assert.equal(exists('frontend/index.html'), true, 'frontend/index.html should exist');
  assert.equal(exists('backend/src/server.js'), true, 'backend/src/server.js should exist');
  assert.equal(exists('backend/data/seed.js'), true, 'backend/data/seed.js should exist');
  assert.equal(exists('backend/tests/integration.test.js'), true, 'backend/tests/integration.test.js should exist');
  assert.equal(exists('database/schema.sql'), true, 'database/schema.sql should exist');
});
