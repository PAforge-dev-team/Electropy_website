#!/usr/bin/env node
/* ============================================================
   ELECTROPY — static site builder (no dependencies)
   ------------------------------------------------------------
   Reads   texts.js  +  tools/template.html
   Writes  index.html, ku/index.html, fa/index.html, ar/index.html,
           sitemap.xml, robots.txt, site.webmanifest

   Run from anywhere:   node tools/build.js

   You only need this after editing texts.js or the template, to
   refresh the pre-rendered HTML / SEO tags. (The pages also read
   texts.js live in the browser, so text edits show up even
   without rebuilding.)
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT_DIR, p), 'utf8');
const write = (p, s) => {
  const full = path.join(ROOT_DIR, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, s);
  console.log('  wrote', p, '(' + Buffer.byteLength(s) + ' bytes)');
};

/* ---------- load texts.js ---------- */
const sandbox = { window: {} };
vm.runInNewContext(read('texts.js'), sandbox);
const SITE = sandbox.window.SITE;
const ALL = sandbox.window.TEXTS_ALL;
const LANGS = Object.keys(SITE.langs);
const BASE = SITE.baseUrl.replace(/\/?$/, '/');
const TODAY = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pageUrl = (lang) => BASE + SITE.langs[lang].path;
const encodedDownload = SITE.links.download.replace(/\+/g, '%2B');

/* ---------- RTL transform of the SVG artwork ----------
   The whole artwork is mirrored by a wrapper <g> (see template);
   text and bitmap images are flipped back here so they read normally
   and simply sit on the mirrored side. */
function rtlPass(html) {
  html = html.replace(/<text\b[^>]*>/g, (tag) => {
    if (/transform="translate\([^)]*\)"/.test(tag)) {
      return tag.replace(/transform="(translate\([^)]*\))"/, 'transform="$1 scale(-1 1)"');
    }
    if (/\sx="[\d.]+"/.test(tag)) {
      return tag.replace(/\sx="([\d.]+)"/, ' x="-$1" transform="scale(-1 1)"');
    }
    return tag;
  });
  html = html.replace(/<image\s+width="([\d.]+)"(\s+height="[\d.]+"\s+)transform="translate\(([\d.]+) ([\d.]+)\)"/g,
    (m, w, mid, x, y) => `<image width="${w}"${mid}transform="translate(${(+x) + (+w)} ${y}) scale(-1 1)"`);
  return html;
}

/* ---------- language switchers ---------- */
function langLinks(cur, root) {
  const href = (l) => root + SITE.langs[l].path || './';
  const html = LANGS.map((l) => {
    const c = SITE.langs[l];
    return `<a href="${href(l)}" hreflang="${c.hreflang[0]}" lang="${c.htmlLang}" title="${esc(c.native)}" data-lang-link="${l}"${l === cur ? ' class="is-active" aria-current="page"' : ''}>${c.short}</a>`;
  }).join('');
  const mobile = LANGS.map((l) => {
    const c = SITE.langs[l];
    return `<a style="--i:7" href="${href(l)}" hreflang="${c.hreflang[0]}" lang="${c.htmlLang}" data-lang-link="${l}"${l === cur ? ' class="is-active" aria-current="page"' : ''}>${esc(c.native)}</a>`;
  }).join('');
  const svg = LANGS.map((l, i) => {
    const c = SITE.langs[l];
    const x = 1012 + i * 38;
    const mark = l === cur ? `<rect class="svg-lang-mark" x="${x}" y="90" width="19" height="1.5"/>` : '';
    return `
              <a href="${href(l)}" data-lang-link="${l}" tabindex="-1"${l === cur ? ' class="is-active"' : ''}>${mark}<text class="svg-lang-link" transform="translate(${x} 83)"><tspan x="0" y="0">${c.short}</tspan></text></a>`;
  }).join('');
  const sr = LANGS.map((l) => {
    const c = SITE.langs[l];
    return `<li><a href="${href(l)}" hreflang="${c.hreflang[0]}" lang="${c.htmlLang}" data-lang-link="${l}">${esc(c.native)}</a></li>`;
  }).join('');
  return { html, mobile, svg, sr };
}

