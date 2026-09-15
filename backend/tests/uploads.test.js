const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  ensureUploadDirectory,
  saveBase64Image,
  saveBase64EventMedia,
  resolveUploadPath,
  resolveBundledUploadPath,
  getMimeType,
} = require('../lib/uploads');

const createdFiles = new Set();

function memoryMediaStore() {
  const files = new Map();
  return {
    async put(media) { files.set(media.url, { mimeType: media.mimeType, buffer: media.buffer }); },
    async get(url) { return files.get(url) || null; },
  };
}

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
  const server = buildServer({ mediaStore: memoryMediaStore() });
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


test('PDF previews can fetch uploaded files from an allowed frontend origin', async () => {
  const previousOrigins = process.env.CORS_ORIGINS;
  process.env.CORS_ORIGINS = 'https://www.ahedna.fr';
  const { buildServer } = require('../server');
  const server = buildServer({ mediaStore: memoryMediaStore() });
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');
  const url = saveBase64EventMedia({
    fileName: 'event-preview.pdf', mimeType: 'application/pdf', dataBase64: pdf.toString('base64'),
  });
  createdFiles.add(resolveUploadPath(url.replace('/api/uploads/', '')));
  try {
    const response = await server.inject({ method: 'GET', url, headers: { origin: 'https://www.ahedna.fr' } });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['content-type'], 'application/pdf');
    assert.equal(response.headers['access-control-allow-origin'], 'https://www.ahedna.fr');
    assert.equal(response.headers.vary, 'Origin');
    assert.deepEqual(response.rawPayload, pdf);

    const missing = await server.inject({ method: 'GET', url: '/api/uploads/event-media/missing.pdf', headers: { origin: 'https://www.ahedna.fr' } });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.headers['access-control-allow-origin'], 'https://www.ahedna.fr');

    const untrusted = await server.inject({ method: 'GET', url, headers: { origin: 'https://untrusted.example' } });
    assert.equal(untrusted.headers['access-control-allow-origin'], undefined);
  } finally {
    await server.close();
    if (previousOrigins === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = previousOrigins;
  }
});


test('bundled public media remains readable when the runtime upload is absent', async () => {
  const { buildServer } = require('../server');
  const server = buildServer({ mediaStore: memoryMediaStore() });
  const relativePath = `event-media/bundled-test-${process.pid}.pdf`;
  const bundledPath = resolveBundledUploadPath(relativePath);
  fs.mkdirSync(path.dirname(bundledPath), { recursive: true });
  fs.writeFileSync(bundledPath, '%PDF-1.4 bundled fixture');
  createdFiles.add(bundledPath);
  assert.equal(fs.existsSync(resolveUploadPath(relativePath)), false);
  assert.equal(resolveBundledUploadPath('../../server.js'), null);
  try {
    const response = await server.inject({ method: 'GET', url: `/api/uploads/${relativePath}` });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body, '%PDF-1.4 bundled fixture');
    assert.equal(response.headers['content-type'], 'application/pdf');
  } finally {
    await server.close();
  }
});


test('admin uploads survive an application restart without writing a local file', async () => {
  const { buildServer } = require('../server');
  const { generateToken } = require('../lib/auth');
  const mediaStore = memoryMediaStore();
  const firstServer = buildServer({ mediaStore });
  const pdf = Buffer.from('%PDF-1.4 persistent upload test');
  let url;
  try {
    const uploaded = await firstServer.inject({
      method: 'POST', url: '/api/uploads/event-media',
      headers: { authorization: `Bearer ${generateToken({ id: 'upload-test', role: 'admin' })}` },
      payload: { file_name: 'poster.pdf', mime_type: 'application/pdf', data_base64: pdf.toString('base64') },
    });
    assert.equal(uploaded.statusCode, 200);
    url = uploaded.json().url;
    assert.equal(fs.existsSync(resolveUploadPath(url.replace('/api/uploads/', ''))), false);
  } finally { await firstServer.close(); }
  const secondServer = buildServer({ mediaStore });
  try {
    const downloaded = await secondServer.inject({ method: 'GET', url });
    assert.equal(downloaded.statusCode, 200);
    assert.deepEqual(downloaded.rawPayload, pdf);
  } finally { await secondServer.close(); }
});

test('failed durable storage returns an error instead of an unusable upload URL', async () => {
  const { buildServer } = require('../server');
  const { generateToken } = require('../lib/auth');
  const server = buildServer({ mediaStore: {
    async put() { throw new Error('Database unavailable'); },
    async get() { throw new Error('Database unavailable'); },
  } });
  try {
    const uploaded = await server.inject({
      method: 'POST', url: '/api/uploads/event-media',
      headers: { authorization: `Bearer ${generateToken({ id: 'upload-test', role: 'admin' })}` },
      payload: { file_name: 'poster.pdf', mime_type: 'application/pdf', data_base64: Buffer.from('%PDF-1.4 test').toString('base64') },
    });
    assert.equal(uploaded.statusCode, 503);
    assert.equal(uploaded.json().url, undefined);
    const downloaded = await server.inject({ method: 'GET', url: '/api/uploads/event-media/poster.pdf' });
    assert.equal(downloaded.statusCode, 503);
  } finally { await server.close(); }
});
