/* ============================================================
   LB.store — 统一数据层
   · 云端模式：腾讯云开发 CloudBase（云数据库 + 云存储 + 登录认证）
   · 本地模式：localStorage（文章）+ IndexedDB（图片附件）离线降级
   两种模式对外暴露完全一致的 API。
   ============================================================ */
(function (window) {
  'use strict';

  var U = window.LB.utils, CFG = window.LB.config, LS = U.LS, IDB = U.IDB;
  var POSTS_KEY = 'lb_posts_v5', ASSET_KEY = 'lb_assets_meta_v1', SESSION_KEY = 'lb_session_v1';

  /* ---------------- 规范化 ---------------- */
  function norm(p, idx) {
    var now = new Date().toISOString();
    var body = String((p && p.content) || '');
    return {
      id: String((p && (p.id || p._id)) || (p && p.slug) || U.uid()),
      _id: p && p._id ? p._id : undefined,
      slug: String((p && p.slug) || U.slugify((p && p.title) || '')),
      title: String((p && p.title) || '未命名文章'),
      summary: String((p && (p.summary || p.excerpt)) || U.stripMarkdown(body, 130)),
      content: body,
      tags: Array.isArray(p && p.tags) ? p.tags.filter(Boolean) : ((p && p.tags) ? String(p.tags).split(/[,，\s]+/).filter(Boolean) : []),
      category: String((p && p.category) || '实务笔记'),
      cover: (p && p.cover) || '',
      author: (p && p.author) || CFG.get('lawyerName') || '刘洋',
      status: (p && p.status) === 'draft' ? 'draft' : 'published',
      pinned: !!(p && p.pinned),
      views: Number((p && p.views) || 0),
      createdAt: (p && (p.createdAt || p.date)) || now,
      updatedAt: (p && p.updatedAt) || (p && (p.createdAt || p.date)) || now,
      source: p && p.source ? p.source : undefined
    };
  }

  /* ---------------- 状态 ---------------- */
  var state = { mode: 'local', ready: false, app: null, auth: null, db: null, user: null, error: '' };

  /* ---------------- 本地实现 ---------------- */
  var Local = {
    all: function () {
      var raw = LS.get(POSTS_KEY, null);
      if (!raw) {
        var seed = (window.LB.seed || []).map(norm);
        LS.set(POSTS_KEY, seed);
        return seed;
      }
      return raw.map(norm);
    },
    write: function (list) { return LS.set(POSTS_KEY, list); },
    list: function (q) {
      var all = Local.all();
      return filter(all, q);
    },
    get: function (key) {
      return Local.all().filter(function (p) { return p.slug === key || p.id === key; })[0] || null;
    },
    upsert: function (post) {
      var all = Local.all(), i = -1;
      all.forEach(function (p, k) { if (p.id === post.id || p.slug === post.slug) i = k; });
      post.updatedAt = new Date().toISOString();
      post.source = 'local';
      if (i >= 0) {
        var merged = norm(Object.assign({}, all[i], post, { id: all[i].id, createdAt: all[i].createdAt }));
        all[i] = merged;
      } else {
        post.createdAt = post.createdAt || new Date().toISOString();
        all.unshift(post);
      }
      Local.write(all);
      return true;
    },
    remove: function (id) {
      var all = Local.all().filter(function (p) { return p.id !== id && p.slug !== id; });
      Local.write(all);
      return true;
    },
    upload: function (file) {
      return U.compressImage(file, 1600, 0.86).then(U.fileToDataUrl).then(function (url) {
        var rec = {
          id: U.uid(), name: file.name, size: file.size, type: file.type,
          url: url, createdAt: new Date().toISOString()
        };
        return IDB.put(rec).then(function () {
          syncAssetMeta(rec);
          return { url: rec.url, id: rec.id, name: rec.name, size: rec.size, fileID: rec.id };
        }).catch(function () {
          // IndexedDB 不可用时退回 dataURL 直插（小文件）
          return { url: url, id: rec.id, name: rec.name, size: rec.size, fileID: rec.id };
        });
      });
    },
    assets: function () {
      return IDB.all().catch(function () { return LS.get(ASSET_KEY, []); }).then(function (list) {
        return (list || []).sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; });
      });
    },
    removeAsset: function (id) {
      return IDB.del(id).catch(function () { }).then(function () {
        LS.set(ASSET_KEY, LS.get(ASSET_KEY, []).filter(function (a) { return a.id !== id; }));
        return true;
      });
    }
  };

  function syncAssetMeta(rec) {
    var meta = LS.get(ASSET_KEY, []);
    meta.unshift({ id: rec.id, name: rec.name, size: rec.size, type: rec.type, createdAt: rec.createdAt });
    LS.set(ASSET_KEY, meta.slice(0, 200));
  }

  /* ---------------- 通用筛选 ---------------- */
  function filter(list, q) {
    q = q || {};
    var out = list.filter(function (p) {
      if (!q.includeDraft && p.status !== 'published') return false;
      if (q.tag && p.tags.indexOf(q.tag) < 0) return false;
      if (q.category && p.category !== q.category) return false;
      if (q.status && p.status !== q.status) return false;
      if (q.keyword) {
        var kw = q.keyword.toLowerCase();
        var hay = (p.title + ' ' + p.summary + ' ' + p.content + ' ' + p.tags.join(' ') + ' ' + p.category).toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });
    out.sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      var t = new Date(b.createdAt) - new Date(a.createdAt);
      return t || (a.id < b.id ? -1 : 1);
    });
    var total = out.length;
    if (q.size) {
      var page = Math.max(1, Number(q.page) || 1);
      out = out.slice((page - 1) * q.size, page * q.size);
    }
    return { list: out, total: total, page: Number(q.page) || 1, size: q.size || total, pages: q.size ? Math.ceil(total / q.size) : 1 };
  }

  /* ---------------- 云端实现（CloudBase） ---------------- */
  var Cloud = {
    /* 按需加载 SDK：只有切换到云端模式时才会下载 cloudbase.full.js */
    loadSdk: function () {
      if (window.cloudbase) return Promise.resolve(window.cloudbase);
      if (Cloud.__sdkPromise) return Cloud.__sdkPromise;
      Cloud.__sdkPromise = new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = 'cloudbase.full.js';
        s.async = true;
        s.onload = function () {
          window.cloudbase ? res(window.cloudbase) : rej(new Error('CloudBase SDK 加载异常'));
        };
        s.onerror = function () { rej(new Error('无法加载 CloudBase SDK，请检查网络或文件是否完整')); };
        document.head.appendChild(s);
      });
      return Cloud.__sdkPromise;
    },

    ensure: function () {
      return Cloud.loadSdk().then(function (sdk) {
        if (!state.app) {
          var c = CFG.cloud();
          if (!c.envId) throw new Error('尚未配置云开发环境 ID');
          var initArg = { env: c.envId };
          if (c.region) initArg.region = c.region;
          state.app = sdk.init(initArg);
          state.auth = state.app.auth({ persistence: 'local' });
          state.db = state.app.database();
        }
        return state.app;
      });
    },
    coll: function () { return state.db.collection(CFG.cloud().collection); },

    list: function (q) {
      var needDraft = !!(q && (q.includeDraft || q.status === 'draft'));
      return Cloud.ensure()
        .then(Cloud.autoAuth)
        .then(function () {
          var c = Cloud.coll(), r = c.where({});
          // 云端不支持全文检索，按条件拉取后在内存过滤/分页
          var max = needDraft ? 500 : 500;
          return r.orderBy('createdAt', 'desc').limit(max).get();
        })
        .then(function (res) {
          var all = (res.data || []).map(function (p) { p.source = 'cloud'; return norm(p); });
          return filter(all, q);
        });
    },
    get: function (key) {
      return Cloud.ensure().then(Cloud.autoAuth).then(function () {
        return Cloud.coll().where({ slug: key }).limit(1).get()
          .then(function (r) { return r.data && r.data[0]; })
          .then(function (p) {
            if (p) return p;
            try { return Cloud.coll().doc(key).get().then(function (r) { return r.data && r.data[0]; }); }
            catch (e) { return null; }
          });
      }).then(function (p) {
        if (!p) return null;
        p.source = 'cloud';
        return norm(p);
      });
    },
    upsert: function (post) {
      return Cloud.ensure().then(Cloud.requireAuth).then(function () {
        var payload = JSON.parse(JSON.stringify(post));
        delete payload.id; delete payload.source;
        payload.updatedAt = new Date().toISOString();
        if (post._id) {
          var _id = post._id;
          delete payload._id; delete payload.createdAt;
          return Cloud.coll().doc(_id).update(payload).then(function () { return true; });
        }
        if (post.id && String(post.id).length === 32) {
          // 形似 _id 的历史 ID，尝试更新
          return Cloud.coll().doc(post.id).update(payload)
            .then(function () { return true; })
            .catch(function () { return Cloud.addDoc(payload); });
        }
        return Cloud.addDoc(payload);
      });
    },
    addDoc: function (payload) {
      delete payload._id;
      payload.createdAt = payload.createdAt || new Date().toISOString();
      return Cloud.coll().add(payload).then(function () { return true; });
    },
    remove: function (id) {
      return Cloud.ensure().then(Cloud.requireAuth).then(function () {
        return Cloud.coll().doc(id).remove().then(function () { return true; });
      });
    },
    upload: function (file) {
      return Cloud.ensure().then(Cloud.requireAuth).then(function () {
        return U.compressImage(file, 1920, 0.86);
      }).then(function (f) {
        var cloudPath = CFG.cloud().storagePath + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
          + '-' + encodeURIComponent(f.name).replace(/%20/g, '_');
        var up = state.app.uploadFile({ cloudPath: cloudPath, filePath: f });
        return Promise.resolve(up);
      }).then(function (r) {
        var fileID = r.fileID || (r.uploadRes && r.uploadRes.fileID);
        if (!fileID) throw new Error('上传未返回 fileID');
        return state.app.getTempFileURL({ fileList: [{ fileID: fileID, maxAge: 315360000 }] })
          .then(function (u) {
            var item = (u.fileList || [])[0] || {};
            return { url: item.tempFileURL || item.download_url || '', fileID: fileID, name: file.name, size: file.size };
          });
      });
    },
    assets: function () {
      return Promise.resolve([]); // 云端文件列表需服务端签名，后台仅保留已上传记录
    },
    removeAsset: function (fileID) {
      return Cloud.ensure().then(Cloud.requireAuth).then(function () {
        return state.app.deleteFile({ fileList: [fileID] }).then(function () { return true; });
      });
    },

    /* ---- 认证 ---- */
    autoAuth: function () {
      return state.auth.getLoginState().then(function (s) {
        if (s) { state.user = s.user || { uid: (s.user || {}).uid }; return s; }
        // 未登录：尝试匿名登录，便于按安全规则读取公开文章
        if (state.auth.signInAnonymously) {
          return state.auth.signInAnonymously().catch(function () { return null; });
        }
        return null;
      }).catch(function () { return null; });
    },
    requireAuth: function () {
      return state.auth.getLoginState().then(function (s) {
        if (s && s.user) { state.user = s.user; return s.user; }
        throw new Error('请先登录后再执行此操作');
      });
    },
    login: function (account, password) {
      return Cloud.ensure().then(function () {
        var a = state.auth;
        var attempts = [];
        var isEmail = /@/.test(account);
        function tryIt(fn, name) {
          if (typeof fn !== 'function') return null;
          return fn.call(a).catch(function (e) { throw { name: name, err: e }; });
        }
        var chain = Promise.reject({ name: 'start', err: null });
        var methods = [];
        if (isEmail) {
          methods.push(['signInWithEmailAndPassword', function () { return a.signInWithEmailAndPassword(account, password); }]);
        } else {
          methods.push(['signInWithUsernameAndPassword', function () { return a.signInWithUsernameAndPassword(account, password); }]);
          methods.push(['signInWithEmailAndPassword', function () { return a.signInWithEmailAndPassword(account, password); }]);
        }
        methods.push(['signUpWithEmailAndPassword', function () { return a.signUpWithEmailAndPassword(account, password); }]);
        methods.forEach(function (m) {
          chain = chain.catch(function (prev) {
            var r = tryIt(m[1], m[0]);
            return r ? r.catch(function (e) { throw { prev: prev, last: e && e.err }; }) : Promise.reject(prev);
          });
        });
        return chain.then(function (cred) {
          var u = cred && cred.user ? cred.user : (a.currentUser || {});
          state.user = u;
          Persist.session(makeUser(u));
          return getUser();
        }).catch(function (e) {
          var msg = '登录失败：请在 CloudBase 控制台「登录鉴权」中开启对应的登录方式（建议邮箱登录/用户名密码登录），并确认账号已注册。';
          throw new Error(msg);
        });
      });
    },
    logout: function () {
      return Cloud.ensure().then(function () {
        return state.auth.signOut().catch(function () { });
      }).then(function () { state.user = null; Persist.session(null); });
    }
  };

  /* ---------------- 会话持久化 ---------------- */
  var Persist = {
    session: function (u) {
      if (u === null) LS.del(SESSION_KEY);
      else LS.set(SESSION_KEY, u);
      state.user = u;
    },
    load: function () {
      state.user = LS.get(SESSION_KEY, null);
      return state.user;
    }
  };

  function makeUser(u) {
    if (!u) return null;
    var mode = state.mode === 'cloud' ? 'cloud' : 'local';
    return {
      uid: u.uid || u.username || 'admin',
      name: u.nickName || u.username || u.email || (mode === 'local' ? CFG.get('localAdmin').username : '管理员'),
      email: u.email || '',
      mode: mode,
      loginAt: new Date().toISOString()
    };
  }

  /* ---------------- 对外 API ---------------- */
  var Store = {
    /* 初始化：判断是否启用云端并预热 */
    init: function () {
      Persist.load();
      var c = CFG.cloud();
      state.mode = (c.enabled && c.envId) ? 'cloud' : 'local';
      if (state.mode === 'cloud') {
        return Cloud.ensure()
          .then(function () { return Cloud.autoAuth(); })
          .then(function (s) {
            if (s && s.user) {
              state.user = makeUser(s.user);
              Persist.session(state.user);
            }
            state.ready = true;
            return state.mode;
          })
          .catch(function (e) {
            state.error = e && e.message ? e.message : String(e);
            state.mode = 'local';   // 云端不可用则降级
            state.ready = true;
            return state.mode;
          });
      }
      // 本地模式：空库时写入种子数据
      Local.all();
      state.ready = true;
      return Promise.resolve(state.mode);
    },

    mode: function () { return state.mode; },
    isCloud: function () { return state.mode === 'cloud'; },
    error: function () { return state.error; },
    setMode: function (mode) {
      state.mode = (mode === 'cloud' && CFG.cloud().envId) ? 'cloud' : 'local';
      return state.mode;
    },
    enableCloud: function (opts) {
      CFG.patch({ cloud: Object.assign({ enabled: true }, opts || {}) });
      return Store.init();
    },
    disableCloud: function () {
      CFG.patch({ cloud: { enabled: false } });
      state.mode = 'local'; state.app = null; state.auth = null; state.db = null;
      return Promise.resolve('local');
    },

    list: function (q) { return state.mode === 'cloud' ? Cloud.list(q) : Promise.resolve(Local.list(q)); },
    get: function (key) { return state.mode === 'cloud' ? Cloud.get(key) : Promise.resolve(Local.get(key)); },

    upsert: function (post) {
      post = norm(post);
      if (state.mode === 'cloud') return Cloud.upsert(post);
      Local.upsert(post);
      return Promise.resolve(true);
    },
    remove: function (id) {
      if (state.mode === 'cloud') return Cloud.remove(id);
      Local.remove(id);
      return Promise.resolve(true);
    },
    incView: function (post) {
      if (!post) return Promise.resolve();
      if (state.mode === 'cloud') {
        return Cloud.ensure().then(Cloud.autoAuth).then(function () {
          if (post._id) return Cloud.coll().doc(post._id).update({ views: (post.views || 0) + 1 }).catch(function () { });
        }).catch(function () { });
      }
      var all = Local.all();
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === post.id) { all[i].views = (all[i].views || 0) + 1; break; }
      }
      Local.write(all);
      return Promise.resolve();
    },

    tags: function (includeDraft) {
      return Store.list({ size: 0, includeDraft: includeDraft }).then(function (r) {
        var map = {}, list = r.list.length ? r.list : [];
        list.forEach(function (p) {
          (p.tags || []).forEach(function (t) {
            map[t] = map[t] || { name: t, count: 0 };
            map[t].count++;
          });
        });
        return Object.keys(map).map(function (k) { return map[k]; })
          .sort(function (a, b) { return b.count - a.count || (a.name < b.name ? -1 : 1); });
      });
    },

    categories: function () {
      return Store.list({ size: 0 }).then(function (r) {
        var map = {};
        r.list.forEach(function (p) { map[p.category] = (map[p.category] || 0) + 1; });
        return Object.keys(map).map(function (k) { return { name: k, count: map[k] }; });
      });
    },

    stats: function () {
      return Store.list({ size: 0, includeDraft: true }).then(function (r) {
        var words = 0;
        r.list.forEach(function (p) { words += U.countWords(p.content); });
        return {
          posts: r.list.filter(function (p) { return p.status === 'published'; }).length,
          drafts: r.list.filter(function (p) { return p.status === 'draft'; }).length,
          tags: Array.isArray(r.tags) ? 0 : 0,
          words: Math.round(words / 1000 * 10) / 10,
          chars: words
        };
      });
    },

    allRaw: function () {
      if (state.mode === 'cloud') return Cloud.list({ size: 0, includeDraft: true });
      return Promise.resolve(filter(Local.all(), { includeDraft: true }));
    },

    upload: function (file) { return state.mode === 'cloud' ? Cloud.upload(file) : Local.upload(file); },
    assets: function () { return state.mode === 'cloud' ? Cloud.assets() : Local.assets(); },
    removeAsset: function (id) { return state.mode === 'cloud' ? Cloud.removeAsset(id) : Local.removeAsset(id); },

    /* ---------- 认证 ---------- */
    getUser: function () { return state.user; },
    getUserAsync: function () {
      if (state.mode === 'cloud' && state.auth) {
        return state.auth.getLoginState().then(function (s) {
          if (s && s.user) { state.user = makeUser(s.user); Persist.session(state.user); }
          return state.user;
        }).catch(function () { return state.user; });
      }
      return Promise.resolve(state.user);
    },
    login: function (account, password) {
      if (state.mode === 'cloud') return Cloud.login(account, password);
      var adm = CFG.get('localAdmin');
      if (account !== adm.username || password !== adm.password) {
        return Promise.reject(new Error('账号或密码不正确'));
      }
      Persist.session(makeUser({ username: adm.username, uid: 'local-admin' }));
      return Promise.resolve(state.user);
    },
    logout: function () {
      if (state.mode === 'cloud') return Cloud.logout().catch(function () { Persist.session(null); });
      Persist.session(null);
      return Promise.resolve();
    },
    changeLocalPassword: function (oldPwd, newPwd) {
      var adm = CFG.get('localAdmin');
      if (oldPwd !== adm.password) return Promise.reject(new Error('原密码不正确'));
      CFG.patch({ localAdmin: { password: newPwd } });
      return Promise.resolve(true);
    },

    /* ---------- 导入导出 ---------- */
    exportJson: function () {
      return Store.allRaw().then(function (r) {
        return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), posts: r.list }, null, 2);
      });
    },
    importJson: function (text, overwrite) {
      var parsed;
      try { parsed = JSON.parse(text); }
      catch (e) { return Promise.reject(new Error('JSON 解析失败')); }
      var incoming = Array.isArray(parsed) ? parsed : (parsed.posts || []);
      if (!incoming.length) return Promise.reject(new Error('未找到文章数据'));
      if (state.mode === 'cloud') {
        var chain = Promise.resolve();
        incoming.forEach(function (p) {
          chain = chain.then(function () { return Cloud.upsert(norm(p)); });
        });
        return chain.then(function () { return incoming.length; });
      }
      var all = Local.all(), added = 0;
      incoming.forEach(function (raw) {
        var p = norm(raw);
        var exist = all.filter(function (x) { return x.slug === p.slug; })[0];
        if (exist) {
          if (overwrite) {
            all[all.indexOf(exist)] = Object.assign({}, p, { id: exist.id, createdAt: exist.createdAt });
            added++;
          }
        } else { all.unshift(p); added++; }
      });
      Local.write(all);
      return Promise.resolve(added);
    },
    resetLocal: function () {
      LS.del(POSTS_KEY);
      Local.all();
      return Promise.resolve(true);
    }
  };

  function getUser() { return state.user; }

  window.LB.store = Store;
})(window);
