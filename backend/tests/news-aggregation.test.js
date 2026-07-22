const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.CORS_ORIGINS = 'http://localhost:4200';
process.env.NODE_ENV = 'test';

const { pool, initDatabase } = require('../lib/db');
const { call, registerAndLogin } = require('./helpers/api-client');

async function registerAdmin(prefix) {
  return (await registerAndLogin(prefix, 'admin')).token;
}

function xmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function googleRssWith(item) {
  return `<?xml version="1.0"?><rss><channel>${item}</channel></rss>`;
}

function bingRssWith(item) {
  return `<?xml version="1.0"?><rss><channel>${item}</channel></rss>`;
}

const originalFetch = global.fetch;

test.before(async () => {
  await initDatabase();
});

test.after(async () => {
  global.fetch = originalFetch;
  await pool.end();
});

test.afterEach(() => {
  global.fetch = originalFetch;
});

test('aggregates, de-duplicates and filters public news across all three providers', async () => {
  const admin = await registerAdmin('aggregation-success');

  const runToken = `Dordogne${Date.now()}`;
  const sharedUrl = 'https://www.exemple-presse.fr/harkis-hommage-' + Date.now();
  const googleItem = `
    <item>
      <title>Hommage aux harkis de ${runToken} - Exemple Presse</title>
      <link>${sharedUrl}</link>
      <pubDate>Fri, 01 Jan 2027 10:00:00 GMT</pubDate>
      <description>&lt;p&gt;Un hommage a ete rendu aux harkis de la region.&lt;/p&gt;</description>
      <source url="https://www.exemple-presse.fr">Exemple Presse</source>
      <media:thumbnail url="https://www.exemple-presse.fr/img/harkis.jpg"/>
    </item>
    <item>
      <title>Une actualite sans rapport - Exemple Presse</title>
      <link>https://www.exemple-presse.fr/sujet-hors-sujet</link>
      <pubDate>Fri, 01 Jan 2027 09:00:00 GMT</pubDate>
      <description>Un article qui ne concerne pas le sujet de la veille.</description>
      <source url="https://www.exemple-presse.fr">Exemple Presse</source>
    </item>
  `;
  const bingItem = `
    <item>
      <title>Hommage rendu aux harkis (republication)</title>
      <link>${sharedUrl}</link>
      <pubDate>Fri, 01 Jan 2027 11:00:00 GMT</pubDate>
      <description>Republication du meme hommage aux harkis.</description>
    </item>
  `;
  const gdeltUrl = 'https://www.autre-presse.fr/enfants-de-harkis-temoignage-' + Date.now();

  global.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('news.google.com')) {
      return xmlResponse(googleRssWith(googleItem));
    }

    if (url.includes('bing.com')) {
      return xmlResponse(bingRssWith(bingItem));
    }

    if (url.includes('gdeltproject.org')) {
      return jsonResponse({
        articles: [
          {
            url: gdeltUrl,
            title: 'Enfants de harkis : un temoignage',
            domain: 'autre-presse.fr',
            seendate: '20270102103000',
            socialimage: 'https://www.autre-presse.fr/img/temoignage.jpg',
          },
        ],
      });
    }

    throw new Error(`Unexpected fetch call in test: ${url}`);
  };

  const result = await call('POST', 'news/import-public', {
    token: admin,
    body: { max_records: 12 },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.imported.length, 2);
  assert.equal(result.body.skipped, 0);

  const titles = result.body.imported.map((item) => item.title).sort();
  assert.deepEqual(titles, ['Enfants de harkis : un temoignage', `Hommage aux harkis de ${runToken}`]);

  const importedFromExemplePresse = result.body.imported.find(
    (item) => item.source_url === sharedUrl
  );
  // Fed images (here, the RSS <media:thumbnail>) are unreliable enough that imported
  // external articles are never persisted with one — see removeGeneratedExternalImages.
  assert.equal(importedFromExemplePresse.image_url, null);

  // Filter by a run-unique keyword so this assertion stays correct regardless of how many
  // other news rows already exist (the public feed caps results, unrelated older rows must
  // not be able to push this one out of the response).
  const publicList = await call('GET', `news?published=true&q=${encodeURIComponent(runToken)}`);
  assert.ok(publicList.body.news.some((item) => item.source_url === sharedUrl));
});

