/* ============================================================
   LB.admin — 后台管理：登录 / 文章编辑 / 素材 / 站点设置 / 云端接入
   ============================================================ */
(function (window) {
  'use strict';
  var U = window.LB.utils, CFG = window.LB.config, MD = window.LB.md, Store = window.LB.store, App = null;

  function el(a, b, c) { return U.el(a, b, c); }
  function txt(s) { return document.createTextNode(s); }
  function field(label, control, hint) {
    var f = el('div', { class: 'field' });
    if (label) f.appendChild(el('label', {}, [txt(label)]));
    f.appendChild(control);
    if (hint) f.appendChild(el('div', { style: 'font-size:12px;color:var(--ink-3);margin-top:5px', text: hint }));
    return f;
  }
  function nowIso() { return new Date().toISOString(); }

  /* =========================================================
     登录
     ========================================================= */
  function loginView() {
    var host = el('div', {});
    var sec = el('div', { class: 'admin-wrap' });
    var card = el('div', { class: 'login-card' });
    card.appendChild(el('h2', {}, [txt('后台登录')]));
    card.appendChild(el('p', { class: 'sub', text: Store.isCloud()
      ? '当前为云端模式，使用 CloudBase 已注册的账号登录。'
      : '当前为本地模式，默认账号 admin / lb2026，登录后可在「站点设置」中修改。' }));

    var acc = el('input', { type: 'text', placeholder: Store.isCloud() ? '邮箱或用户名' : '账号', value: Store.isCloud() ? '' : 'admin' });
    var pwd = el('input', { type: 'password', placeholder: '密码' });
    card.appendChild(field('账号', acc));
    card.appendChild(field('密码', pwd));

    var errBox = el('div', { style: 'display:none;color:var(--red);font-size:13px;margin-bottom:12px' });
    card.appendChild(errBox);

    var btn = el('button', { class: 'btn btn-primary', type: 'button', style: 'width:100%;justify-content:center' }, [txt('登 录')]);
    function submit() {
      btn.disabled = true; btn.textContent = '登录中…';
      Store.login(acc.value.trim(), pwd.value).then(function () {
        U.toast('登录成功');
        App.go('#/admin');
      }).catch(function (e) {
        errBox.style.display = 'block';
        errBox.textContent = e.message || '登录失败';
        btn.disabled = false; btn.textContent = '登 录';
      });
    }
    btn.addEventListener('click', submit);
    pwd.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    acc.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    card.appendChild(btn);

    if (!Store.isCloud()) {
      card.appendChild(el('p', { style: 'font-size:12.5px;color:var(--ink-3);margin:16px 0 0;text-align:center',
        text: '提示：接入腾讯云开发后，此处将改为账号登录，数据同步至云端数据库与云存储。' }));
    }
    sec.appendChild(card);
    host.appendChild(sec);
    return host;
  }

  /* =========================================================
     后台主框架
     ========================================================= */
  function adminShell(sub) {
    var host = el('div', {});
    var wrap = el('div', { class: 'admin-wrap', style: 'padding-top:32px' });

    var bar = el('div', { class: 'toolbar', style: 'align-items:center' });
    bar.appendChild(el('div', { style: 'font-family:var(--serif);font-size:21px;color:var(--navy);font-weight:700', text: '内容管理后台' }));
    bar.appendChild(el('span', { class: 'badge ' + (Store.isCloud() ? 'badge-cloud' : 'badge-local'),
      text: Store.isCloud() ? '云端数据库 · 已连接' : '本地离线存储' }));
    var user = Store.getUser();
    bar.appendChild(el('span', { style: 'margin-left:auto;font-size:13.5px;color:var(--ink-3)',
      text: user ? ('已登录：' + user.name) : '' }));
    bar.appendChild(el('a', { class: 'btn btn-ghost btn-sm', href: '#/', text: '查看前台' }));
    bar.appendChild((function () {
      var b = el('button', { class: 'btn btn-ghost btn-sm', text: '退出登录' });
      b.addEventListener('click', function () {
        Store.logout().then(function () { U.toast('已退出'); App.go('#/'); });
      });
      return b;
    })());
    wrap.appendChild(bar);

    var tabs = el('div', { class: 'toolbar-row' });
    var items = [
      ['', '文章列表'], ['new', '写新文章'], ['assets', '素材库'],
      ['cloud', '云端接入'], ['settings', '站点设置']
    ];
    items.forEach(function (it) {
      var href = '#/admin' + (it[0] ? '/' + it[0] : '');
      tabs.appendChild(el('a', { class: 'btn ' + (sub === it[0] ? 'btn-primary' : 'btn-ghost'), href: href, text: it[1] }));
    });
    wrap.appendChild(tabs);

    var body = el('div', {});
    wrap.appendChild(body);
    host.appendChild(wrap);

    renderSub(body, sub);
    return host;
  }

  function renderSub(body, sub) {
    U.mount(body, [el('div', { class: 'empty', text: '加载中…' })]);
    var p;
    switch (sub) {
      case 'assets': p = assetsView(); break;
      case 'cloud': p = cloudView(); break;
      case 'settings': p = settingsView(); break;
      case 'new': p = editorView(null); break;
      default: p = listView();
    }
    p.then(function (node) { U.mount(body, [node]); }).catch(function (e) {
      U.mount(body, [notOkNode(e.message || String(e))]);
    });
  }

  function notOkNode(msg) {
    return el('div', { class: 'empty' }, [el('b', { text: '出错了' }), el('div', { text: msg })]);
  }

  /* =========================================================
     文章列表
     ========================================================= */
  function listView() {
    return Store.allRaw().then(function (r) {
      var host = el('div', {});
      var row = el('div', { class: 'toolbar-row' });
      row.appendChild(el('a', { class: 'btn btn-primary btn-sm', href: '#/admin/new', text: '＋ 写新文章' }));
      row.appendChild(el('span', { style: 'font-size:13.5px;color:var(--ink-3)',
        text: '共 ' + r.list.length + ' 篇（含草稿）' }));
      host.appendChild(row);

      if (!r.list.length) {
        host.appendChild(el('div', { class: 'empty' }, [
          el('b', { text: '还没有文章' }),
          el('div', { style: 'margin-top:12px' }, [
            el('a', { class: 'btn btn-primary', href: '#/admin/new', text: '写第一篇' }),
            (function () {
              var b = el('button', { class: 'btn btn-ghost', style: 'margin-left:10px', text: '恢复示例文章' });
              b.addEventListener('click', function () {
                Store.resetLocal().then(function () { U.toast('已恢复'); App.reload(); });
              });
              return b;
            })()
          ])
        ]));
        return host;
      }

      var table = el('table', { class: 'data-table' });
      var thead = el('thead', {}, [
        el('tr', {}, [
          el('th', { text: '标题' }), el('th', { text: '分类' }), el('th', { text: '状态' }),
          el('th', { text: '更新时间' }), el('th', { text: '操作' })
        ])
      ]);
      table.appendChild(thead);
      var tbody = el('tbody');
      r.list.forEach(function (p) {
        var tr = el('tr', {}, [
          el('td', {}, [
            el('div', { style: 'font-weight:500', text: p.title + (p.pinned ? ' 📌' : '') }),
            el('div', { style: 'font-size:12px;color:var(--ink-3)', text: '/' + p.slug + ' · ' + (p.tags || []).join(' / ') })
          ]),
          el('td', { text: p.category, style: 'font-size:13.5px;color:var(--ink-2)' }),
          el('td', {}, [el('span', { class: 'badge ' + (p.status === 'published' ? 'badge-pub' : 'badge-draft'),
            text: p.status === 'published' ? '已发布' : '草稿' })]),
          el('td', { text: U.relTime(p.updatedAt), style: 'font-size:13px;color:var(--ink-3)' })
        ]);
        var ops = el('td', { class: 'ops' });
        ops.appendChild(el('a', { class: 'btn btn-ghost btn-sm', href: '#/post/' + encodeURIComponent(p.slug), target: '_blank', rel: 'noopener', text: '查看' }));
        ops.appendChild(el('a', { class: 'btn btn-ghost btn-sm', href: '#/admin/edit/' + encodeURIComponent(p.slug), text: '编辑' }));
        var tog = el('button', { class: 'btn btn-ghost btn-sm', text: p.status === 'published' ? '转草稿' : '发布' });
        tog.addEventListener('click', function () {
          Store.upsert(Object.assign({}, p, { status: p.status === 'published' ? 'draft' : 'published' }))
            .then(function () { U.toast('已更新'); App.reload(); })
            .catch(function (e) { U.toast(e.message, 'err'); });
        });
        ops.appendChild(tog);
        var del = el('button', { class: 'btn btn-danger btn-sm', text: '删除' });
        del.addEventListener('click', function () {
          if (!confirm('确认删除《' + p.title + '》？此操作不可恢复。')) return;
          Store.remove(p._id || p.id).then(function () { U.toast('已删除'); App.reload(); })
            .catch(function (e) { U.toast(e.message, 'err'); });
        });
        ops.appendChild(del);
        tr.appendChild(ops);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      host.appendChild(table);

      /* 导入导出 */
      var io = el('div', { class: 'panel', style: 'margin-top:20px' });
      io.appendChild(el('h3', {}, [txt('数据备份')]));
      var ioRow = el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:center' });
      var exp = el('button', { class: 'btn btn-ghost btn-sm', text: '导出全部文章（JSON）' });
      exp.addEventListener('click', function () {
        Store.exportJson().then(function (json) {
          var blob = new Blob([json], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'lb-blog-posts-' + U.fmtDate(nowIso()) + '.json';
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
          U.toast('已导出');
        });
      });
      ioRow.appendChild(exp);

      var fileInput = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
      fileInput.addEventListener('change', function () {
        var f = fileInput.files && fileInput.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          Store.importJson(fr.result, true).then(function (n) {
            U.toast('已导入 ' + n + ' 篇'); App.reload();
          }).catch(function (e) { U.toast(e.message, 'err'); });
        };
        fr.readAsText(f);
      });
      var imp = el('button', { class: 'btn btn-ghost btn-sm', text: '导入 JSON' });
      imp.addEventListener('click', function () { fileInput.click(); });
      ioRow.appendChild(imp);
      ioRow.appendChild(fileInput);

      var seedBtn = el('button', { class: 'btn btn-ghost btn-sm', text: '恢复内置示例文章' });
      seedBtn.addEventListener('click', function () {
        if (!confirm('将用内置的 6 篇示例文章覆盖本地库，继续？')) return;
        Store.resetLocal().then(function () { U.toast('已恢复'); App.reload(); });
      });
      ioRow.appendChild(seedBtn);
      io.appendChild(ioRow);
      io.appendChild(el('div', { style: 'font-size:12.5px;color:var(--ink-3);margin-top:10px',
        text: '建议先导出备份再执行恢复操作。' }));
      host.appendChild(io);

      return host;
    });
  }

  /* =========================================================
     编辑器
     ========================================================= */
  function editorView(slugOrNull) {
    var existing = null;
    var p = slugOrNull
      ? Store.get(slugOrNull)
      : Promise.resolve({
        slug: '', title: '', summary: '', content: '', tags: [], category: '实务笔记',
        cover: '', status: 'published', author: CFG.get('lawyerName'), pinned: false, createdAt: nowIso()
      });
    return p.then(function (post) {
      if (slugOrNull && !post) return notOkNode('文章不存在');
      existing = post;

      var host = el('div', {});
      var grid = el('div', { class: 'editor-grid' });

      /* ---- 左：表单 ---- */
      var left = el('div', {});
      var title = el('input', { type: 'text', placeholder: '文章标题', value: post.title || '' });
      var slug = el('input', { type: 'text', placeholder: 'URL 别名，留空自动生成', value: post.slug || '' });
      var summary = el('textarea', { placeholder: '摘要，用于列表展示，留空自动截取正文' });
      summary.value = post.summary || '';
      summary.style.minHeight = '90px';
      var category = el('input', { type: 'text', value: post.category || '实务笔记' });
      var tagsInput = el('input', { type: 'text', placeholder: '多个标签用中文逗号或英文逗号分隔', value: (post.tags || []).join('，') });
      var cover = el('input', { type: 'text', placeholder: '封面图片 URL，留空使用自动渐变', value: post.cover || '' });
      var status = el('select', {}, [
        el('option', { value: 'published', text: '发布' }),
        el('option', { value: 'draft', text: '存为草稿' })
      ]);
      status.value = post.status || 'published';
      var pinned = el('select', {}, [
        el('option', { value: '0', text: '否' }), el('option', { value: '1', text: '是' })
      ]);
      pinned.value = post.pinned ? '1' : '0';

      left.appendChild(field('标题', title));
      left.appendChild(field('别名 slug', slug, '决定文章网址，例如 bangxin-mingzhi'));
      left.appendChild(field('摘要', summary));
      left.appendChild(field('分类', category));
      left.appendChild(field('标签', tagsInput));
      left.appendChild(field('封面图', cover, '可先在「素材库」上传图片后粘贴地址'));
      var r2 = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px' });
      r2.appendChild(field('状态', status));
      r2.appendChild(field('置顶', pinned));
      left.appendChild(r2);

      /* ---- 右：Markdown 与预览 ---- */
      var right = el('div', { style: 'display:flex;flex-direction:column;gap:10px' });
      var tabsRow = el('div', { style: 'display:flex;gap:8px;align-items:center' });
      var src = el('textarea', { class: 'md-source', placeholder: '在此撰写正文，支持 Markdown…' });
      src.value = post.content || '';
      var preview = el('div', { class: 'preview-pane' });
      preview.style.display = 'none';
      var insertRow = el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' });
      [['H2', '\\n## 二级标题\\n\\n'], ['加粗', '**加粗**'], ['引用', '\\n> 引用内容\\n'],
       ['列表', '\\n- 要点一\\n- 要点二\\n'], ['表格', '\\n| A | B |\\n| --- | --- |\\n| 1 | 2 |\\n'],
       ['代码块', '\\n```text\\n……\\n```\\n'], ['分割线', '\\n\\n---\\n\\n']].forEach(function (pair) {
        var b = el('button', { class: 'btn btn-ghost btn-sm', text: pair[0] });
        b.addEventListener('click', function () {
          insertText(src, pair[1].replace(/\\n/g, '\n'));
          updatePreview();
        });
        insertRow.appendChild(b);
      });
      tabsRow.appendChild(insertRow);

      var uploadBtn = el('button', { class: 'btn btn-ghost btn-sm', text: '⬆ 上传图片并插入' });
      var pick = el('input', { type: 'file', accept: 'image/*', multiple: '', style: 'display:none' });
      pick.addEventListener('change', function () {
        Array.prototype.forEach.call(pick.files || [], function (f) {
          Store.upload(f).then(function (r) {
            insertText(src, '\n![' + f.name + '](' + r.url + ')\n');
            updatePreview();
            U.toast('已插入 ' + f.name);
          }).catch(function (e) { U.toast('上传失败：' + e.message, 'err'); });
        });
      });
      uploadBtn.addEventListener('click', function () { pick.click(); });
      tabsRow.appendChild(uploadBtn);
      tabsRow.appendChild(pick);

      var wordCount = el('span', { style: 'font-size:12.5px;color:var(--ink-3);margin-left:auto' });
      tabsRow.appendChild(wordCount);
      right.appendChild(tabsRow);
      right.appendChild(src);
      right.appendChild(preview);

      var togglePrev = el('button', { class: 'btn btn-ghost btn-sm', text: '预览：关' });
      togglePrev.addEventListener('click', function () {
        var on = preview.style.display === 'none';
        preview.style.display = on ? 'block' : 'none';
        src.style.display = on ? 'none' : 'block';
        togglePrev.textContent = '预览：' + (on ? '开' : '关');
        if (on) updatePreview();
      });
      tabsRow.insertBefore(togglePrev, insertRow);

      function updatePreview() {
        preview.innerHTML = MD.render(src.value);
        wordCount.textContent = MD.words(src.value) + ' 字 · 约 ' + U.readingTime(src.value) + ' 分钟';
      }
      src.addEventListener('input', U.debounce(function () {
        if (preview.style.display !== 'none') updatePreview();
        wordCount.textContent = MD.words(src.value) + ' 字 · 约 ' + U.readingTime(src.value) + ' 分钟';
      }, 300));
      updatePreview();

      grid.appendChild(left);
      grid.appendChild(right);
      host.appendChild(grid);

      /* ---- 保存条 ---- */
      var saveRow = el('div', { class: 'toolbar-row', style: 'margin-top:18px;justify-content:flex-end' });
      if (existing && existing.slug) {
        saveRow.appendChild(el('a', { class: 'btn btn-ghost', href: '#/post/' + encodeURIComponent(existing.slug), text: '查看稿件' }));
      }
      var saveBtn = el('button', { class: 'btn btn-primary' }, [txt(existing && existing.slug ? '保存修改' : '发布文章')]);
      saveBtn.addEventListener('click', function () { save(false); });
      saveRow.appendChild(saveBtn);
      var saveDraft = el('button', { class: 'btn btn-ghost' }, [txt('存为草稿')]);
      saveDraft.addEventListener('click', function () { save(true); });
      saveRow.appendChild(saveDraft);
      host.appendChild(saveRow);

      function save(forceDraft) {
        var t = title.value.trim();
        if (!t) { U.toast('请填写标题', 'err'); title.focus(); return; }
        var tags = tagsInput.value.split(/[,，、;；\s]+/).map(function (s) { return s.trim(); })
          .filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; });
        var payload = {
          id: existing && existing.id !== existing.slug ? existing.id : undefined,
          _id: existing && existing._id,
          slug: (slug.value.trim() || U.slugify(t)),
          title: t,
          summary: summary.value.trim(),
          content: src.value,
          tags: tags,
          category: category.value.trim() || '实务笔记',
          cover: cover.value.trim(),
          status: forceDraft ? 'draft' : status.value,
          pinned: pinned.value === '1',
          author: CFG.get('lawyerName'),
          createdAt: existing && existing.createdAt
        };
        saveBtn.disabled = true; saveBtn.textContent = '保存中…';
        Store.upsert(payload).then(function () {
          U.toast('已保存');
          setTimeout(function () { App.go('#/admin'); }, 350);
        }).catch(function (e) {
          U.toast('保存失败：' + (e.message || e), 'err', 5000);
          saveBtn.disabled = false; saveBtn.textContent = '保存修改';
        });
      }

      return host;
    });
  }

  function insertText(area, s) {
    var start = area.selectionStart || area.value.length;
    var end = area.selectionEnd || start;
    area.value = area.value.slice(0, start) + s + area.value.slice(end);
    area.focus();
    area.selectionStart = area.selectionEnd = start + s.length;
  }

  /* =========================================================
     素材库
     ========================================================= */
  function assetsView() {
    var host = el('div', {});
    var dz = el('div', { class: 'dropzone' }, [
      txt('点击或拖拽文件到此处上传'),
      el('div', { style: 'font-size:12px;margin-top:6px;color:var(--ink-3)',
        text: Store.isCloud() ? '图片将存入腾讯云开发「云存储」，并返回永久访问链接（fileID 形式）' : '图片存入浏览器本地 IndexedDB，数据仅在本机可见' })
    ]);
    var pick = el('input', { type: 'file', multiple: '', style: 'display:none' });
    function doUpload(files) {
      Array.prototype.forEach.call(files || [], function (f) {
        U.toast('上传中：' + f.name);
        Store.upload(f).then(function () { U.toast('已上传 ' + f.name); App.reload(); })
          .catch(function (e) { U.toast('上传失败：' + e.message, 'err', 4000); });
      });
    }
    pick.addEventListener('change', function () { doUpload(pick.files); });
    dz.addEventListener('click', function () { pick.click(); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); });
    });
    dz.addEventListener('drop', function (e) { doUpload(e.dataTransfer.files); });
    host.appendChild(dz);
    host.appendChild(pick);

    return Store.assets().then(function (list) {
      if (!list.length) {
        if (Store.isCloud()) {
          host.appendChild(el('div', { class: 'panel', style: 'margin-top:16px', html:
            '<h3>云端素材</h3><p style="color:var(--ink-2);font-size:14px;margin:0">' +
            '云端模式下，已上传的图片会插入文章正文并在 CloudBase 控制台「云存储」中可见，' +
            '此处仅保留本次会话的上传记录。</p>' }));
        }
        return host;
      }
      var grid = el('div', { class: 'asset-grid' });
      list.forEach(function (a) {
        var item = el('div', { class: 'asset-item' }, [
          el('div', { class: 'thumb' }, [/^image\//.test(a.type || '') ? el('img', { src: a.url, alt: a.name }) : txt('📄')]),
          el('div', { class: 'meta', title: a.name, text: a.name + ' · ' + U.fmtBytes(a.size) })
        ]);
        var ops = el('div', { class: 'ops' });
        var copy = el('button', { class: 'btn btn-ghost btn-sm', text: '复制链接', style: 'flex:1' });
        copy.addEventListener('click', function () {
          copyText(a.url);
          U.toast('地址已复制，可直接填入封面图或正文');
        });
        ops.appendChild(copy);
        var del = el('button', { class: 'btn btn-danger btn-sm', text: '删除' });
        del.addEventListener('click', function () {
          Store.removeAsset(a.fileID || a.id).then(function () { U.toast('已删除'); App.reload(); })
            .catch(function (e) { U.toast(e.message, 'err'); });
        });
        ops.appendChild(del);
        item.appendChild(ops);
        grid.appendChild(item);
      });
      host.appendChild(grid);
      return host;
    });
  }

  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(s).catch(function () { fallbackCopy(s); });
    } else fallbackCopy(s);
  }
  function fallbackCopy(s) {
    var ta = document.createElement('textarea');
    ta.value = s; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { }
    ta.remove();
  }

  /* =========================================================
     云端接入
     ========================================================= */
  function cloudView() {
    var host = el('div', {});
    var c = CFG.cloud();

    var panel = el('div', { class: 'panel' });
    panel.appendChild(el('h3', {}, [txt('腾讯云开发（CloudBase）接入')]));
    panel.appendChild(el('p', { style: 'color:var(--ink-2);font-size:14px;margin:0 0 16px',
      text: '填入云开发环境 ID 后，文章将写入云数据库集合、图片写入云存储，登录改用 CloudBase 账号体系。未配置时站点自动降级为本地离线模式，前台功能不受影响。' }));

    var envId = el('input', { type: 'text', placeholder: '例如 law-blog-1a2b3c4d', value: c.envId || '' });
    var region = el('input', { type: 'text', placeholder: '一般留空由 SDK 自动识别', value: c.region || '' });
    var coll = el('input', { type: 'text', value: c.collection || 'posts' });
    var prefix = el('input', { type: 'text', value: c.storagePath || 'blog/' });
    panel.appendChild(field('环境 ID (envId)', envId, 'CloudBase 控制台 → 概览 → 环境 ID'));
    panel.appendChild(field('Region（可选）', region));
    panel.appendChild(field('云数据库集合名', coll));
    panel.appendChild(field('云存储目录前缀', prefix));

    var enabled = el('select', {}, [
      el('option', { value: '0', text: '关闭（本地离线模式）' }),
      el('option', { value: '1', text: '启用云端模式' })
    ]);
    enabled.value = c.enabled ? '1' : '0';
    panel.appendChild(field('模式', enabled));

    var row = el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;margin-top:6px' });
    var save = el('button', { class: 'btn btn-primary' }, [txt('保存并连接')]);
    save.addEventListener('click', function () {
      var opts = {
        envId: envId.value.trim(),
        region: region.value.trim(),
        collection: coll.value.trim() || 'posts',
        storagePath: prefix.value.trim() || 'blog/',
        enabled: enabled.value === '1'
      };
      CFG.patch({ cloud: opts });
      save.disabled = true; save.textContent = '连接中…';
      Store.init().then(function (mode) {
        save.disabled = false; save.textContent = '保存并连接';
        if (mode === 'cloud') { U.toast('已接入云端：' + opts.envId); }
        else { U.toast('未能连接云端，已降级为本地模式。请检查环境 ID 与网络。', 'err', 5000); }
        App.reload();
      });
    });
    row.appendChild(save);

    if (Store.isCloud()) {
      var off = el('button', { class: 'btn btn-ghost' }, [txt('切回本地模式')]);
      off.addEventListener('click', function () {
        Store.disableCloud().then(function () { U.toast('已切回本地模式'); App.reload(); });
      });
      row.appendChild(off);
    }
    panel.appendChild(row);
    host.appendChild(panel);

    if (Store.error()) {
      host.appendChild(el('div', { class: 'panel', style: 'margin-top:16px;border-color:#edc9c6;background:#fff6f5' }, [
        el('h3', { style: 'color:var(--red)', text: '上次连接错误' }),
        el('div', { style: 'font-size:13.5px;color:var(--ink-2)', text: Store.error() })
      ]));
    }

    /* 使用说明 */
    var guide = el('div', { class: 'panel', style: 'margin-top:16px' });
    guide.appendChild(el('h3', {}, [txt('接入步骤与安全规则')]));
    var steps = el('ol', { style: 'padding-left:20px;color:var(--ink-2);font-size:14px;line-height:1.9' });
    [
      '开通腾讯云开发 CloudBase，新建一个按量付费或包年包月的环境，记下「环境 ID」。',
      '在「数据库」中新建集合（默认 posts），并把安全规则改为「所有用户可读，仅创建者可写」，否则前台访客无法读取文章。',
      '在「登录鉴权」中开启所需的登录方式，建议开启「邮箱登录」或「用户名密码登录」，并在「用户管理」中注册本站管理员账号。',
      '在「环境 → 安全配置 → 域名白名单」中，把本站域名加入 WEB 安全域名白名单，否则浏览器会拒绝请求。',
      '回到本页面填入环境 ID，点击「保存并连接」，状态条显示「云端数据库 · 已连接」即成功。'
    ].forEach(function (s) { steps.appendChild(el('li', {}, [txt(s)])); });
    guide.appendChild(steps);

    var rule = el('pre', { style: 'background:#f7f9fb;border:1px solid var(--line);border-radius:10px;padding:14px;overflow-x:auto;font-size:13px' });
    rule.textContent = [
      '// 云数据库集合 posts 安全规则（推荐）',
      '{',
      '  "read": true,',
      '  "write": "doc._openid == auth.openid"',
      '}'
    ].join('\n');
    guide.appendChild(rule);
    host.appendChild(guide);
    return Promise.resolve(host);
  }

  /* =========================================================
     站点设置
     ========================================================= */
  function settingsView() {
    var host = el('div', {});
    var p = el('div', { class: 'panel' });
    p.appendChild(el('h3', {}, [txt('站点信息')]));

    function inp(key, placeholder) {
      return el('input', { type: 'text', value: CFG.get(key) || '', placeholder: placeholder || '' });
    }
    var siteName = inp('siteName'), logo = inp('logoText');
    var heroSub = inp('siteSub');
    var name = inp('lawyerName'), title2 = inp('lawyerTitle'), firm = inp('firm');
    var lic = inp('licenseNo'), city = inp('city'), addr = inp('address');
    var phone = inp('phone'), email = inp('email'), wechat = inp('wechat');
    var intro = el('textarea'); intro.value = CFG.get('intro') || ''; intro.style.minHeight = '110px';
    var consult = el('textarea'); consult.value = CFG.get('consultation') || ''; consult.style.minHeight = '90px';
    var practice = el('textarea'); practice.value = (CFG.get('practice') || []).join('\n'); practice.style.minHeight = '130px';
    var honors = el('textarea'); honors.value = (CFG.get('honors') || []).join('\n'); honors.style.minHeight = '90px';
    var copy = inp('copyright');
    var icp = inp('icp');
    var avatar = el('input', { type: 'text', value: CFG.get('avatar') || '', placeholder: '头像图片地址，可在素材库上传后复制' });

    p.appendChild(field('站点名称', siteName));
    p.appendChild(field('Logo 文字', logo));
    p.appendChild(field('站点英文名', heroSub));
    p.appendChild(field('律师姓名', name));
    p.appendChild(field('头衔 / 简介一行', title2));
    p.appendChild(field('执业机构', firm));
    p.appendChild(field('执业证号', lic));
    p.appendChild(field('所在城市', city));
    p.appendChild(field('办公地址', addr));
    p.appendChild(field('联系电话', phone));
    p.appendChild(field('电子邮箱', email));
    p.appendChild(field('微信号', wechat));
    p.appendChild(field('律师简介', intro));
    p.appendChild(field('业务范围（每行一条）', practice));
    p.appendChild(field('执业经历 / 社会职务（每行一条）', honors));
    p.appendChild(field('委托与咨询说明', consult));
    p.appendChild(field('头像地址', avatar));
    p.appendChild(field('版权 / 免责声明', copy));
    p.appendChild(field('备案号', icp));

    var saveBtn = el('button', { class: 'btn btn-primary', type: 'button' }, [txt('保存站点信息')]);
    saveBtn.addEventListener('click', function () {
      CFG.patch({
        siteName: siteName.value.trim(), logoText: logo.value.trim(), siteSub: heroSub.value.trim(),
        lawyerName: name.value.trim(), lawyerTitle: title2.value.trim(), firm: firm.value.trim(),
        licenseNo: lic.value.trim(), city: city.value.trim(), address: addr.value.trim(),
        phone: phone.value.trim(), email: email.value.trim(), wechat: wechat.value.trim(),
        intro: intro.value.trim(),
        practice: practice.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
        honors: honors.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
        consultation: consult.value.trim(), avatar: avatar.value.trim(),
        copyright: copy.value.trim(), icp: icp.value.trim()
      });
      U.toast('已保存');
      App.reload();
    });
    p.appendChild(el('div', { style: 'display:flex;gap:10px;margin-top:8px' }, [saveBtn]));
    host.appendChild(p);

    /* 本地口令 */
    if (!Store.isCloud()) {
      var secPanel = el('div', { class: 'panel', style: 'margin-top:16px' });
      secPanel.appendChild(el('h3', {}, [txt('修改后台登录口令')]));
      var oldP = el('input', { type: 'password', placeholder: '当前密码' });
      var newP = el('input', { type: 'password', placeholder: '新密码（至少 6 位）' });
      secPanel.appendChild(field('当前密码', oldP));
      secPanel.appendChild(field('新密码', newP));
      var btn2 = el('button', { class: 'btn btn-primary', type: 'button' }, [txt('修改密码')]);
      btn2.addEventListener('click', function () {
        if (newP.value.trim().length < 6) return U.toast('新密码至少 6 位', 'err');
        Store.changeLocalPassword(oldP.value, newP.value.trim())
          .then(function () { U.toast('密码已更新'); oldP.value = ''; newP.value = ''; })
          .catch(function (e) { U.toast(e.message, 'err'); });
      });
      secPanel.appendChild(btn2);
      host.appendChild(secPanel);
    }
    return Promise.resolve(host);
  }

  /* =========================================================
     入口
     ========================================================= */
  function render(sub) {
    App = window.LB.app;
    return Store.getUserAsync().then(function (user) {
      if (!user) return loginView();
      return adminShell(sub || '');
    });
  }

  window.LB.admin = { render: render, editor: editorView };
})(window);
