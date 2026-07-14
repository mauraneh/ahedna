import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const siteUrl = normalizeSiteUrl(process.env.AHEDNA_SITE_URL || 'https://ahedna.fr');
const publicDir = resolve(process.cwd(), 'public');
const today = new Date().toISOString().slice(0, 10);

const routes = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/histoire', priority: '0.9', changefreq: 'monthly' },
  { path: '/actualites', priority: '0.9', changefreq: 'weekly' },
  { path: '/evenements', priority: '0.9', changefreq: 'weekly' },
  { path: '/forum', priority: '0.6', changefreq: 'weekly' },
  { path: '/galerie', priority: '0.7', changefreq: 'weekly' },
  { path: '/adhesion', priority: '0.9', changefreq: 'monthly' },
  { path: '/contact', priority: '0.7', changefreq: 'monthly' },
  { path: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
  { path: '/politique-confidentialite', priority: '0.3', changefreq: 'yearly' },
];

mkdirSync(publicDir, { recursive: true });

writeFileSync(resolve(publicDir, 'robots.txt'), buildRobotsTxt(siteUrl), 'utf8');
writeFileSync(resolve(publicDir, 'sitemap.xml'), buildSitemapXml(siteUrl, routes, today), 'utf8');

console.log(`[seo] robots.txt and sitemap.xml generated for ${siteUrl}`);

function normalizeSiteUrl(value) {
  const trimmed = String(value).trim().replace(/\/+$/, '');
  return trimmed || 'https://ahedna.fr';
}

function buildRobotsTxt(baseUrl) {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /contenu',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /profil',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

function buildSitemapXml(baseUrl, items, lastmod) {
  const urls = items
    .map(
      (item) => `  <url>
    <loc>${baseUrl}${item.path === '/' ? '' : item.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
