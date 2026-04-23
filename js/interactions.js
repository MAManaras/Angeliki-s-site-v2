/**
 * Micro-interactions & depth
 *  - Layered parallax (writes --py on [data-parallax])
 *  - Magnetic buttons (writes --mag-x / --mag-y within pull radius)
 *  - Nearest-paragraph spotlight (writes --px / --py, .is-lit)
 *  - Word-by-word text reveal for [data-split]
 *  - Haptic tap feedback (touchstart scale + navigator.vibrate)
 */
(function () {
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     Layered parallax — sets --py on each [data-parallax] element.
     Wrappers use transform: translate3d(0, var(--py), 0) in CSS,
     so inner children can still run their own animations.
     ========================================================= */
  if (!prefersReducedMotion) {
    var parallaxEls = document.querySelectorAll('[data-parallax]');
    if (parallaxEls.length) {
      var pTicking = false;
      function onParallaxScroll() {
        if (pTicking) return;
        window.requestAnimationFrame(function () {
          var y = window.pageYOffset;
          parallaxEls.forEach(function (el) {
            var speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
            el.style.setProperty('--py', (y * speed * -1) + 'px');
          });
          pTicking = false;
        });
        pTicking = true;
      }
      window.addEventListener('scroll', onParallaxScroll, { passive: true });
      onParallaxScroll();
    }
  }

  /* =========================================================
     Magnetic buttons
     Pull strength: up to 8px within 60px of the center.
     ========================================================= */
  if (!prefersReducedMotion && !('ontouchstart' in window)) {
    var magBtns = document.querySelectorAll('[data-magnetic]');
    var MAG_RADIUS = 60;   // cursor distance where pull kicks in
    var MAG_STRENGTH = 0.25; // fraction of delta applied

    magBtns.forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var dist = Math.hypot(dx, dy);
        if (dist < r.width / 2 + MAG_RADIUS) {
          btn.style.setProperty('--mag-x', (dx * MAG_STRENGTH) + 'px');
          btn.style.setProperty('--mag-y', (dy * MAG_STRENGTH) + 'px');
        }
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.setProperty('--mag-x', '0px');
        btn.style.setProperty('--mag-y', '0px');
      });
    });
  }

  /* =========================================================
     Nearest-paragraph spotlight
     Tracks cursor; applies .is-lit to the closest [data-spotlight]
     within a generous proximity threshold.
     ========================================================= */
  if (!prefersReducedMotion) {
    var spotlights = document.querySelectorAll('[data-spotlight]');
    if (spotlights.length) {
      var SPOT_THRESHOLD = 320; // px from paragraph center
      var lit = null;
      var spotTicking = false;

      function onSpotMove(e) {
        if (spotTicking) return;
        spotTicking = true;
        window.requestAnimationFrame(function () {
          var mx = e.clientX, my = e.clientY;
          var nearest = null;
          var nearestDist = Infinity;
          var nearestRect = null;

          spotlights.forEach(function (el) {
            var r = el.getBoundingClientRect();
            // skip off-screen paragraphs
            if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
            var cx = r.left + r.width / 2;
            var cy = r.top + r.height / 2;
            var d = Math.hypot(mx - cx, my - cy);
            if (d < nearestDist) {
              nearestDist = d;
              nearest = el;
              nearestRect = r;
            }
          });

          if (nearest && nearestDist < SPOT_THRESHOLD) {
            if (lit && lit !== nearest) lit.classList.remove('is-lit');
            nearest.classList.add('is-lit');
            var relX = ((mx - nearestRect.left) / nearestRect.width) * 100;
            var relY = ((my - nearestRect.top) / nearestRect.height) * 100;
            nearest.style.setProperty('--px', relX + '%');
            nearest.style.setProperty('--py', relY + '%');
            lit = nearest;
          } else if (lit) {
            lit.classList.remove('is-lit');
            lit = null;
          }
          spotTicking = false;
        });
      }
      window.addEventListener('mousemove', onSpotMove, { passive: true });
    }
  }

  /* =========================================================
     Word-by-word split text
     Wrap each word of a [data-split] element in <span class="word">
     and add class split-text so CSS transitions take effect.
     Reveal on scroll (IntersectionObserver).
     ========================================================= */
  (function splitText() {
    var splitEls = document.querySelectorAll('[data-split]');
    if (!splitEls.length) return;

    splitEls.forEach(function (el) {
      if (el.dataset.splitDone) return;
      var text = el.textContent.trim();
      if (!text) return;
      var words = text.split(/\s+/);
      el.textContent = '';
      words.forEach(function (w, i) {
        var span = document.createElement('span');
        span.className = 'word';
        span.style.setProperty('--word-index', i);
        span.textContent = w;
        el.appendChild(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
      el.classList.add('split-text');
      el.dataset.splitDone = '1';
    });

    if (prefersReducedMotion) {
      splitEls.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -50px 0px' });

    splitEls.forEach(function (el) { obs.observe(el); });

    // Re-split on language change, preserving reveal state
    window.addEventListener('i18n:changed', function () {
      splitEls.forEach(function (el) {
        delete el.dataset.splitDone;
        var wasRevealed = el.classList.contains('is-revealed');
        var text = el.textContent.trim();
        var words = text.split(/\s+/);
        el.textContent = '';
        words.forEach(function (w, i) {
          var span = document.createElement('span');
          span.className = 'word';
          span.style.setProperty('--word-index', i);
          span.textContent = w;
          el.appendChild(span);
          if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        });
        el.classList.add('split-text');
        el.dataset.splitDone = '1';
        if (wasRevealed) {
          // re-trigger staggered reveal
          el.classList.remove('is-revealed');
          // eslint-disable-next-line no-unused-expressions
          el.offsetHeight; // reflow
          el.classList.add('is-revealed');
        }
      });
    });
  })();

  /* =========================================================
     Haptic-style tap feedback
     ========================================================= */
  var TAP_SELECTOR = [
    '.btn',
    '.header__nav-link',
    '.mobile-menu__link',
    '.card',
    '.accordion__trigger',
    '.lang-switch__btn',
    '.card__link',
    '[data-haptic]'
  ].join(',');

  document.addEventListener('touchstart', function (e) {
    var target = e.target.closest(TAP_SELECTOR);
    if (!target) return;
    target.classList.add('is-tapped');
    if (navigator.vibrate) {
      try { navigator.vibrate(10); } catch (_) {}
    }
  }, { passive: true });

  ['touchend', 'touchcancel'].forEach(function (evt) {
    document.addEventListener(evt, function () {
      document.querySelectorAll('.is-tapped').forEach(function (el) {
        setTimeout(function () { el.classList.remove('is-tapped'); }, 120);
      });
    }, { passive: true });
  });
})();