/* ---------- visible FAQ section (real HTML text: good for users and for search engines) ---------- */
function faqSection(t) {
  const items = [];
  for (let i = 1; t['faq_' + i + '_q']; i++) {
    items.push(`      <details class="faq-item reveal" style="--rd:${60 * i}ms"${i === 1 ? ' open' : ''}>
        <summary><h3 data-text="faq_${i}_q">{{t:faq_${i}_q}}</h3><span class="faq-icon" aria-hidden="true"></span></summary>
        <p data-text="faq_${i}_a">{{t:faq_${i}_a}}</p>
      </details>`);
  }
  return `  <!-- ===== FAQ (HTML) ===== -->
  <section class="faq" id="faq" data-section-target="faq" aria-labelledby="faq-title">
    <div class="faq-head reveal">
      <p class="faq-eyebrow" data-text="faq_eyebrow">{{t:faq_eyebrow}}</p>
      <h2 class="faq-title" id="faq-title" data-text="faq_title">{{t:faq_title}}</h2>
      <p class="faq-desc" data-text="faq_desc">{{t:faq_desc}}</p>
    </div>
    <div class="faq-list">
${items.join('\n')}
    </div>
  </section>`;
}

/* ---------- semantic, crawlable copy of the page (same texts as the artwork) ---------- */
function seoContent(root, sr) {
  const s = (k) => `<span data-text="${k}">{{t:${k}}}</span>`;
  return `  <!-- ===== SEMANTIC CONTENT (same texts as the artwork, for search engines & screen readers) ===== -->
  <article class="sr-only" id="content">
    <header>
      <h1>${s('hero_title')} — ${s('hero_subtitle')}</h1>
      <p>${s('hero_eyebrow')}</p>
      <p>${s('hero_desc_line1')} ${s('hero_desc_line2')}</p>
      <p><a href="${esc(SITE.links.download)}" rel="noopener">${s('hero_btn_download')}</a> · ${s('hero_badge_os')}</p>
      <img src="${root}assets/images/preview.webp" width="1920" height="1000" alt="{{t:preview_alt}}" data-alt="preview_alt" decoding="async">
    </header>
    <section>
      <h2>${s('features_title')}</h2>
      <p>${s('features_desc')}</p>
      <h3>${s('feature_1_title')}</h3>
      <p>${s('feature_1_desc_line1')} ${s('feature_1_desc_line2')}</p>
      <h3>${s('feature_2_title')}</h3>
      <p>${s('feature_2_desc_line1')} ${s('feature_2_desc_line2')}</p>
      <h3>${s('feature_3_title')}</h3>
      <p>${s('feature_3_desc_line1')} ${s('feature_3_desc_line2')}</p>
    </section>
    <section>
      <h2>${s('about_title')}</h2>
      <p>${s('about_desc')}</p>
      <ul>
        <li>${s('about_core_label')}: ${s('about_core_name')}</li>
        <li>${s('about_ext_label')}: ${s('about_ext_resistor')}</li>
        <li>${s('about_ext_label')}: ${s('about_ext_capacitor')}</li>
      </ul>
      <p>${s('about_design_label')}: ${s('about_design_1')}, ${s('about_design_2')}, ${s('about_design_3')}. ${s('about_design_desc')}</p>
    </section>
    <section>
      <h2>${s('project_title')}</h2>
      <p>${s('project_desc_line1')} ${s('project_desc_line2')}</p>
      <p>${s('project_identity_name')} — ${s('project_identity_team')} — ${s('project_identity_tags')}</p>
      <h3>${s('project_designed_title')}</h3>
      <p>${s('project_designed_desc_line1')} ${s('project_designed_desc_line2')}</p>
    </section>
    <section>
      <h2>${s('download_title')}</h2>
      <p>${s('download_desc')}</p>
      <p><a href="${esc(SITE.links.download)}" rel="noopener">${s('download_card_btn')} — ${s('download_card_title')}</a> (${s('download_card_meta')})</p>
      <p>${s('download_footer')}</p>
    </section>
    <footer>
      <p>${s('footer_tagline')}</p>
      <ul>
        <li><a href="${esc(SITE.links.github)}" rel="noopener">${s('nav_visit_github')}</a></li>
        <li><a href="${esc(SITE.links.telegram)}" rel="noopener">${s('nav_telegram_channel')}</a></li>
      </ul>
      <nav aria-label="{{t:aria_language}}" data-aria="aria_language"><ul>${sr}</ul></nav>
      <p>${s('footer_copyright')}</p>
    </footer>
  </article>`;
}

