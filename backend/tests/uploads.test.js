const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  ensureUploadDirectory,
  saveBase64Image,
  resolveUploadPath,
  getMimeType,
} = require('../lib/uploads');

const createdFiles = new Set();

test.afterEach(() => {
  for (const filePath of createdFiles) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  createdFiles.clear();
});

test('ensureUploadDirectory creates the expected image folder', () => {
  ensureUploadDirectory();

  const imagesFolder = path.resolve(__dirname, '../uploads/images');
  assert.equal(fs.existsSync(imagesFolder), true);
});

test('saveBase64Image persists a supported image and returns its public API path', () => {
  const publicUrl = saveBase64Image({
    fileName: 'Portrait officiel.png',
    mimeType: 'image/png',
    dataBase64:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8nYQAAAAASUVORK5CYII=',
  });

  assert.match(publicUrl, /^\/api\/uploads\/images\//);

  const storedFile = path.resolve(__dirname, `..${publicUrl.replace('/api', '')}`);
  createdFiles.add(storedFile);

  assert.equal(fs.existsSync(storedFile), true);
  assert.equal(getMimeType(storedFile), 'image/png');
});

test('saveBase64Image rejects unsupported files and resolveUploadPath blocks traversal attempts', () => {
  assert.throws(
    () =>
      saveBase64Image({
        fileName: 'unsafe.svg',
        mimeType: 'image/svg+xml',
        dataBase64: 'PHN2Zz48L3N2Zz4=',
      }),
    /Unsupported image format/
  );

  assert.equal(resolveUploadPath('../secrets.txt'), null);
});
