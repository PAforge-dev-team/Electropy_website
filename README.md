# ElectroPy website

Official website of **ElectroPy** by PAforge — https://electropy.paforge.ir/

| Language | URL | File |
|---|---|---|
| English | `/` | `index.html` |
| کوردی (Sorani) | `/ku/` | `ku/index.html` |
| فارسی | `/fa/` | `fa/index.html` |
| العربية | `/ar/` | `ar/index.html` |

## Editing texts

**Every text of all four languages lives in [`texts.js`](texts.js)** — visible texts, buttons, toasts,
aria-labels, and the SEO texts (title, description, keywords, social cards). Links (GitHub, download,
Telegram) and release info are in the `window.SITE` block at the top of the same file.

The pages read `texts.js` live, so an edit shows up immediately. To also refresh the pre-rendered HTML,
`<head>` SEO tags, JSON-LD, `sitemap.xml` and `robots.txt`, run once (Node.js, no dependencies):

```
node tools/build.js
```

## Structure

```
index.html, ku/, fa/, ar/     generated pages (do not edit by hand)
texts.js                      all texts + site config
assets/css/main.css           styles (LTR + RTL)
assets/css/fonts.css          embedded Latin fonts: Outfit, Nunito (OFL)
assets/css/fonts-rtl.css      embedded Arabic-script fonts for ku / fa / ar: Noto Kufi Arabic, Vazirmatn Round-Dots (OFL)
assets/js/main.js             behaviour, effects, resistor cursor, text fitting
assets/images/preview.webp    app preview
assets/og/                    social share images (1200×630) per language
tools/template.html           page template (edit layout here)
tools/build.js                generator
sitemap.xml, robots.txt, 404.html, site.webmanifest, CNAME
```

## Local test

Just open `index.html` in a browser — no server needed.

## FAQ section
The FAQ block (real HTML, below the download section) and its `FAQPage` structured data are generated
from the `faq_N_q` / `faq_N_a` keys in `texts.js`. Add `faq_7_q` / `faq_7_a` (in every language) and run
`node tools/build.js` to add a question.
