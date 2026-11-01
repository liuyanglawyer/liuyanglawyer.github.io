/* ============================================================
   LB.md — Markdown 渲染（marked + highlight.js）
   ============================================================ */
(function (window) {
  'use strict';
  var U = window.LB.utils;

  /* ---------- 简易安全清洗：剔除脚本、事件属性、危险协议 ---------- */
  function sanitize(html) {
    return String(html)
      .replace(/<\s*(script|iframe|object|embed|link|style|form|input|button)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      .replace(/<\s*(script|iframe|object|embed|link|meta|base)[\s\S]*?\/?>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
      .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
  }

  /* ---------- 目录提取 ---------- */
  function extractToc(md) {
    var out = [];
    var lines = String(md).split('\n'), inFence = false;
    lines.forEach(function (line) {
      if (/^\s*```/.test(line)) { inFence = !inFence; return; }
      if (inFence) return;
      var m = line.match(/^(#{1,4})\s+(.+)$/);
      if (!m) return;
      var level = m[1].length;
      if (level < 2 || level > 3) return;
      out.push({ level: level, text: m[2].replace(/[*`_~]/g, '').trim(), id: U.slugify(m[2].replace(/[*`_~]/g, '')) });
    });
    return out;
  }

  /* ---------- 渲染器定制 ---------- */
  var seenIds = {};
  function resetSlugger() { seenIds = {}; }

  function configure() {
    if (!window.marked) return;
    var renderer = new window.marked.Renderer();

    /* 标题：生成目录可用的锚点 id */
    renderer.heading = function (text, level, raw) {
      var plain = String(raw || text).replace(/<[^>]*>/g, '').replace(/[*`_~]/g, '').trim();
      var id = U.slugify(plain);
      if (seenIds[id]) { seenIds[id]++; id = id + '-' + seenIds[id]; } else { seenIds[id] = 1; }
      return '<h' + level + ' id="' + id + '">' + text + '</h' + level + '>\n';
    };

    var origCode = renderer.code.bind(renderer);
    renderer.code = function (code, infostring, escaped) {
      var lang = String(infostring || '').match(/\S*/)[0];
      if (lang && window.hljs && window.hljs.getLanguage(lang)) {
        try {
          return '<pre><code class="hljs language-' + U.escapeHtml(lang) + '">' +
            window.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value + '</code></pre>';
        } catch (e) { /* falls through */ }
      }
      return origCode(code, infostring, escaped);
    };

    renderer.image = function (href, title, text) {
      var src = href === null ? '' : href;
      var alt = typeof text === 'string' ? text : (title || '图片');
      return '<img src="' + U.escapeHtml(src) + '" alt="' + U.escapeHtml(alt) + '" loading="lazy" />';
    };

    renderer.link = function (href, title, text) {
      var h = href === null ? '#' : href;
      var external = /^https?:/i.test(h);
      return '<a href="' + U.escapeHtml(h) + '"' +
        (title ? ' title="' + U.escapeHtml(title) + '"' : '') +
        (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
        (typeof text === 'string' ? text : '') + '</a>';
    };

    window.marked.setOptions({
      renderer: renderer,
      gfm: true,
      breaks: false,
      pedantic: false,
      smartypants: false,
      mangle: false,
      headerIds: false,
      langPrefix: 'language-'
    });
  }

  var configured = false;
  function ensureConfig() {
    if (configured) return;
    if (window.marked) { configure(); configured = true; }
  }

  var MD = {
    render: function (md) {
      ensureConfig();
      var src = String(md == null ? '' : md);
      if (!window.marked) return '<pre>' + U.escapeHtml(src) + '</pre>';
      var html;
      resetSlugger();
      try { html = window.marked.parse(src); }
      catch (e) { html = '<pre>' + U.escapeHtml(src) + '</pre>'; }
      return sanitize(html);
    },
    toc: extractToc,
    excerpt: function (md, len) { return U.stripMarkdown(md, len || 120); },
    words: U.countWords
  };

  window.LB.md = MD;
})(window);