/* ---------- <head> ---------- */
function jsonLd(lang, t) {
  const c = SITE.langs[lang];
  const url = pageUrl(lang);
  const img = BASE + 'assets/images/preview.webp';
  const graph = [
    {
      '@type': 'Organization',
      '@id': BASE + '#organization',
      name: 'PAforge',
      alternateName: ['PAforge Development Team', t.footer_team],
      url: BASE,
      logo: { '@type': 'ImageObject', url: BASE + 'web-app-manifest-512x512.png', width: 512, height: 512 },
      sameAs: [SITE.links.telegram, SITE.links.githubOrg]
    },
    {
      '@type': 'WebSite',
      '@id': BASE + '#website',
      url: BASE,
      name: 'ElectroPy',
      alternateName: [t.hero_title, 'Electropy'],
      description: t.meta_description,
      inLanguage: LANGS.map((l) => SITE.langs[l].htmlLang),
      publisher: { '@id': BASE + '#organization' }
    },
    {
      '@type': 'WebPage',
      '@id': url + '#webpage',
      url: url,
      name: t.page_title,
      description: t.meta_description,
      inLanguage: c.htmlLang,
      isPartOf: { '@id': BASE + '#website' },
      about: { '@id': BASE + '#software' },
      mainEntity: { '@id': BASE + '#software' },
      primaryImageOfPage: { '@type': 'ImageObject', url: img, width: 1920, height: 1000, caption: t.preview_alt },
      dateModified: TODAY
    },
    {
      '@type': 'SoftwareApplication',
      '@id': BASE + '#software',
      name: 'ElectroPy',
      alternateName: [t.hero_title, 'Electropy'],
      description: t.schema_app_description,
      url: url,
      image: img,
      screenshot: { '@type': 'ImageObject', url: img, width: 1920, height: 1000, caption: t.preview_alt },
      applicationCategory: 'UtilitiesApplication',
      applicationSubCategory: t.schema_category,
      operatingSystem: SITE.release.operatingSystem,
      softwareVersion: SITE.release.version,
      datePublished: SITE.release.datePublished,
      fileSize: SITE.release.fileSize,
      downloadUrl: encodedDownload,
      installUrl: SITE.links.github + '/releases',
      codeRepository: SITE.links.github,
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      featureList: [t.schema_feature_1, t.schema_feature_2, t.schema_feature_3, t.schema_feature_4],
      keywords: t.meta_keywords,
      author: { '@id': BASE + '#organization' },
      publisher: { '@id': BASE + '#organization' }
    }
  ];
  /* FAQ + breadcrumb + how-to-install structured data (same texts as the visible FAQ section) */
  const faqN = [];
  for (let i = 1; t['faq_' + i + '_q']; i++) faqN.push(i);
  graph.push({
    '@type': 'FAQPage',
    '@id': url + '#faq',
    inLanguage: c.htmlLang,
    isPartOf: { '@id': url + '#webpage' },
    about: { '@id': BASE + '#software' },
    mainEntity: faqN.map((i) => ({
      '@type': 'Question',
      name: t['faq_' + i + '_q'],
      acceptedAnswer: { '@type': 'Answer', text: t['faq_' + i + '_a'] }
    }))
  });
  graph.push({
    '@type': 'BreadcrumbList',
    '@id': url + '#breadcrumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'PAforge', item: SITE.links.githubOrg },
      { '@type': 'ListItem', position: 2, name: t.hero_title, item: url }
    ]
  });
  graph[2].breadcrumb = { '@id': url + '#breadcrumb' };
  graph[2].hasPart = { '@id': url + '#faq' };
  delete graph[3].codeRepository; // not a SoftwareApplication property — kept out for strict validation
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replace(/</g, '\\u003c');
}

