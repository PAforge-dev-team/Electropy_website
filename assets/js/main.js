/* ============================================================
   ELECTROPY — vanilla JS (shared by all language pages)
   Texts come from /texts.js  →  window.TEXTS (active language)
   ============================================================ */
(function() {
  'use strict';

  /* ============================================================
     🔗 LINKS
     ============================================================ */
  var SITE = window.SITE || {};
  var LINKS = SITE.links || {};
  var GITHUB_URL = LINKS.github || "https://github.com/PAforge-dev-team/Electropy";
  var DOWNLOAD_URL = LINKS.download || "https://github.com/PAforge-dev-team/Electropy/releases/download/Electropy/Electropy_V1.0.0+2Exts.zip";
  var TELEGRAM_URL = LINKS.telegram || "https://t.me/PAforge";
  var IS_RTL = document.documentElement.getAttribute('dir') === 'rtl';

  /* ---------- TEXT INJECTION (everything comes from texts.js) ---------- */
  var T = window.TEXTS || null;

  function applyTexts() {
    if (!T) return;
    document.querySelectorAll('[data-text]').forEach(function(el) {
      var key = el.getAttribute('data-text');
      if (T[key] !== undefined) {
        el.textContent = T[key];
      } else {
        console.warn('[texts.js] Missing key:', key);
      }
    });
    document.querySelectorAll('[data-aria]').forEach(function(el) {
      var key = el.getAttribute('data-aria');
      if (T[key] !== undefined) el.setAttribute('aria-label', T[key]);
    });
    document.querySelectorAll('[data-title]').forEach(function(el) {
      var key = el.getAttribute('data-title');
      if (T[key] !== undefined) el.setAttribute('title', T[key]);
    });
    document.querySelectorAll('[data-alt]').forEach(function(el) {
      var key = el.getAttribute('data-alt');
      if (T[key] !== undefined) el.setAttribute('alt', T[key]);
    });
    /* <head> texts */
    if (T.page_title) document.title = T.page_title;
    function setMeta(sel, val) {
      var m = document.head.querySelector(sel);
      if (m && val !== undefined) m.setAttribute('content', val);
    }
    setMeta('meta[name="description"]', T.meta_description);
    setMeta('meta[name="keywords"]', T.meta_keywords);
    setMeta('meta[property="og:title"]', T.og_title);
    setMeta('meta[property="og:description"]', T.og_description);
    setMeta('meta[property="og:image:alt"]', T.og_image_alt);
    setMeta('meta[name="twitter:title"]', T.og_title);
    setMeta('meta[name="twitter:description"]', T.og_description);
    setMeta('meta[name="twitter:image:alt"]', T.og_image_alt);
  }

  /* ---------- TEXT FITTING (keeps every language inside its box) ----------
     data-fit="N"     : shrink the font-size when the text is wider than N
     data-squeeze="N" : (LTR) condense the text to N, exactly like the
                        original textLength behaviour — but only when needed
     data-wrap="N"    : wrap the text on up to data-lines lines of width N
     data-flow="N"    : (mobile) free wrapping + reflow, see flowMobile()       */
  function fitOne(el, max) {
    el.style.fontSize = '';
    var len = el.getComputedTextLength();
    if (!len || len <= max) return;
    var fs = parseFloat(window.getComputedStyle(el).fontSize) || 14;
    el.style.fontSize = (Math.floor(fs * (max / len) * 100) / 100) + 'px';
  }
  function squeezeOne(el, max) {
    el.removeAttribute('textLength');
    el.removeAttribute('lengthAdjust');
    var len = el.getComputedTextLength();
    if (!len || len <= max) return;
    el.setAttribute('textLength', max);
    el.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
  function wrapOne(el) {
    var key = el.getAttribute('data-text');
    var str = (T && T[key] !== undefined) ? String(T[key]) : (el.getAttribute('data-full') || el.textContent);
    el.setAttribute('data-full', str);
    var max = parseFloat(el.getAttribute('data-wrap'));
    var lh = parseFloat(el.getAttribute('data-lh')) || 20;
    var maxLines = parseInt(el.getAttribute('data-lines'), 10) || 2;
    var x = el.getAttribute('x') || '0';
    var words = str.split(/\s+/).filter(Boolean);
    el.style.fontSize = '';
    el.textContent = str;
    if (!el.getComputedTextLength()) return;            /* hidden layout: keep plain text */
    var baseFs = parseFloat(window.getComputedStyle(el).fontSize) || 14;
    var lines = [str], scale = 1, tries = 0;
    while (tries++ < 12) {
      lines = []; var cur = '';
      for (var i = 0; i < words.length; i++) {
        var cand = cur ? cur + ' ' + words[i] : words[i];
        el.textContent = cand;
        if (cur && el.getComputedTextLength() > max) { lines.push(cur); cur = words[i]; }
        else { cur = cand; }
      }
      if (cur) lines.push(cur);
      var widest = 0;
      for (var j = 0; j < lines.length; j++) {
        el.textContent = lines[j];
        widest = Math.max(widest, el.getComputedTextLength());
      }
      if (lines.length <= maxLines && widest <= max) break;
      scale *= 0.94;
      el.style.fontSize = (baseFs * scale) + 'px';
    }
    el.textContent = '';
    lines.forEach(function(line, idx) {
      var ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      ts.setAttribute('x', x);
      if (idx > 0) ts.setAttribute('dy', lh);
      ts.textContent = line;
      el.appendChild(ts);
    });
  }
  /* ---------- MOBILE FLOW LAYOUT ----------
     The mobile artwork is an SVG with fixed coordinates. Texts marked with
     data-flow="N" are wrapped on as many lines of width N as they need
     (never squeezed, never cut). When a text needs more / fewer lines than
     the design reserved (data-lines), everything below it is moved and the
     panels around it are resized, so every language gets a clean layout.  */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var flowState = null;
  function num(el, a) { return parseFloat(el.getAttribute(a)) || 0; }
  function rrPath(x, y, w, h, tl, tr, br, bl) {
    var d = 'M' + (x + tl) + ' ' + y + ' H' + (x + w - tr);
    if (tr) d += ' A' + tr + ' ' + tr + ' 0 0 1 ' + (x + w) + ' ' + (y + tr);
    d += ' V' + (y + h - br);
    if (br) d += ' A' + br + ' ' + br + ' 0 0 1 ' + (x + w - br) + ' ' + (y + h);
    d += ' H' + (x + bl);
    if (bl) d += ' A' + bl + ' ' + bl + ' 0 0 1 ' + x + ' ' + (y + h - bl);
    d += ' V' + (y + tl);
    if (tl) d += ' A' + tl + ' ' + tl + ' 0 0 1 ' + (x + tl) + ' ' + y;
    return d + ' Z';
  }
  function flowInit(svg) {
    var vb = svg.getAttribute('viewBox').split(/[\s,]+/).map(parseFloat);
    var items = [];
    svg.querySelectorAll('rect, text, circle, line, path, polygon, polyline, ellipse, image, use').forEach(function(el) {
      if (el.closest('pattern, linearGradient, radialGradient, filter, symbol')) return;
      var tag = el.tagName.toLowerCase(), it = { el: el, tag: tag };
      var rr = el.getAttribute('data-rr');
      if (rr) {                       /* panel with individually rounded corners: x y w h tl tr br bl */
        it.rr = rr.split(' ').map(parseFloat); it.tag = 'rr';
        it.top = it.rr[1]; it.h = it.rr[3]; it.bottom = it.top + it.h;
      }
      else if (tag === 'rect') { it.top = num(el, 'y'); it.h = num(el, 'height'); it.bottom = it.top + it.h; }
      else if (tag === 'text') {
        var fs = parseFloat(el.getAttribute('font-size')) || 14;
        it.y = num(el, 'y'); it.top = it.y - fs * 0.8; it.bottom = it.y;
      }
      else if (tag === 'circle') { it.cy = num(el, 'cy'); it.top = it.cy - num(el, 'r'); it.bottom = it.cy + num(el, 'r'); }
      else if (tag === 'line') { it.y1 = num(el, 'y1'); it.y2 = num(el, 'y2'); it.top = Math.min(it.y1, it.y2); it.bottom = Math.max(it.y1, it.y2); }
      else {
        var bb; try { bb = el.getBBox(); } catch (e) { bb = { y: 0, height: 0 }; }
        var tm = /translate\(\s*[-\d.]+[\s,]+([-\d.]+)/.exec(el.getAttribute('transform') || '');
        var ty = tm ? parseFloat(tm[1]) : 0;
        it.top = bb.y + ty; it.bottom = it.top + bb.height;
        var g = document.createElementNS(SVG_NS, 'g');
        el.parentNode.insertBefore(g, el); g.appendChild(el);
        it.wrap = g;
      }
      items.push(it);
    });
    return { svg: svg, vb: vb, items: items };
  }
  function flowWrap(el) {
    var key = el.getAttribute('data-text'), join = el.getAttribute('data-join');
    var str = (T && T[key] !== undefined) ? String(T[key]) : (el.getAttribute('data-full') || el.textContent);
    if (join && T && T[join]) str += ' ' + String(T[join]);
    str = str.replace(/\s+/g, ' ').trim();
    el.setAttribute('data-full', str);
    var max = parseFloat(el.getAttribute('data-flow'));
    var lh = (parseFloat(el.getAttribute('data-lh')) || 20) * (IS_RTL ? 1.22 : 1);
    var x = el.getAttribute('x') || '0';
    var words = str.split(' ');
    el.style.fontSize = '';
    var baseFs = parseFloat(window.getComputedStyle(el).fontSize) || 14;
    function width(t) { el.textContent = t; return el.getComputedTextLength(); }
    /* a single word wider than the column: reduce the size a little */
    var widestWord = 0;
    words.forEach(function(w) { widestWord = Math.max(widestWord, width(w)); });
    if (widestWord > max) {
      var k = max / widestWord;
      el.style.fontSize = (Math.floor(baseFs * k * 100) / 100) + 'px';
      lh *= Math.max(k, 0.8);
    }
    function build(limit) {
      var out = [], cur = '';
      for (var i = 0; i < words.length; i++) {
        var cand = cur ? cur + ' ' + words[i] : words[i];
        if (cur && width(cand) > limit) { out.push(cur); cur = words[i]; }
        else cur = cand;
      }
      if (cur) out.push(cur);
      return out;
    }
    var lines = build(max);
    /* balance: narrow the column while the number of lines stays the same,
       so the last line is never a lonely word */
    if (lines.length > 1) {
      var lo = max * 0.55, hi = max;
      for (var n = 0; n < 7; n++) {
        var mid = (lo + hi) / 2;
        if (build(mid).length <= lines.length) hi = mid; else lo = mid;
      }
      lines = build(hi);
    }
    el.textContent = '';
    lines.forEach(function(line, idx) {
      var ts = document.createElementNS(SVG_NS, 'tspan');
      ts.setAttribute('x', x);
      if (idx > 0) ts.setAttribute('dy', Math.round(lh * 100) / 100);
      ts.textContent = line;
      el.appendChild(ts);
    });
    return { n: lines.length, lh: lh };
  }
  function flowMobile() {
    var svg = document.querySelector('.page-mobile > svg');
    if (!svg || !svg.getBoundingClientRect().width) return;      /* desktop layout is showing */
    if (!flowState) flowState = flowInit(svg);
    var st = flowState, cuts = [];
    svg.querySelectorAll('text[data-flow]').forEach(function(el) {
      var r = flowWrap(el);
      var dLines = parseInt(el.getAttribute('data-lines'), 10) || 1;
      var dLh = parseFloat(el.getAttribute('data-lh')) || 20;
      var extra = Math.round(r.n * r.lh - dLines * dLh);
      if (extra) cuts.push({ y: num(el, 'data-y0') || (function() {
        var y0 = parseFloat(el.getAttribute('y')) || 0;
        for (var i = 0; i < st.items.length; i++) if (st.items[i].el === el) { y0 = st.items[i].y; break; }
        y0 += (dLines - 1) * dLh + dLh * 0.3;
        el.setAttribute('data-y0', y0);
        return y0;
      })(), extra: extra });
    });
    var total = 0;
    cuts.forEach(function(c) { total += c.extra; });
    st.items.forEach(function(it) {
      var shift = 0, grow = 0;
      for (var i = 0; i < cuts.length; i++) {
        if (it.top >= cuts[i].y) shift += cuts[i].extra;
        else if (it.bottom > cuts[i].y) grow += cuts[i].extra;
      }
      var el = it.el;
      if (it.tag === 'rr') el.setAttribute('d', rrPath(it.rr[0], it.top + shift, it.rr[2], Math.max(0, it.h + grow), it.rr[4], it.rr[5], it.rr[6], it.rr[7]));
      else if (it.tag === 'rect') { el.setAttribute('y', it.top + shift); el.setAttribute('height', Math.max(0, it.h + grow)); }
      else if (it.tag === 'text') el.setAttribute('y', it.y + shift);
      else if (it.tag === 'circle') el.setAttribute('cy', it.cy + shift);
      else if (it.tag === 'line') { el.setAttribute('y1', it.y1 + shift); el.setAttribute('y2', it.y2 + shift); }
      else if (it.wrap) {
        if (shift) it.wrap.setAttribute('transform', 'translate(0 ' + shift + ')');
        else it.wrap.removeAttribute('transform');
      }
    });
    svg.setAttribute('viewBox', st.vb[0] + ' ' + st.vb[1] + ' ' + st.vb[2] + ' ' + (st.vb[3] + total));
  }
  function fitTexts() {
    document.querySelectorAll('[data-wrap]').forEach(wrapOne);
    document.querySelectorAll('[data-fit]').forEach(function(el) {
      fitOne(el, parseFloat(el.getAttribute('data-fit')));
    });
    document.querySelectorAll('[data-squeeze]').forEach(function(el) {
      var max = parseFloat(el.getAttribute('data-squeeze'));
      if (IS_RTL) fitOne(el, max); else squeezeOne(el, max);
    });
    flowMobile();
  }

  applyTexts();
  fitTexts();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitTexts);
  }
  window.addEventListener('load', fitTexts);
  var fitTimer = null, lastFitWidth = window.innerWidth;
  window.addEventListener('resize', function() {
    if (window.innerWidth === lastFitWidth) return;
    lastFitWidth = window.innerWidth;
    if (fitTimer) clearTimeout(fitTimer);
    fitTimer = setTimeout(fitTexts, 120);
  });

  /* ---------- LANGUAGE LINKS ----------
     On a server the links are clean folders ( ./fa/ ). When the site is
     opened straight from disk (file://) folders do not resolve to their
     index.html, so add it — this makes local testing work everywhere. */
  if (window.location.protocol === 'file:') {
    document.querySelectorAll('a[data-lang-link]').forEach(function(a) {
      var href = a.getAttribute('href') || '';
      if (!/index\.html$/.test(href)) {
        a.setAttribute('href', href.replace(/\/?$/, '/') + 'index.html');
      }
    });
  }

  var isTouchDevice =
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  var hoverFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- LOADER ---------- */
  var loader = document.getElementById('loader');
  function hideLoader() {
    if (!loader.classList.contains('hidden')) {
      loader.classList.add('hidden');
      document.body.classList.add('loaded');
    }
  }
  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 600);
  } else {
    window.addEventListener('load', function() {
      setTimeout(hideLoader, 600);
    });
  }
  setTimeout(hideLoader, 2200);

  /* ---------- TOAST ---------- */
  var toast = document.getElementById('toast');
  var toastMessage = document.getElementById('toastMessage');
  var toastTimer = null;
  function showToast(msg) {
    toastMessage.textContent = msg;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      toast.classList.remove('show');
    }, 2600);
  }

  /* ---------- MENU ---------- */
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  var mobileBackdrop = document.getElementById('mobileBackdrop');
  var menuOpen = false;

  function toggleMenu() {
    menuOpen = !menuOpen;
    hamburger.classList.toggle('open', menuOpen);
    mobileMenu.classList.toggle('open', menuOpen);
    mobileBackdrop.classList.toggle('open', menuOpen);
    mobileMenu.setAttribute('aria-hidden', !menuOpen);
    document.body.classList.toggle('menu-open', menuOpen);
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    mobileBackdrop.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', true);
    document.body.classList.remove('menu-open');
  }
  hamburger.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleMenu();
  });
  mobileBackdrop.addEventListener('click', closeMenu);

  /* ---------- NAVIGATION ---------- */
  function navigateTo(section) {
    closeMenu();
    if (section === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    var targets = document.querySelectorAll('[data-section-target="' + section + '"]');
    var top = 0;
    var found = false;
    targets.forEach(function(el) {
      if (found) return;
      var rect = el.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        found = true;
        top = rect.top + window.scrollY;
      }
    });
    if (!found) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    var offset = window.innerWidth <= 880 ? 74 : 88;
    window.scrollTo({ top: Math.max(0, top - offset), behavior: 'smooth' });
  }

  /* ---------- ACTIONS ---------- */
  function handleScrollToDownload() {
    navigateTo('download');
    setTimeout(function() {
      var els = document.querySelectorAll('.dl-pulse');
      els.forEach(function(el) { el.classList.add('pulse'); });
      setTimeout(function() {
        els.forEach(function(el) { el.classList.remove('pulse'); });
      }, 1700);
    }, 600);
  }

  function handleActualDownload() {
    var els = document.querySelectorAll('.dl-pulse');
    els.forEach(function(el) { el.classList.add('pulse'); });
    setTimeout(function() {
      els.forEach(function(el) { el.classList.remove('pulse'); });
    }, 1700);
    showToast(T && T.toast_downloading ? T.toast_downloading : 'Starting download...');
    window.location.href = DOWNLOAD_URL;
  }

  function handleVisitGithub() {
    showToast(T && T.toast_visit_github ? T.toast_visit_github : 'Opening GitHub repository...');
    window.open(GITHUB_URL, '_blank', 'noopener');
  }

  function handleTelegram() {
    showToast(T && T.toast_telegram ? T.toast_telegram : 'Opening Telegram channel...');
    window.open(TELEGRAM_URL, '_blank', 'noopener');
  }

  function handleLang() {
    showToast(T && T.toast_lang ? T.toast_lang : 'Kurdish UI will be available inside the app.');
  }

  /* ---------- EVENT DELEGATION ---------- */
  document.addEventListener('click', function(e) {
    var navEl = e.target.closest ? e.target.closest('[data-nav]') : null;
    if (navEl) {
      e.preventDefault();
      navigateTo(navEl.getAttribute('data-nav'));
      return;
    }
    var actionEl = e.target.closest ? e.target.closest('[data-action]') : null;
    if (actionEl) {
      e.preventDefault();
      var action = actionEl.getAttribute('data-action');
      if (action === 'download') { handleActualDownload(); }
      if (action === 'scroll-download') { handleScrollToDownload(); }
      if (action === 'github') { handleVisitGithub(); }
      if (action === 'telegram') { handleTelegram(); }
      if (action === 'lang') { handleLang(); }
      if (action === 'explore') { navigateTo('features'); }
    }
  });

  /* ---------- HEADER / SCROLL PROGRESS ---------- */
  var stickyHeader = document.getElementById('stickyHeader');
  var scrollProgress = document.getElementById('scrollProgress');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function() {
      var isMobile = window.innerWidth <= 880 || isTouchDevice;
      stickyHeader.classList.toggle('visible', isMobile || window.scrollY > 400);
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      scrollProgress.style.width = pct + '%';
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- REVEAL ---------- */
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.reveal').forEach(function(el) {
    observer.observe(el);
  });

  /* ============================================================
     RESISTOR CURSOR
     ============================================================ */
  if (!isTouchDevice) {
    var canvas = document.getElementById('resistorStage');
    var ctx = canvas.getContext('2d');
    var resistorEl = document.getElementById('resistorBody');
    var shadowEl = document.getElementById('resistorShadow');

    var W, H;
    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    var mouse = { x: W / 2, y: H / 2 };
    function setMouse(x, y) { mouse.x = x; mouse.y = y; }

    var IDLE_TIMEOUT = 3000;
    var idleTimer = null;
    var cursorVisible = false;

    function showCursor() {
      if (!cursorVisible) {
        cursorVisible = true;
        canvas.classList.add('active');
        resistorEl.classList.add('active');
        shadowEl.classList.add('active');
      }
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(hideCursor, IDLE_TIMEOUT);
    }
    function hideCursor() {
      cursorVisible = false;
      canvas.classList.remove('active');
      resistorEl.classList.remove('active');
      shadowEl.classList.remove('active');
    }

    window.addEventListener('mousemove', function(e) {
      setMouse(e.clientX, e.clientY);
      showCursor();
    });
    window.addEventListener('mousedown', showCursor);
    window.addEventListener('click', showCursor);
    window.addEventListener('scroll', showCursor, { passive: true });
    window.addEventListener('wheel', showCursor, { passive: true });
    window.addEventListener('keydown', showCursor);

    var body = { x: W / 2, y: H / 2, heading: 0 };
    var distanceTraveled = 0;

    var CAPSULE_HALF_LEN = 18;
    var CAPSULE_RADIUS = 7.5;
    var LEG_UPPER = 11;
    var LEG_LOWER = 12;
    var ALONG_OFFSETS = [15, -1, -17];
    var BASE_SIDE = CAPSULE_RADIUS * 0.95;
    var STEP_FORWARD = 6.5;
    var OUTWARD = 9;
    var STEP_FREQ = 1 / 52;
    var IDLE_CREEP = 0.10;

    var legs = [];
    ALONG_OFFSETS.forEach(function(along, segIndex) {
      [-1, 1].forEach(function(side) {
        var sideIndex = side === 1 ? 0 : 1;
        var group = (segIndex + sideIndex) % 2;
        legs.push({
          along: along, side: side,
          phaseOffset: group * 0.5,
          state: 'stance',
          footX: null, footY: null,
          swingFromX: 0, swingFromY: 0, swingToX: 0, swingToY: 0
        });
      });
    });

    function twoBoneIK(bx, by, fx, fy, l1, l2, bendSign, bendScale) {
      var dx = fx - bx, dy = fy - by;
      var d = Math.hypot(dx, dy) || 0.0001;
      var maxReach = l1 + l2 - 0.5;
      if (d > maxReach) { dx = (dx / d) * maxReach; dy = (dy / d) * maxReach; d = maxReach; }
      var a = Math.min(l1, Math.max(-l2, (l1 * l1 - l2 * l2 + d * d) / (2 * d)));
      var h = Math.sqrt(Math.max(0, l1 * l1 - a * a)) * bendScale;
      var mx = bx + (dx / d) * a, my = by + (dy / d) * a;
      var px = -dy / d, py = dx / d;
      return { kx: mx + px * h * bendSign, ky: my + py * h * bendSign, fx: bx + dx, fy: by + dy };
    }

    function lerp(a, b, t) { return a + (b - a) * t; }
    function smoothstep(t) { return t * t * (3 - 2 * t); }

    var lastX = body.x, lastY = body.y;
    var resistorHalfW = resistorEl.offsetWidth / 2;
    var resistorHalfH = resistorEl.offsetHeight / 2;
    var shadowHalfW = shadowEl.offsetWidth / 2;
    var shadowHalfH = shadowEl.offsetHeight / 2;
    var SHADOW_DROP = 6;

    function animate() {
      var ease = 0.15;
      body.x += (mouse.x - body.x) * ease;
      body.y += (mouse.y - body.y) * ease;

      var dx = body.x - lastX, dy = body.y - lastY;
      var speed = Math.hypot(dx, dy);
      lastX = body.x; lastY = body.y;

      if (speed > 0.05) {
        var targetHeading = Math.atan2(dy, dx);
        var diff = targetHeading - body.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        body.heading += diff * 0.16;
      }

      distanceTraveled += speed + IDLE_CREEP;

      var fx = Math.cos(body.heading), fy = Math.sin(body.heading);
      var nx = -fy, ny = fx;

      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.strokeStyle = 'rgba(210, 210, 215, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(body.x - fx * (CAPSULE_HALF_LEN + 11), body.y - fy * (CAPSULE_HALF_LEN + 11));
      ctx.lineTo(body.x - fx * (CAPSULE_HALF_LEN - 3), body.y - fy * (CAPSULE_HALF_LEN - 3));
      ctx.moveTo(body.x + fx * (CAPSULE_HALF_LEN - 3), body.y + fy * (CAPSULE_HALF_LEN - 3));
      ctx.lineTo(body.x + fx * (CAPSULE_HALF_LEN + 11), body.y + fy * (CAPSULE_HALF_LEN + 11));
      ctx.stroke();

      legs.forEach(function(leg) {
        var baseX = body.x + fx * leg.along + nx * BASE_SIDE * leg.side;
        var baseY = body.y + fy * leg.along + ny * BASE_SIDE * leg.side;
        var landX = baseX + fx * STEP_FORWARD + nx * OUTWARD * leg.side;
        var landY = baseY + fy * STEP_FORWARD + ny * OUTWARD * leg.side;

        var t = (distanceTraveled * STEP_FREQ + leg.phaseOffset) % 1;
        var isSwing = t >= 0.5;

        if (leg.footX === null) { leg.footX = landX; leg.footY = landY; }

        if (isSwing && leg.state !== 'swing') {
          leg.state = 'swing';
          leg.swingFromX = leg.footX; leg.swingFromY = leg.footY;
        }
        if (!isSwing) leg.state = 'stance';

        if (leg.state === 'swing') {
          var p = smoothstep((t - 0.5) * 2);
          leg.swingToX = landX; leg.swingToY = landY;
          leg.footX = lerp(leg.swingFromX, leg.swingToX, p);
          leg.footY = lerp(leg.swingFromY, leg.swingToY, p);
        }

        var bendScale = leg.state === 'swing' ? 1.35 : 0.75;
        var bend = twoBoneIK(baseX, baseY, leg.footX, leg.footY, LEG_UPPER, LEG_LOWER, leg.side, bendScale);

        var alpha = leg.state === 'swing' ? 0.9 : 0.5;
        ctx.strokeStyle = 'rgba(130, 230, 200, ' + alpha + ')';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(bend.kx, bend.ky);
        ctx.lineTo(bend.fx, bend.fy);
        ctx.stroke();

        if (leg.state === 'stance') {
          ctx.beginPath();
          ctx.arc(leg.footX, leg.footY, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(130, 230, 200, 0.6)';
          ctx.fill();
        }
      });

      shadowEl.style.transform =
        'translate(' + (body.x - shadowHalfW) + 'px, ' + (body.y + SHADOW_DROP - shadowHalfH) + 'px) rotate(' + body.heading + 'rad)';
      resistorEl.style.transform =
        'translate(' + (body.x - resistorHalfW) + 'px, ' + (body.y - resistorHalfH) + 'px) rotate(' + body.heading + 'rad)';

      requestAnimationFrame(animate);
    }
    animate();
  }

  /* ---------- CLICK RIPPLE ---------- */
  function createRipple(x, y, touch) {
    var ripple = document.createElement('div');
    ripple.className = 'click-ripple' + (touch ? ' touch' : '');
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    document.body.appendChild(ripple);
    setTimeout(function() { ripple.remove(); }, 900);
  }
  if (!isTouchDevice) {
    document.addEventListener('pointerdown', function(e) {
      createRipple(e.clientX, e.clientY, false);
    });
  }

  /* ---------- KEYBOARD ---------- */
  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (menuOpen) closeMenu();
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* ---------- BUTTONS ---------- */
  document.getElementById('brandBtn').addEventListener('click', function() {
    navigateTo('home');
  });
  document.getElementById('headerGithubBtn').addEventListener('click', handleVisitGithub);
  document.getElementById('mobileGithubBtn').addEventListener('click', handleVisitGithub);

  var headerTg = document.getElementById('headerTelegramBtn');
  if (headerTg) headerTg.addEventListener('click', handleTelegram);
  var mobileTg = document.getElementById('mobileTelegramBtn');
  if (mobileTg) mobileTg.addEventListener('click', function() {
    closeMenu();
  });
  var footerTgD = document.getElementById('footerTelegramBtn');
  if (footerTgD) footerTgD.addEventListener('click', handleTelegram);
  var footerTgM = document.getElementById('footerTelegramBtnM');
  if (footerTgM) footerTgM.addEventListener('click', handleTelegram);

  /* ---------- RESIZE (close menu) ---------- */
  window.addEventListener('resize', function() {
    if (window.innerWidth > 880) closeMenu();
  });

})();
