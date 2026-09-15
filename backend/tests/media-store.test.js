const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { pool } = require('../lib/db');
const { createMediaStore } = require('../lib/media-store');

// Run via tests/setup-env.js so only the dedicated test database is used.
test('media bytes survive a new store instance and cannot be overwritten at the same URL', async () => {
  const url = `/api/uploads/event-media/test-${crypto.randomUUID()}.pdf`;
  const buffer = Buffer.from('%PDF-1.4\nPersistent binary content\x00\xff', 'latin1');
  try {
    await createMediaStore(pool).put({ url, mimeType: 'application/pdf', buffer });
    const freshStore = createMediaStore(pool);
    const restored = await freshStore.get(url);
    assert.equal(restored.mimeType, 'application/pdf');
    assert.deepEqual(restored.buffer, buffer);
    await freshStore.put({ url, mimeType: 'image/png', buffer: Buffer.from('replacement') });
    assert.deepEqual((await freshStore.get(url)).buffer, buffer);
    assert.equal(await freshStore.get(`${url}.missing`), null);
  } finally {
    await pool.query('DELETE FROM uploaded_media WHERE url = $1', [url]);
    await pool.end();
  }
});