test('re-running the import skips articles already stored by their source URL', async () => {
  const admin = await registerAdmin('aggregation-skip');
  const sourceUrl = 'https://www.exemple-presse.fr/harkis-rattachement-' + Date.now();
  const item = `
    <item>
      <title>Un temoignage de harkis - Exemple Presse</title>
      <link>${sourceUrl}</link>
      <pubDate>Sat, 02 Jan 2027 10:00:00 GMT</pubDate>
      <description>Un nouveau temoignage de harkis.</description>
      <source url="https://www.exemple-presse.fr">Exemple Presse</source>
      <media:thumbnail url="https://www.exemple-presse.fr/img/temoignage.jpg"/>
    </item>
  `;

  global.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('news.google.com')) {
      return xmlResponse(googleRssWith(item));
    }

    if (url.includes('bing.com')) {
      return xmlResponse(bingRssWith(''));
    }

    if (url.includes('gdeltproject.org')) {
      return jsonResponse({ articles: [] });
    }

    throw new Error(`Unexpected fetch call in test: ${url}`);
  };

  const first = await call('POST', 'news/import-public', { token: admin, body: { max_records: 12 } });
  assert.equal(first.body.imported.length, 1);
  assert.equal(first.body.skipped, 0);

  const second = await call('POST', 'news/import-public', { token: admin, body: { max_records: 12 } });
  assert.equal(second.body.imported.length, 0);
  assert.equal(second.body.skipped, 1);
});

test('keeps aggregating when one provider fails, as long as another succeeds', async () => {
  const admin = await registerAdmin('aggregation-partial');
  const sourceUrl = 'https://www.exemple-presse.fr/harkis-partiel-' + Date.now();
  const item = `
    <item>
      <title>Memoire des harkis - Exemple Presse</title>
      <link>${sourceUrl}</link>
      <pubDate>Sun, 03 Jan 2027 10:00:00 GMT</pubDate>
      <description>Un recit sur la memoire des harkis.</description>
      <source url="https://www.exemple-presse.fr">Exemple Presse</source>
      <media:thumbnail url="https://www.exemple-presse.fr/img/memoire.jpg"/>
    </item>
  `;

  global.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('news.google.com')) {
      return xmlResponse(googleRssWith(item));
    }

    if (url.includes('bing.com')) {
      return new Response('Internal Server Error', { status: 500 });
    }

    if (url.includes('gdeltproject.org')) {
      return new Response('please limit requests', { status: 200 });
    }

    throw new Error(`Unexpected fetch call in test: ${url}`);
  };

  const result = await call('POST', 'news/import-public', {
    token: admin,
    body: { max_records: 12 },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.imported.length, 1);
  assert.equal(result.body.imported[0].source_url, sourceUrl);
});

test('returns a 502 when every provider fails', async () => {
  const admin = await registerAdmin('aggregation-total-failure');

  global.fetch = async () => new Response('Service Unavailable', { status: 503 });

  const result = await call('POST', 'news/import-public', {
    token: admin,
    body: { max_records: 12 },
  });

  assert.equal(result.status, 502);
  assert.match(result.body.error, /Impossible de recuperer les articles publics/);
});

test('scrapes the article page for an image when the feed provides none, but still never persists it', async () => {
  const admin = await registerAdmin('aggregation-image-scrape');
  const sourceUrl = 'https://www.exemple-presse.fr/harkis-sans-image-' + Date.now();
  const item = `
    <item>
      <title>Recit de harkis sans image - Exemple Presse</title>
      <link>${sourceUrl}</link>
      <pubDate>Mon, 04 Jan 2027 10:00:00 GMT</pubDate>
      <description>Un recit de harkis sans image associee dans le flux.</description>
      <source url="https://www.exemple-presse.fr">Exemple Presse</source>
    </item>
  `;

  global.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('news.google.com')) {
      return xmlResponse(googleRssWith(item));
    }

    if (url.includes('bing.com')) {
      return xmlResponse(bingRssWith(''));
    }

    if (url.includes('gdeltproject.org')) {
      return jsonResponse({ articles: [] });
    }

    if (url === sourceUrl) {
      return htmlResponse(
        `<html><head><meta property="og:image" content="https://www.exemple-presse.fr/img/scraped.jpg"></head><body></body></html>`
      );
    }

    throw new Error(`Unexpected fetch call in test: ${url}`);
  };

  const result = await call('POST', 'news/import-public', {
    token: admin,
    body: { max_records: 12 },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.imported.length, 1);
  // The scrape (mocked above) succeeds, but the result is still discarded at persistence time.
  assert.equal(result.body.imported[0].image_url, null);
});
