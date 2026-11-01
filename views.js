/* ============================================================
   LB.views — 前台页面：首页列表 / 文章详情 / 标签 / 关于
   ============================================================ */
(function (window) {
  'use strict';
  var U = window.LB.utils, CFG = window.LB.config, MD = window.LB.md, Store = window.LB.store;

  function el(a, b, c) { return U.el(a, b, c); }
  function txt(s) { return document.createTextNode(s); }

  /* ---------- 封面渐变 ---------- */
  function coverTone(seed) {
    var hues = [207, 213, 199, 221, 195, 189];
    var h = 0;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
    return hues[h % hues.length];
  }
  function coverNode(post, className) {
    var wrap = el('div', { class: className || 'card-cover',
      style: post.cover ? '' : 'background:linear-gradient(135deg,hsl(' + coverTone(post.slug) + ' 52% 34%),hsl(' + (coverTone(post.slug) + 22) + ' 46% 46%))' });
    if (post.cover) {
      wrap.appendChild(el('img', { src: post.cover, alt: post.title, loading: 'lazy' }));
    } else {
      wrap.appendChild(el('div', { class: 'pattern' }));
      wrap.appendChild(el('div', { class: 'cover-label', text: post.category || '实务笔记' + ' · ' + U.fmtDate(post.createdAt) }));
    }
    return wrap;
  }

  /* ---------- 文章卡片 ---------- */
  function postCard(post) {
    var card = el('article', { class: 'card' });
    card.appendChild(coverNode(post));
    var body = el('div', { class: 'card-body' });

    var meta = el('div', { class: 'card-meta' });
    meta.appendChild(txt(U.fmtDate(post.createdAt)));
    meta.appendChild(el('span', { class: 'dot' }));
    meta.appendChild(txt(U.readingTime(post.content) + ' 分钟'));
    if (post.pinned) {
      meta.appendChild(el('span', { class: 'dot' }));
      meta.appendChild(el('span', { style: 'color:#a4792e', text: '置顶' }));
    }
    body.appendChild(meta);

    body.appendChild(el('h3', {}, [el('a', { href: '#/post/' + encodeURIComponent(post.slug), text: post.title })]));
    body.appendChild(el('p', { class: 'excerpt', text: post.summary || MD.excerpt(post.content, 110) }));

    var tags = el('div', { class: 'card-tags' });
    (post.tags || []).slice(0, 4).forEach(function (t) {
      tags.appendChild(el('a', { class: 'tag', href: '#/tag/' + encodeURIComponent(t), text: t }));
    });
    body.appendChild(tags);
    card.appendChild(body);
    return card;
  }

  /* ---------- 侧栏：标签云 / 分类 ---------- */
  function sidePanel(activeTag) {
    var box = el('div', {});
    return Store.tags().then(function (tags) {
      return Store.categories().then(function (cats) {
        var tPanel = el('div', { class: 'panel' });
        tPanel.appendChild(el('h3', {}, [txt('标签云')]));
        var cloud = el('div', { style: 'display:flex;gap:7px;flex-wrap:wrap' });
        tags.forEach(function (t) {
          cloud.appendChild(el('a', {
            class: 'tag' + (t.name === activeTag ? ' tag-cat' : ''),
            href: '#/tag/' + encodeURIComponent(t.name)
          }, [txt(t.name), el('span', { class: 'n', text: String(t.count) })]));
        });
        tPanel.appendChild(cloud);
        box.appendChild(tPanel);

        if (cats.length) {
          var cPanel = el('div', { class: 'panel', style: 'margin-top:18px' });
          cPanel.appendChild(el('h3', {}, [txt('分类')]));
          var list = el('ul', { style: 'list-style:none;margin:0;padding:0;font-size:14.5px' });
          cats.forEach(function (c) {
            list.appendChild(el('li', {
              style: 'display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed var(--line)'
            }, [
              el('a', { href: '#/category/' + encodeURIComponent(c.name), style: 'color:var(--ink-2)' }, [txt(c.name)]),
              el('span', { text: String(c.count), style: 'color:var(--ink-3);font-size:13px' })
            ]));
          });
          cPanel.appendChild(list);
          box.appendChild(cPanel);
        }
        return box;
      });
    });
  }

  /* ---------- 首页 ---------- */
  function home(params) {
    var q = params.q || '';
    var page = Number(params.page) || 1;
    var size = 9;
    var host = el('div', {});

    return Store.list({ page: page, size: size, keyword: q }).then(function (res) {
      return Store.stats().then(function (st) {
        /* Hero */
        var hero = el('section', { class: 'hero' });
        var hw = el('div', { class: 'wrap' });
        hw.appendChild(el('div', { class: 'hero-eyebrow' }, [txt('CYBERCRIME DEFENSE · 办案笔记')]));
        hw.appendChild(el('h1', {}, [txt('专注网络犯罪案件的程序与实体辩护')]));
        hw.appendChild(el('p', {}, [txt('熟悉公安机关执法规则，擅长电子数据审查；围绕计算机信息与数据类犯罪、网络侵权、网络诽谤、寻衅滋事，涉高科技与人工智能行业新型案件、非法经营，开设赌场、侵犯公民个人信息等类型的实体辩护与程序辩护，记录可复用的办案思路。')]));
        var stats = el('div', { class: 'hero-stats' });
        [['posts', st.posts], ['tags', st.tagsHint || ''], ['words', st.words]].forEach(function (pair, i) {
          if (pair[1] === '' && i === 1) return;
          var labels = { posts: '篇专业文章', tags: '个实务标签', words: '万字办案笔记' };
          var val = pair[1];
          if (i === 1) { return; }
          stats.appendChild(el('div', { class: 'hero-stat' }, [
            el('b', { text: String(val) }),
            el('span', { text: labels[pair[0]] })
          ]));
        });
        return Store.tags().then(function (tags) {
          stats.insertBefore(el('div', { class: 'hero-stat' }, [
            el('b', { text: String(tags.length) }),
            el('span', { text: '个实务标签' })
          ]), stats.children[1]);
          hw.appendChild(stats);
          hero.appendChild(hw);
          host.appendChild(hero);

          /* 内容区 */
          var sec = el('section', { class: 'section' });
          var w = el('div', { class: 'wrap' });

          var head = el('div', { class: 'section-head' });
          head.appendChild(el('h2', {}, [txt(q ? '搜索：' + q : '最新办案笔记')]));
          head.appendChild(el('span', { class: 'hint', text: res.total + ' 篇文章' }));
          head.appendChild(el('span', { class: 'grow hint', text: '共 ' + res.pages + ' 页 · 第 ' + res.page + ' 页' }));
          w.appendChild(head);

          /* 工具栏 */
          var bar = el('div', { class: 'toolbar' });
          var sb = el('div', { class: 'search-box' }, [
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">' +
            '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
          ].map(function (h) { var d = document.createElement('div'); d.innerHTML = h; return d.firstChild; }));
          var input = el('input', { type: 'search', placeholder: '搜索标题、正文或标签…', value: q });
          input.addEventListener('input', U.debounce(function () {
            App.go('#/?q=' + encodeURIComponent(input.value.trim()) + (input.value ? '' : ''));
          }, 420));
          sb.appendChild(input);
          bar.appendChild(sb);
          if (q) {
            bar.appendChild(el('a', { class: 'btn btn-ghost btn-sm', href: '#/', text: '清空条件' }));
          }
          bar.appendChild(el('a', { class: 'btn btn-ghost btn-sm', href: '#/tags', text: '全部标签' }));
          w.appendChild(bar);

          /* 列表 + 侧栏 */
          var cols = el('div', { style: 'display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:28px;align-items:start' });
          if (!res.list.length) {
            cols.appendChild(el('div', { class: 'empty' }, [
              el('b', { text: '没有匹配的文章' }),
              el('div', { text: '换个关键词试试，或者查看全部标签。' })
            ]));
          } else {
            var grid = el('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(300px,1fr))' });
            res.list.forEach(function (p) { grid.appendChild(postCard(p)); });
            cols.appendChild(grid);
          }
          sidePanel(q ? null : null).then(function (panel) { cols.appendChild(panel); });
          var sc = cols;
          w.appendChild(sc);

          /* 分页 */
          if (res.pages > 1) {
            var pager = el('div', { class: 'pager' });
            for (var i = 1; i <= res.pages; i++) {
              if (i === res.page) pager.appendChild(el('span', { class: 'cur', text: String(i) }));
              else pager.appendChild(el('a', { href: '#/?page=' + i + (q ? '&q=' + encodeURIComponent(q) : ''), text: String(i) }));
            }
            w.appendChild(pager);
          }
          sec.appendChild(w);
          host.appendChild(sec);
          return host;
        });
      });
    });
  }

  /* ---------- 文章详情 ---------- */
  function postView(slug) {
    return Store.get(slug).then(function (post) {
      if (!post) return notFound('没有找到这篇文章');
      Store.incView(post);

      var host = el('div', {});
      var head = el('div', { class: 'article-wrap' });
      var ph = el('div', { class: 'post-head' });
      ph.appendChild(el('div', { class: 'breadcrumb' }, [
        el('a', { href: '#/', text: '首页' }), txt(' / '),
        el('a', { href: '#/tags', text: '文章' }), txt(' / '),
        el('span', { text: post.category })
      ]));
      ph.appendChild(el('h1', {}, [txt(post.title)]));
      var meta = el('div', { class: 'post-meta' });
      meta.appendChild(txt('发布于 ' + U.fmtDate(post.createdAt)));
      meta.appendChild(txt('·'));
      meta.appendChild(txt('约 ' + U.readingTime(post.content) + ' 分钟'));
      meta.appendChild(txt('·'));
      meta.appendChild(txt((post.views || 0) + ' 次阅读'));
      meta.appendChild(txt('·'));
      meta.appendChild(txt('作者：' + post.author));
      if (post.status === 'draft') {
        meta.appendChild(el('span', { class: 'badge badge-draft', text: '草稿' }));
      }
      ph.appendChild(meta);

      var tags = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:14px' });
      (post.tags || []).forEach(function (t) {
        tags.appendChild(el('a', { class: 'tag tag-lg', href: '#/tag/' + encodeURIComponent(t), text: '# ' + t }));
      });
      ph.appendChild(tags);
      head.appendChild(ph);
      host.appendChild(head);

      if (post.cover) {
        var cw = el('div', { class: 'article-wrap' });
        cw.appendChild(el('div', { class: 'post-cover' }, [el('img', { src: post.cover, alt: post.title })]));
        host.appendChild(cw);
      }

      var toc = MD.toc(post.content);
      var bodyWrap = toc.length > 1 ? el('div', { class: 'with-toc' }) : el('div', { class: 'article-wrap' });
      var body = el('div', { class: 'md', html: MD.render(post.content) });
      if (toc.length > 1) {
        bodyWrap.appendChild(body);
        bodyWrap.appendChild(buildToc(toc, post.slug));
      } else {
        bodyWrap.appendChild(body);
      }
      host.appendChild(bodyWrap);

      /* 尾部 */
      var foot = el('div', { class: 'article-wrap' });
      var pf = el('div', { class: 'post-foot' });
      if (CFG.get('copyright')) {
        pf.appendChild(el('div', { class: 'disclaimer', text: CFG.get('copyright') }));
      }
      return Store.list({ size: 0 }).then(function (r) {
        var all = r.list, idx = -1;
        all.forEach(function (p, i) { if (p.slug === post.slug) idx = i; });
        var prev = idx > 0 ? all[idx - 1] : null;
        var next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
        var pn = el('div', { class: 'prev-next' });
        if (prev) pn.appendChild(el('a', { href: '#/post/' + encodeURIComponent(prev.slug) }, [
          el('span', { class: 'l', text: '上一篇' }), txt(prev.title)
        ]));
        if (next) pn.appendChild(el('a', { href: '#/post/' + encodeURIComponent(next.slug), style: 'text-align:right' }, [
          el('span', { class: 'l', text: '下一篇' }), txt(next.title)
        ]));
        if (prev || next) pf.appendChild(pn);
        foot.appendChild(pf);
        host.appendChild(foot);
        return host;
      });
    });
  }

  function buildToc(toc, slug) {
    var card = el('div', { class: 'toc-card' });
    card.appendChild(el('h4', {}, [txt('本文目录')]));
    var ol = el('ol');
    toc.forEach(function (h) {
      var li = el('li', { class: h.level === 3 ? 'lv3' : '' });
      var a = el('a', { href: '#/post/' + encodeURIComponent(slug), 'data-target': h.id, text: h.text });
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var t = document.getElementById(h.id);
        if (t) window.scrollTo({ top: t.offsetTop - 70, behavior: 'smooth' });
      });
      li.appendChild(a);
      ol.appendChild(li);
    });
    card.appendChild(ol);
    setTimeout(function () { observeToc(card); }, 60);
    return card;
  }

  function observeToc(card) {
    if (!U.$$('a[data-target]', card).length) return;
    // 移除上一个 TOC 的滚动监听，避免跨页面累积
    if (window.__tocHandler) {
      window.removeEventListener('scroll', window.__tocHandler);
      window.__tocHandler = null;
    }
    var links = U.$$('a[data-target]', card);
    function active() {
      var y = window.scrollY + 120, cur = null;
      links.forEach(function (a) {
        var t = document.getElementById(a.getAttribute('data-target'));
        if (t && t.offsetTop <= y) cur = a;
      });
      links.forEach(function (a) { a.classList.toggle('on', a === cur); });
    }
    var handler = U.debounce(active, 60);
    window.__tocHandler = handler;
    window.addEventListener('scroll', handler, { passive: true });
    active();
  }

  /* ---------- 标签归档 ---------- */
  function tagView(tag, extra) {
    var page = Number((extra && extra.page) || 1), size = 12;
    var host = el('div', {});
    return Store.list({ tag: tag, page: page, size: size }).then(function (res) {
      var sec = el('section', { class: 'section' });
      var w = el('div', { class: 'wrap' });
      var head = el('div', { class: 'section-head' });
      head.appendChild(el('h2', {}, [txt('标签归档')]));
      w.appendChild(head);
      w.appendChild(el('div', { class: 'toolbar' }, [
        el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, [
          el('span', { style: 'font-size:14px;color:var(--ink-3)', text: '标签：' }),
          el('a', { class: 'tag tag-lg tag-cat', href: '#/tag/' + encodeURIComponent(tag), text: '# ' + tag })
        ]),
        el('a', { class: 'btn btn-ghost btn-sm', href: '#/tags', style: 'margin-left:auto', text: '全部标签' })
      ]));
      if (!res.list.length) {
        w.appendChild(el('div', { class: 'empty' }, [el('b', { text: '该标签下暂无文章' })]));
      } else {
        var grid = el('div', { class: 'grid' });
        res.list.forEach(function (p) { grid.appendChild(postCard(p)); });
        w.appendChild(grid);
      }
      if (res.pages > 1) {
        var pager = el('div', { class: 'pager' });
        for (var i = 1; i <= res.pages; i++) {
          pager.appendChild(i === res.page
            ? el('span', { class: 'cur', text: String(i) })
            : el('a', { href: '#/tag/' + encodeURIComponent(tag) + '?page=' + i, text: String(i) }));
        }
        w.appendChild(pager);
      }
      sec.appendChild(w);
      host.appendChild(sec);
      return host;
    });
  }

  function categoryView(name) {
    var host = el('div', {});
    return Store.list({ category: name, size: 200 }).then(function (res) {
      var sec = el('section', { class: 'section' });
      var w = el('div', { class: 'wrap' });
      w.appendChild(el('div', { class: 'section-head' }, [
        el('h2', {}, [txt('分类：' + name)]),
        el('span', { class: 'hint', text: res.total + ' 篇' })
      ]));
      var grid = el('div', { class: 'grid' });
      res.list.forEach(function (p) { grid.appendChild(postCard(p)); });
      w.appendChild(grid);
      sec.appendChild(w);
      host.appendChild(sec);
      return host;
    });
  }

  function tagsView() {
    var host = el('div', {});
    return Promise.all([Store.tags(), Store.categories(), Store.list({ size: 0 })]).then(function (r) {
      var tags = r[0], cats = r[1], posts = r[2].list;
      var sec = el('section', { class: 'section' });
      var w = el('div', { class: 'wrap' });
      w.appendChild(el('div', { class: 'section-head' }, [
        el('h2', {}, [txt('全部标签')]),
        el('span', { class: 'hint', text: tags.length + ' 个标签 · ' + posts.length + ' 篇文章' })
      ]));
      var cloud = el('div', { class: 'panel' });
      var row = el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' });
      tags.forEach(function (t) {
        row.appendChild(el('a', { class: 'tag tag-lg', href: '#/tag/' + encodeURIComponent(t.name) }, [
          txt(t.name), el('span', { class: 'n', text: String(t.count) })
        ]));
      });
      cloud.appendChild(row);
      w.appendChild(cloud);

      /* 归档表 */
      var arch = el('div', { class: 'panel', style: 'margin-top:20px' });
      arch.appendChild(el('h3', {}, [txt('全部文章')]));
      var list = el('ul', { style: 'list-style:none;margin:0;padding:0' });
      posts.forEach(function (p) {
        list.appendChild(el('li', {
          style: 'display:flex;gap:12px;align-items:baseline;padding:9px 0;border-bottom:1px dashed var(--line)'
        }, [
          el('span', { style: 'font-size:12.5px;color:var(--ink-3);min-width:88px', text: U.fmtDate(p.createdAt) }),
          el('a', { href: '#/post/' + encodeURIComponent(p.slug), style: 'font-size:15px', text: p.title }),
          el('span', { style: 'margin-left:auto;font-size:12px;color:var(--ink-3)', text: p.category })
        ]));
      });
      arch.appendChild(list);
      w.appendChild(arch);
      sec.appendChild(w);
      host.appendChild(sec);
      return host;
    });
  }

  /* ---------- 关于 ---------- */
  function aboutView() {
    var host = el('div', {});
    var sec = el('section', { class: 'section' });
    var w = el('div', { class: 'wrap' });
    w.appendChild(el('div', { class: 'section-head' }, [
      el('h2', {}, [txt('关于本站')]),
      el('span', { class: 'hint', text: '律师简介 · 业务方向 · 联系方式' })
    ]));

    var av = CFG.get('avatar');
    var profile = el('div', { class: 'profile' });
    profile.appendChild(av
      ? el('div', { class: 'avatar-box' }, [el('img', { src: av, style: 'width:100%;height:100%;object-fit:cover' })])
      : el('div', { class: 'avatar-box' }, [txt(CFG.get('logoText') || '律')]));

    var right = el('div', {});
    right.appendChild(el('h3', { style: 'font-family:var(--serif);font-size:26px;margin:0 0 4px;color:var(--navy)', text: CFG.get('lawyerName') }));
    right.appendChild(el('div', { style: 'color:var(--gold);font-size:14.5px;margin-bottom:14px', text: CFG.get('lawyerTitle') }));
    right.appendChild(el('p', { style: 'color:var(--ink-2);font-size:15px', text: CFG.get('intro') || '本站主要用于记录网络犯罪案件的辩护实务，包括常见罪名的适用边界、证据审查方法以及程序性权利的行使时机。' }));

    var info = el('ul', { class: 'info-list' });
    [        ['执业机构', CFG.get('firm')], ['所在城市', CFG.get('city')],
         ['联系电话', CFG.get('phone')], ['电子邮箱', CFG.get('email')],
         ['执业证号', CFG.get('licenseNo')], ['微信', CFG.get('wechat')],
         ['办公地址', CFG.get('address')]].forEach(function (p) {
      if (!p[1]) return;
      info.appendChild(el('li', {}, [el('b', { text: p[0] }), el('span', { text: p[1] })]));
    });
    right.appendChild(info);
    profile.appendChild(right);

    return Store.stats().then(function (st) {
      return Store.tags().then(function (tags) {
        var stats = el('div', { class: 'stat-row' }, [
          el('div', {}, [el('b', { text: String(st.posts) }), el('span', { text: '篇公开发文' })]),
          el('div', {}, [el('b', { text: String(tags.length) }), el('span', { text: '个实务标签' })]),
          el('div', {}, [el('b', { text: String(st.words) }), el('span', { text: '万字办案笔记' })])
        ]);
        right.appendChild(stats);
        w.appendChild(profile);

        function panel(title, items, ordered, full) {
          if (!items || !items.length) return null;
          var box = el('div', { class: full ? 'panel' : 'panel', style: full ? 'margin-top:20px' : '' });
          box.appendChild(el('h3', {}, [txt(title)]));
          var list = ordered ? el('ol') : el('ul');
          items.forEach(function (s) { list.appendChild(el('li', {}, [txt(s)])); });
          box.appendChild(list);
          return box;
        }

        var extraPanels = [];
        if (CFG.get('honors') && CFG.get('honors').length) {
          extraPanels.push(panel('执业经历与社会职务', CFG.get('honors'), false, true));
        }
        ['education|教育背景', 'publications|著述与研究成果', 'caseHighlight|代理案例（部分）'].forEach(function (pair) {
          var key = pair.split('|')[0], label = pair.split('|')[1];
          var p = panel(label, CFG.get(key), false, true);
          if (p) extraPanels.push(p);
        });
        var panels = el('div', { class: 'grid-2', style: 'margin-top:22px' });
        var prac = el('div', { class: 'panel' });
        prac.appendChild(el('h3', {}, [txt('业务范围')]));
        var ul1 = el('ul');
        (CFG.get('practice').length ? CFG.get('practice') : [
          '帮助信息网络犯罪活动罪的罪名与量刑辩护',
          '侵犯公民个人信息罪的条数认定与证据审查',
          '电信网络诈骗案件的数额切割与从犯地位辩护',
          '非法获取计算机信息系统数据罪的适用边界',
          '掩饰、隐瞒犯罪所得罪的罪名区分辩护',
          '电子数据的取证合法性审查与非法证据排除'
        ]).forEach(function (s) { ul1.appendChild(el('li', {}, [txt(s)])); });
        prac.appendChild(ul1);
        panels.appendChild(prac);

        var way = el('div', { class: 'panel' });
        way.appendChild(el('h3', {}, [txt('委托与咨询')]));
        way.appendChild(el('p', { style: 'color:var(--ink-2);font-size:14.5px', text: CFG.get('consultation') || '刑事案件涉及人身自由，会见、阅卷与申请取保候审均有严格时限。如遇紧急情况，请优先通过电话联系，并在留言中简要说明涉嫌罪名、办案单位与羁押场所。' }));
        var ul2 = el('ul');
        [['电话', CFG.get('phone')], ['邮箱', CFG.get('email')], ['微信', CFG.get('wechat')]].forEach(function (p) {
          if (p[1]) ul2.appendChild(el('li', {}, [txt(p[0] + '：' + p[1])]));
        });
        if (ul2.children.length) way.appendChild(ul2);
        panels.appendChild(way);

        w.appendChild(panels);
        extraPanels.forEach(function (pn) { w.appendChild(pn); });
        sec.appendChild(w);
        host.appendChild(sec);
        return host;
      });
    });
  }

  function notFound(msg) {
    var host = el('div', {});
    var sec = el('section', { class: 'section' });
    var w = el('div', { class: 'wrap' });
    w.appendChild(el('div', { class: 'empty' }, [
      el('b', { text: msg || '页面不存在' }),
      el('div', { style: 'margin-top:14px' }, [el('a', { class: 'btn btn-primary', href: '#/', text: '返回首页' })])
    ]));
    sec.appendChild(w);
    host.appendChild(sec);
    return host;
  }

  window.LB.views = {
    home: home,
    post: postView,
    tag: tagView,
    tags: tagsView,
    category: categoryView,
    about: aboutView,
    notFound: notFound,
    postCard: postCard
  };
})(window);