function head(lang, t, root) {
  const c = SITE.langs[lang];
  const url = pageUrl(lang);
  const ogImg = BASE + 'assets/og/og-' + lang + '.jpg';
  const alternates = [];
  LANGS.forEach((l) => SITE.langs[l].hreflang.forEach((h) => alternates.push(`<link rel="alternate" hreflang="${h}" href="${pageUrl(l)}">`)));
  alternates.push(`<link rel="alternate" hreflang="x-default" href="${pageUrl(SITE.defaultLang)}">`);
  const ogAlt = LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${SITE.langs[l].ogLocale}">`);
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<title data-text="page_title">${esc(t.page_title)}</title>
<meta name="description" content="${esc(t.meta_description)}">
<meta name="keywords" content="${esc(t.meta_keywords)}">
<meta name="author" content="PAforge Development Team">
<meta name="publisher" content="PAforge">
<meta name="application-name" content="ElectroPy">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="google-site-verification" content="y4TLE__KYcweNOFC9bByHxNJOLmzyhSzI86XXsCqPfM">
<meta name="theme-color" content="#0a1d2b">
<meta name="color-scheme" content="light">
<meta name="format-detection" content="telephone=no">

<!-- ===== CANONICAL + LANGUAGE VERSIONS ===== -->
<link rel="canonical" href="${url}">
${alternates.join('\n')}

<!-- ===== OPEN GRAPH / SOCIAL CARDS ===== -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="ElectroPy">
<meta property="og:title" content="${esc(t.og_title)}">
<meta property="og:description" content="${esc(t.og_description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImg}">
<meta property="og:image:secure_url" content="${ogImg}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t.og_image_alt)}">
<meta property="og:locale" content="${c.ogLocale}">
${ogAlt.join('\n')}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.og_title)}">
<meta name="twitter:description" content="${esc(t.og_description)}">
<meta name="twitter:image" content="${ogImg}">
<meta name="twitter:image:alt" content="${esc(t.og_image_alt)}">

<!-- ===== FAVICONS ===== -->
<link rel="icon" type="image/png" href="${root}favicon-96x96.png" sizes="96x96">
<link rel="icon" type="image/svg+xml" href="${root}favicon.svg">
<link rel="shortcut icon" href="${root}favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="${root}apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="Electropy">
<link rel="manifest" href="${root}site.webmanifest">

<!-- ===== PERFORMANCE ===== -->
<link rel="preload" as="image" href="${root}assets/images/preview.webp" fetchpriority="high">

<!-- ===== STYLES ===== -->
<link rel="stylesheet" href="${root}assets/css/fonts.css">
${c.dir === 'rtl' ? `<link rel="stylesheet" href="${root}assets/css/fonts-rtl.css">\n` : ''}<link rel="stylesheet" href="${root}assets/css/main.css">

<!-- ===== TEXTS (all 4 languages) ===== -->
<script src="${root}texts.js"></script>

