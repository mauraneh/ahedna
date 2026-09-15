const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  ensureUploadDirectory,
  saveBase64Image,
  saveBase64EventMedia,
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

test('saveBase64EventMedia persists a PDF in the dedicated event folder', () => {
  const publicUrl = saveBase64EventMedia({
    fileName: 'Programme annuel.pdf',
    mimeType: 'application/pdf',
    dataBase64: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF').toString('base64'),
  });

  assert.match(publicUrl, /^\/api\/uploads\/event-media\//);

  const storedFile = path.resolve(__dirname, `..${publicUrl.replace('/api', '')}`);
  createdFiles.add(storedFile);

  assert.equal(fs.existsSync(storedFile), true);
  assert.equal(getMimeType(storedFile), 'application/pdf');
});

test('saveBase64EventMedia rejects a fake PDF', () => {
  assert.throws(
    () =>
      saveBase64EventMedia({
        fileName: 'fake.pdf',
        mimeType: 'application/pdf',
        dataBase64: Buffer.from('<script>alert(1)</script>').toString('base64'),
      }),
    /Event media content does not match the declared format/
  );
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

test('saveBase64Image rejects an image whose bytes do not match its MIME type', () => {
  assert.throws(
    () =>
      saveBase64Image({
        fileName: 'fake.png',
        mimeType: 'image/png',
        dataBase64: Buffer.from('<script>alert(1)</script>').toString('base64'),
      }),
    /Image content does not match the declared format/
  );
});

test('saveBase64Image rejects a buffer too short to contain any known signature', () => {
  assert.throws(
    () =>
      saveBase64Image({
        fileName: 'tiny.png',
        mimeType: 'image/png',
        dataBase64: Buffer.from([1, 2, 3]).toString('base64'),
      }),
    /Image content does not match the declared format/
  );
});

test('saveBase64Image rejects non-string and malformed base64 payloads', () => {
  assert.throws(
    () => saveBase64Image({ fileName: 'x.png', mimeType: 'image/png', dataBase64: undefined }),
    /Image data is required/
  );
  assert.throws(
    () =>
      saveBase64Image({ fileName: 'x.png', mimeType: 'image/png', dataBase64: '!!!not-base64!!!' }),
    /Image data is invalid/
  );
});

test('saveBase64Image falls back to a generic name when the file name has no usable characters', () => {
  const publicUrl = saveBase64Image({
    fileName: '@@@.png',
    mimeType: 'image/png',
    dataBase64:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8nYQAAAAASUVORK5CYII=',
  });
  createdFiles.add(path.resolve(__dirname, `..${publicUrl.replace('/api', '')}`));

  assert.match(publicUrl, /-image\.png$/);
});

const OTHER_SIGNATURES = {
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00]),
  'image/webp': Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]),
  'image/gif': Buffer.from('GIF89a\0\0'),
};

for (const [mimeType, signature] of Object.entries(OTHER_SIGNATURES)) {
  test(`saveBase64Image accepts a valid ${mimeType} signature`, () => {
    const publicUrl = saveBase64Image({
      fileName: 'sample',
      mimeType,
      dataBase64: signature.toString('base64'),
    });
    createdFiles.add(path.resolve(__dirname, `..${publicUrl.replace('/api', '')}`));

    assert.match(publicUrl, /^\/api\/uploads\/images\//);
  });

  test(`saveBase64Image rejects bytes that don't match the declared ${mimeType} signature`, () => {
    assert.throws(
      () =>
        saveBase64Image({
          fileName: 'sample',
          mimeType,
          dataBase64: Buffer.from('not-an-image').toString('base64'),
        }),
      /Image content does not match the declared format/
    );
  });
}

test('saveBase64Image rejects an image exceeding the configured size limit', () => {
  // MAX_IMAGE_SIZE_BYTES is read from the environment once, at module load time,
  // so the limit can only be exercised by reloading the module with a fresh cache.
  const modulePath = require.resolve('../lib/uploads');
  const previousLimit = process.env.MAX_IMAGE_SIZE_BYTES;
  process.env.MAX_IMAGE_SIZE_BYTES = '10';
  delete require.cache[modulePath];

  try {
    const { saveBase64Image: saveWithTinyLimit } = require('../lib/uploads');
    assert.throws(
      () =>
        saveWithTinyLimit({
          fileName: 'big.png',
          mimeType: 'image/png',
          dataBase64:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8nYQAAAAASUVORK5CYII=',
        }),
      /Image is too large/
    );
  } finally {
    if (previousLimit === undefined) {
      delete process.env.MAX_IMAGE_SIZE_BYTES;
    } else {
      process.env.MAX_IMAGE_SIZE_BYTES = previousLimit;
    }
    delete require.cache[modulePath];
  }
});

test('resolveUploadPath resolves a valid nested path and treats the root itself as valid', () => {
  const imagesFolder = path.resolve(__dirname, '../uploads/images');
  assert.equal(resolveUploadPath('images/foo.png'), path.join(imagesFolder, 'foo.png'));
  assert.equal(resolveUploadPath(''), path.resolve(__dirname, '../uploads'));
});

test('getMimeType resolves every supported extension and defaults for unknown ones', () => {
  assert.equal(getMimeType('photo.jpg'), 'image/jpeg');
  assert.equal(getMimeType('photo.jpeg'), 'image/jpeg');
  assert.equal(getMimeType('photo.webp'), 'image/webp');
  assert.equal(getMimeType('photo.gif'), 'image/gif');
  assert.equal(getMimeType('document.pdf'), 'application/pdf');
  assert.equal(getMimeType('photo.txt'), 'application/octet-stream');
});

test('the dedicated upload routes answer with CORS headers', async () => {
  process.env.CORS_ORIGINS = 'http://localhost:4200';

  const { buildServer } = require('../server');
  const { generateToken } = require('../lib/auth');
  const server = buildServer();
  const token = generateToken({ id: 'cors-test', email: 'cors@example.org', role: 'admin' });
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  for (const route of ['/api/uploads/images', '/api/uploads/event-media']) {
    const response = await server.inject({
      method: 'POST',
      url: route,
      headers: {
        origin: 'http://localhost:4200',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: { file_name: 'cors.png', mime_type: 'image/png', data_base64: pngBase64 },
    });

    assert.equal(response.statusCode, 200);
    // Without this header the browser drops the response and the upload fails with
    // a status 0, even though the server answered 200.
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:4200');

    createdFiles.add(path.resolve(__dirname, '..', response.json().url.replace('/api/', '')));
  }

  await server.close();
});
