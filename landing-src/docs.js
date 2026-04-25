(function () {
  'use strict';

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function buildToc() {
    var content = document.querySelector('[data-doc-content]');
    var list = document.querySelector('[data-doc-toc]');
    if (!content || !list) return [];

    var headings = content.querySelectorAll('h2, h3');
    var items = [];
    headings.forEach(function (h) {
      if (!h.id) h.id = slugify(h.textContent);
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      if (h.tagName === 'H3') a.classList.add('is-h3');
      list.appendChild(a);
      items.push({ id: h.id, el: h, link: a });
    });
    return items;
  }

  function wireActiveTocTracking(items) {
    if (!items.length || !('IntersectionObserver' in window)) return;
    var active = null;
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          var item = items.find(function (i) { return i.el === e.target; });
          if (!item) return;
          item._visible = e.isIntersecting;
        });
        var first = items.find(function (i) { return i._visible; });
        if (first && first !== active) {
          if (active) active.link.classList.remove('is-active');
          first.link.classList.add('is-active');
          active = first;
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    items.forEach(function (i) { obs.observe(i.el); });
  }

  function addCopyButtons() {
    document.querySelectorAll('.doc-content pre').forEach(function (pre) {
      if (pre.querySelector('.copy-btn')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.setAttribute('aria-label', 'Copy');
      btn.textContent = '⧉';
      btn.style.cssText = 'position:absolute;top:8px;right:8px;width:26px;height:26px;border:1px solid var(--border);background:var(--secondary);color:var(--muted-foreground);border-radius:4px;cursor:pointer;font-family:inherit;font-size:13px;';
      btn.addEventListener('click', function () {
        var code = pre.querySelector('code');
        var text = code ? code.innerText : pre.innerText;
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = '✓';
          btn.style.color = 'var(--ui-teal)';
          setTimeout(function () {
            btn.textContent = '⧉';
            btn.style.color = 'var(--muted-foreground)';
          }, 1400);
        });
      });
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var items = buildToc();
    wireActiveTocTracking(items);
    addCopyButtons();
  }
})();
