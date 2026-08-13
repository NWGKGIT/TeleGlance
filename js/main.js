/* ============================================================
   main.js — TeleGlance Documentation
   Handles: sidebar, scroll spy, copy buttons, scroll-to-top
   ============================================================ */

(function () {
  'use strict';

  /* ── Sidebar Toggle (Mobile) ─────────────────────────────── */
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger');

  function openSidebar() {
    sidebar && sidebar.classList.add('open');
    overlay && overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar && sidebar.classList.remove('open');
    overlay && overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  hamburger && hamburger.addEventListener('click', openSidebar);
  overlay   && overlay.addEventListener('click', closeSidebar);

  /* Close sidebar on nav link click (mobile) */
  sidebar && sidebar.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  /* ── Copy Buttons ────────────────────────────────────────── */
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = btn.closest('.code-block').querySelector('pre code');
      if (!pre) return;
      var text = pre.innerText || pre.textContent;
      navigator.clipboard.writeText(text).then(function () {
        var orig = btn.innerHTML;
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.innerHTML = orig;
          btn.classList.remove('copied');
        }, 1800);
      });
    });
  });

  /* ── Right TOC Scroll Spy ────────────────────────────────── */
  var tocLinks = document.querySelectorAll('.toc-list a');
  if (tocLinks.length) {
    var headings = Array.from(document.querySelectorAll('.prose h2, .prose h3'));
    var topbarH  = parseInt(getComputedStyle(document.documentElement)
                    .getPropertyValue('--topbar-h')) || 60;

    function getActiveHeading() {
      var scrollY = window.scrollY + topbarH + 40;
      var active  = null;
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top + window.scrollY <= scrollY) {
          active = headings[i];
        }
      }
      return active;
    }

    function updateToc() {
      var activeH = getActiveHeading();
      tocLinks.forEach(function (link) {
        link.classList.remove('active');
        if (activeH && link.getAttribute('href') === '#' + activeH.id) {
          link.classList.add('active');
        }
      });
    }

    window.addEventListener('scroll', updateToc, { passive: true });
    updateToc();
  }

  /* ── Scroll-to-Top Button ────────────────────────────────── */
  var scrollTopBtn = document.getElementById('scroll-top');
  if (scrollTopBtn) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    }, { passive: true });
    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── Active Sidebar Link ─────────────────────────────────── */
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-nav a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  /* ── Auto-build TOC from headings ────────────────────────── */
  var tocList = document.getElementById('toc-list');
  if (tocList) {
    var proseEl = document.querySelector('.prose');
    if (proseEl) {
      var hs = proseEl.querySelectorAll('h2, h3');
      hs.forEach(function (h) {
        if (!h.id) {
          h.id = h.textContent.trim()
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        }
        var li = document.createElement('li');
        li.className = h.tagName === 'H3' ? 'toc-h3' : '';
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        li.appendChild(a);
        tocList.appendChild(li);
      });
    }
  }

  /* ── Ensure all code blocks have copy button + lang label ── */
  /* (Only needed if using hljs auto-detect; our blocks are explicit) */

})();
