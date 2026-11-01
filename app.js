/* ============================================================
   LB.app — 路由引导、导航与页脚
   ============================================================ */
(function (window) {
  'use strict';
  var U = window.LB.utils, CFG = window.LB.config, Views = window.LB.views, Admin = window.LB.admin, Store = window.LB.store;
  var App = {};

  /* ---------- 路由解析 ---------- */
  function parseHash() {
    var raw = (location.hash || '#/').replace(/^#/, '');
    if (raw.charAt(0) !== '/') raw = '/' + raw;
    var qi = raw.indexOf('?');
    var query = {};
    if (qi >= 0) {
      raw.slice(qi + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var pair = kv.split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent((pair[1] || '').replace(/\+/g, ' '));
      });
      raw = raw.slice(0, qi);
    }
    var segs = raw.split('/').filter(Boolean).map(function (s) {
      try { return decodeURIComponent(s); } catch (e) { return s; }
    });
    return { segs: segs, query: query, path: '/' + segs.join('/') };
  }

  /* ---------- 页头 ---------- */
  function buildHeader(r) {
    var nav = U.$('.nav');
    var links = [['#/', '首页'], ['#/tags', '全部文章'], ['#/category/' + encodeURIComponent('交流活动'), '交流活动'], ['#/about', '关于律师'], ['#/admin', '管理']];
    var active = '';
    if (r.segs[0] === 'category' && r.segs[1] && decodeURIComponent(r.segs[1]) === '交流活动') active = links[2][0];
    else if (r.segs[0] === 'post' || r.segs[0] === 'tag' || r.segs[0] === 'category' || r.segs[0] === 'tags') active = '#/tags';
    else if (r.segs[0] === 'about') active = '#/about';
    else if (r.segs[0] === 'admin') active = '#/admin';
    else active = '#/';
    U.mount(nav, links.map(function (l) {
      return U.el('a', { class: l[0] === active ? 'is-active' : '', href: l[0], text: l[1] });
    }));
    U.$('.brand-title').textContent = CFG.get('siteName');
    U.$('.brand-sub').textContent = CFG.get('siteSub');
    U.$('.brand-mark').textContent = CFG.get('logoText') || '律';
    document.title = CFG.get('siteName');
  }

  /* ---------- 状态条 ---------- */
  function buildStatus() {
    var strip = U.$('.status-strip');
    if (!strip) return;
    var inner = U.$('.wrap', strip);
    var c = CFG.cloud();
    if (Store.isCloud()) {
      strip.className = 'status-strip cloud';
      U.mount(inner, [U.el('span', { text: '● 已接入云端：' + c.envId + ' · 云数据库 ' + c.collection + ' · 云存储 ' + c.storagePath })]);
    } else {
      strip.className = 'status-strip';
      U.mount(inner, [
        U.el('span', { text: '演示数据模式：文章保存在本机浏览器。接入云端后可切换为云数据库 + 云存储。' }),
        (function () {
          var b = U.el('button', { text: '去接入' });
          b.addEventListener('click', function () { App.go('#/admin/cloud'); });
          return b;
        })()
      ]);
    }
  }

  /* ---------- 渲染主体 ---------- */
  var mainEl = null;

  function route() {
    if (!mainEl) mainEl = U.$('#main');
    var r = parseHash();
    buildHeader(r);
    buildStatus();

    U.mount(mainEl, [U.el('div', { class: 'empty', text: '加载中…' })]);
    window.scrollTo(0, 0);

    var p;
    if (r.segs[0] === 'post' && r.segs[1]) p = Views.post(r.segs[1]);
    else if (r.segs[0] === 'tag' && r.segs[1]) p = Views.tag(r.segs[1], r.query);
    else if (r.segs[0] === 'category' && r.segs[1]) p = Views.category(r.segs[1]);
    else if (r.segs[0] === 'tags') p = Views.tags();
    else if (r.segs[0] === 'about') p = Views.about();
    else if (r.segs[0] === 'admin') {
      var sub = r.segs[1] || '';
      if (sub === 'edit' && r.segs[2]) {
        p = Store.getUserAsync().then(function (u) {
          return u ? Admin.editor(r.segs[2]).then(function (node) {
            // 编辑器嵌套在后台框架中
            var wrap = U.el('div', {});
            wrap.appendChild(U.el('div', { class: 'admin-wrap', style: 'padding-top:32px' }, [
              U.el('div', { class: 'toolbar-row' }, [
                U.el('a', { class: 'btn btn-ghost btn-sm', href: '#/admin', text: '← 返回列表' }),
                U.el('span', { style: 'font-size:13.5px;color:var(--ink-3)', text: '正在编辑：' + r.segs[2] })
              ]),
              node
            ]));
            return wrap;
          }) : Admin.render('');
        });
      } else {
        p = Admin.render(sub);
      }
    }
    else p = Views.home(r.query);

    p.then(function (node) {
      U.mount(mainEl, [node]);
      if (window.hljs && window.hljs.highlightElement) {
        U.$$('pre code', mainEl).forEach(function (b) {
          if (b.className.indexOf('hljs') < 0) { try { window.hljs.highlightElement(b); } catch (e) { } }
        });
      }
      document.title = CFG.get('siteName');
    }).catch(function (e) {
      U.mount(mainEl, [Views.notFound('页面加载失败：' + (e.message || e))]);
    });
  }

  App.go = function (hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  };
  App.reload = function () { route(); };

  App.boot = function () {
    Store.init().then(function (mode) {
      route();
      window.addEventListener('hashchange', route);

      /* 移动端菜单 */
      var tgl = U.$('.nav-toggle');
      if (tgl) tgl.addEventListener('click', function () { U.$('.nav').classList.toggle('open'); });

      if (mode === 'local' && CFG.cloud().enabled && CFG.cloud().envId) {
        U.toast('云端连接失败，已降级为本地模式', 'err', 4000);
      }
    }).catch(function (e) {
      route();
      U.toast('初始化异常：' + e.message, 'err', 5000);
    });
  };

  window.LB.app = App;
  window.addEventListener('DOMContentLoaded', App.boot);
})(window);
