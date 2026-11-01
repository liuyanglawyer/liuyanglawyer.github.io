/* ============================================================
   LB.utils — 通用工具
   ============================================================ */
(function (window) {
  'use strict';

  var U = {};

  /* ---------- DOM ---------- */
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  U.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  };

  U.escapeHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  U.clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); };

  U.mount = function (node, children) {
    U.clear(node);
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number'
        ? document.createTextNode(String(c)) : c);
    });
    return node;
  };

  /* ---------- Toast ---------- */
  U.toast = function (msg, type, ms) {
    var host = U.$('.toast-host') || (function () {
      var d = U.el('div', { class: 'toast-host' });
      document.body.appendChild(d);
      return d;
    })();
    var t = U.el('div', { class: 'toast' + (type === 'err' ? ' err' : ''), text: msg });
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = '.25s'; t.style.opacity = '0'; t.style.transform = 'translateX(24px)';
      setTimeout(function () { t.remove(); }, 260);
    }, ms || 2600);
  };

  /* ---------- 字符串 ---------- */
  U.slugify = function (s) {
    var out = String(s || '').trim().toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\p{L}\p{N}\-]+/gu, '-')
      .replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
    return out || ('p-' + Date.now().toString(36));
  };

  U.uid = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  U.stripMarkdown = function (md, len) {
    var t = String(md || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/[*_~>]+/g, '')
      .replace(/^\s*[-+*]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\|/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return len && t.length > len ? t.slice(0, len).trim() + '…' : t;
  };

  U.countWords = function (md) {
    var t = U.stripMarkdown(md);
    var cjk = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
    var en = (t.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
    return cjk + en;
  };

  /* ---------- 日期 ---------- */
  U.fmtDate = function (iso, style) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0, 10);
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    if (style === 'long') return d.getFullYear() + '年' + d.getMonth() + 1 + '月' + d.getDate() + '日';
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };

  U.relTime = function (iso) {
    var diff = Date.now() - new Date(iso).getTime();
    if (isNaN(diff)) return '';
    var m = 60000, h = 3600000, day = 86400000;
    if (diff < 0) return U.fmtDate(iso);
    if (diff < m) return '刚刚';
    if (diff < h) return Math.floor(diff / m) + ' 分钟前';
    if (diff < day) return Math.floor(diff / h) + ' 小时前';
    if (diff < day * 30) return Math.floor(diff / day) + ' 天前';
    return U.fmtDate(iso);
  };

  U.readingTime = function (md) {
    var n = U.countWords(md);
    return Math.max(1, Math.round(n / 350));
  };

  /* ---------- 本地存储（localStorage 不可用时退化为内存存储） ---------- */
  var memory = {};
  var hasLocal = (function () {
    try {
      var k = '__lb_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  var LS = {
    ok: hasLocal,
    get: function (k, dflt) {
      try {
        var v = hasLocal ? window.localStorage.getItem(k) : memory[k];
        return v === null || v === undefined ? dflt : JSON.parse(v);
      } catch (e) { return dflt; }
    },
    set: function (k, v) {
      try {
        var s = JSON.stringify(v);
        if (hasLocal) window.localStorage.setItem(k, s); else memory[k] = s;
        return true;
      } catch (e) { U.toast('本地存储写入失败：' + e.message, 'err'); return false; }
    },
    del: function (k) {
      try {
        if (hasLocal) window.localStorage.removeItem(k); else delete memory[k];
      } catch (e) { }
    }
  };
  U.LS = LS;

  /* ---------- IndexedDB：本地附件仓库 ---------- */
  var IDB = (function () {
    var DB_NAME = 'lb_blog_assets', STORE = 'files', dbPromise = null;

    function open() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise(function (resolve, reject) {
        if (!window.indexedDB) return reject(new Error('IndexedDB 不可用'));
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
      return dbPromise;
    }

    function tx(mode) {
      return open().then(function (db) {
        return db.transaction(STORE, mode).objectStore(STORE);
      });
    }

    return {
      put: function (rec) {
        return tx('readwrite').then(function (s) {
          return new Promise(function (res, rej) {
            var r = s.put(rec); r.onsuccess = function () { res(rec); }; r.onerror = function () { rej(r.error); };
          });
        });
      },
      get: function (id) {
        return tx('readonly').then(function (s) {
          return new Promise(function (res, rej) {
            var r = s.get(id); r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
          });
        });
      },
      all: function () {
        return tx('readonly').then(function (s) {
          return new Promise(function (res, rej) {
            var r = s.getAll(); r.onsuccess = function () { res(r.result || []); }; r.onerror = function () { rej(r.error); };
          });
        });
      },
      del: function (id) {
        return tx('readwrite').then(function (s) {
          return new Promise(function (res, rej) {
            var r = s.delete(id); r.onsuccess = function () { res(true); }; r.onerror = function () { rej(r.error); };
          });
        });
      }
    };
  })();
  U.IDB = IDB;

  /* ---------- 文件读取 ---------- */
  U.fileToDataUrl = function (file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsDataURL(file);
    });
  };

  U.fmtBytes = function (n) {
    if (!n && n !== 0) return '';
    var u = ['B', 'KB', 'MB', 'GB'], i = 0;
    n = Number(n);
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n : n.toFixed(1)) + ' ' + u[i];
  };

  /* ---------- 图片压缩 ---------- */
  U.compressImage = function (file, maxSide, quality) {
    if (!/^image\//.test(file.type) || /svg|gif/.test(file.type)) return Promise.resolve(file);
    return U.fileToDataUrl(file).then(function (url) {
      return new Promise(function (res) {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height, max = maxSide || 1600;
          if (w <= max && h <= max) return res(file);
          var scale = Math.min(max / w, max / h);
          var c = document.createElement('canvas');
          c.width = Math.round(w * scale); c.height = Math.round(h * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (b) {
            if (b && b.size < file.size) {
              res(new File([b], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
            } else res(file);
          }, 'image/jpeg', quality || 0.86);
        };
        img.onerror = function () { res(file); };
        img.src = url;
      });
    });
  };

  U.debounce = function (fn, ms) {
    var t; return function () {
      var args = arguments, self = this;
      clearTimeout(t); t = setTimeout(function () { fn.apply(self, args); }, ms || 250);
    };
  };

  window.LB = window.LB || {};
  window.LB.utils = U;
})(window);
