const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret';

const {
  getSafeExternalUrl,
  isBlockedHostname,
  isPrivateIPv4,
  decodeXmlEntities,
  stripHtml,
  isNewsAggregatorUrl,
  removeGeneratedExternalImages,
  getGdeltDate,
  normalizeString,
  normalizeEmail,
} = require('../lib/api-handler');

test('getSafeExternalUrl only accepts http/https URLs without embedded credentials', () => {
  assert.equal(getSafeExternalUrl('https://www.lemonde.fr/article'), 'https://www.lemonde.fr/article');
  assert.equal(getSafeExternalUrl('ftp://example.org/file'), null);
  assert.equal(getSafeExternalUrl('javascript:alert(1)'), null);
  assert.equal(getSafeExternalUrl('https://user:pass@example.org'), null);
  assert.equal(getSafeExternalUrl(''), null);
  assert.equal(getSafeExternalUrl(null), null);
});

test('getSafeExternalUrl blocks SSRF attempts targeting internal or private hosts', () => {
  assert.equal(getSafeExternalUrl('http://localhost/admin'), null);
  assert.equal(getSafeExternalUrl('http://127.0.0.1/admin'), null);
  assert.equal(getSafeExternalUrl('http://169.254.169.254/latest/meta-data'), null);
  assert.equal(getSafeExternalUrl('http://10.0.0.5/internal'), null);
  assert.equal(getSafeExternalUrl('http://172.16.5.1/internal'), null);
  assert.equal(getSafeExternalUrl('http://192.168.1.1/router'), null);
  assert.equal(getSafeExternalUrl('http://[::1]/admin'), null);
  assert.equal(getSafeExternalUrl('http://service.internal.local/'), null);
});

test('getSafeExternalUrl resolves relative URLs against a trusted base', () => {
  assert.equal(
    getSafeExternalUrl('/image.jpg', 'https://www.lemonde.fr/article'),
    'https://www.lemonde.fr/image.jpg'
  );
});

test('isBlockedHostname recognizes localhost variants and private ranges', () => {
  assert.equal(isBlockedHostname('localhost'), true);
  assert.equal(isBlockedHostname('foo.localhost'), true);
  assert.equal(isBlockedHostname('printer.local'), true);
  assert.equal(isBlockedHostname('fe80::1'), true);
  assert.equal(isBlockedHostname('www.lemonde.fr'), false);
});

test('isPrivateIPv4 detects RFC1918 and loopback ranges without flagging public IPs', () => {
  assert.equal(isPrivateIPv4('10.1.2.3'), true);
  assert.equal(isPrivateIPv4('172.16.0.1'), true);
  assert.equal(isPrivateIPv4('172.31.255.255'), true);
  assert.equal(isPrivateIPv4('172.32.0.1'), false);
  assert.equal(isPrivateIPv4('192.168.0.1'), true);
  assert.equal(isPrivateIPv4('127.0.0.1'), true);
  assert.equal(isPrivateIPv4('8.8.8.8'), false);
  assert.equal(isPrivateIPv4('not-an-ip'), false);
});

test('decodeXmlEntities unescapes common XML/HTML entities and CDATA sections', () => {
  assert.equal(decodeXmlEntities('Tom &amp; Jerry'), 'Tom & Jerry');
  assert.equal(decodeXmlEntities('&lt;b&gt;bold&lt;/b&gt;'), '<b>bold</b>');
  assert.equal(decodeXmlEntities('<![CDATA[raw text]]>'), 'raw text');
  assert.equal(decodeXmlEntities('&#39;quoted&#39;'), "'quoted'");
});

test('stripHtml removes tags and collapses whitespace', () => {
  assert.equal(stripHtml('<p>Hello <b>world</b></p>'), 'Hello world');
  assert.equal(stripHtml('Line one\n\n   Line two'), 'Line one Line two');
});

test('isNewsAggregatorUrl only matches known aggregator domains', () => {
  assert.equal(isNewsAggregatorUrl('https://news.google.com/rss/articles/xyz'), true);
  assert.equal(isNewsAggregatorUrl('https://www.bing.com/news/apiclick'), true);
  assert.equal(isNewsAggregatorUrl('https://www.lemonde.fr/article'), false);
});

test('getGdeltDate parses the compact GDELT timestamp format', () => {
  assert.equal(getGdeltDate('20260427101500'), '2026-04-27T10:15:00Z');
  assert.equal(getGdeltDate('not-a-date'), null);
  assert.equal(getGdeltDate(null), null);
});

test('removeGeneratedExternalImages strips the image from externally sourced rows only', () => {
  const rows = [
    { id: '1', source_url: 'https://www.lemonde.fr/a', image_url: 'https://www.lemonde.fr/a.jpg' },
    { id: '2', source_url: null, image_url: '/api/uploads/images/local.png' },
  ];

  const result = removeGeneratedExternalImages(rows);

  assert.equal(result[0].image_url, null);
  assert.equal(result[1].image_url, '/api/uploads/images/local.png');
});

test('normalizeString trims, bounds the length and rejects non-strings', () => {
  assert.equal(normalizeString('  hello  '), 'hello');
  assert.equal(normalizeString('x'.repeat(10), 5), 'xxxxx');
  assert.equal(normalizeString('   '), null);
  assert.equal(normalizeString(42), null);
});

test('normalizeEmail trims, lowercases and bounds the address', () => {
  assert.equal(normalizeEmail('  User@Example.ORG  '), 'user@example.org');
  assert.equal(normalizeEmail(''), null);
});