<!-- ===== STRUCTURED DATA ===== -->
<script type="application/ld+json">
${jsonLd(lang, t)}
</script>`;
}

/* ---------- build pages ---------- */
const template = read('tools/template.html');
console.log('Building ElectroPy site…');

LANGS.forEach((lang) => {
  const c = SITE.langs[lang];
  const t = Object.assign({}, ALL.en, ALL[lang]);
  const root = c.path ? '../'.repeat(c.path.split('/').filter(Boolean).length) : './';
  const links = langLinks(lang, root);

  let html = template
    .replace('{{SEO_CONTENT}}', () => seoContent(root, links.sr))
    .replace('{{FAQ}}', () => faqSection(t))
    .replace(/\{\{LANG_HTML\}\}/g, () => links.html)
    .replace(/\{\{LANG_MOBILE\}\}/g, () => links.mobile)
    .replace(/\{\{LANG_SVG\}\}/g, () => links.svg);

  // direction-specific blocks
  const keep = c.dir === 'rtl' ? 'rtl' : 'ltr';
  const drop = c.dir === 'rtl' ? 'ltr' : 'rtl';
  html = html.replace(new RegExp('\\{\\{#' + drop + '\\}\\}[\\s\\S]*?\\{\\{/' + drop + '\\}\\}', 'g'), '');
  html = html.replace(new RegExp('\\{\\{#' + keep + '\\}\\}([\\s\\S]*?)\\{\\{/' + keep + '\\}\\}', 'g'), '$1');

  if (c.dir === 'rtl') {
    const a = html.indexOf('<main'), b = html.indexOf('</main>');
    html = html.slice(0, a) + rtlPass(html.slice(a, b)) + html.slice(b);
  }

  html = html
    .replace('{{HEAD}}', () => head(lang, t, root))
    .replace(/\{\{HTML_LANG\}\}/g, c.htmlLang)
    .replace(/\{\{DIR\}\}/g, c.dir)
    .replace(/\{\{LANG\}\}/g, lang)
    .replace(/\{\{ROOT\}\}/g, root)
    .replace(/\{\{TELEGRAM_URL\}\}/g, esc(SITE.links.telegram))
    .replace(/\{\{t:(\w+)\}\}/g, (m, k) => {
      if (t[k] === undefined) { console.warn('  ! missing text key:', k, '(' + lang + ')'); return ''; }
      return esc(t[k]);
    });

  const left = html.match(/\{\{[^}]*\}\}/g);
  if (left) console.warn('  ! unresolved placeholders:', left.slice(0, 5));
  write(c.path + 'index.html', html);
});

/* ---------- sitemap.xml ---------- */
const altXml = [];
LANGS.forEach((l) => SITE.langs[l].hreflang.forEach((h) => altXml.push(`    <xhtml:link rel="alternate" hreflang="${h}" href="${pageUrl(l)}"/>`)));
altXml.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(SITE.defaultLang)}"/>`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${LANGS.map((l) => `  <url>
    <loc>${pageUrl(l)}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${l === SITE.defaultLang ? '1.0' : '0.9'}</priority>
${altXml.join('\n')}
    <image:image>
      <image:loc>${BASE}assets/images/preview.webp</image:loc>
    </image:image>
  </url>`).join('\n')}
</urlset>
`);

/* ---------- robots.txt ---------- */
write('robots.txt', `# ElectroPy — ${BASE}
User-agent: *
Allow: /
Disallow: /tools/

Sitemap: ${BASE}sitemap.xml
`);

/* ---------- site.webmanifest ---------- */
write('site.webmanifest', JSON.stringify({
  name: 'ElectroPy — ' + ALL.en.schema_category,
  short_name: 'Electropy',
  description: ALL.en.meta_description,
  lang: 'en',
  dir: 'ltr',
  start_url: './',
  scope: './',
  icons: [
    { src: 'web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: 'web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: 'web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
  ],
  theme_color: '#ebe0ca',
  background_color: '#ebe0ca',
  display: 'standalone'
}, null, 2) + '\n');

console.log('Done.');
