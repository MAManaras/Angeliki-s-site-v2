/**
 * Scroll Animations — IntersectionObserver reveals with stagger support
 * Also handles:
 *  - .reveal-group (stagger children)
 *  - Card cursor-follow glow (--mx / --my)
 *  - Subtle parallax for [data-parallax] elements
 */
(function () {
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Make all reveal targets immediately visible if reduced motion
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal, .reveal-group').forEach(function (el) {
      el.classList.add('is-visible');
    });
    return;
  }

  /* ---------- Scroll reveals ---------- */
  var targets = document.querySelectorAll('.reveal, .reveal-group');
  if (targets.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Card cursor-follow glow ---------- */
  var cards = document.querySelectorAll('.card');
  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    });
    card.addEventListener('mouseleave', function () {
      card.style.removeProperty('--mx');
      card.style.removeProperty('--my');
    });
  });

  /* ---------- 4-2-6 breathing orb label sync ----------
     Cycle total 12s: Inhale 4s → Hold 2s → Exhale 6s. */
  var orbText = document.querySelector('[data-breathing-text]');
  if (orbText) {
    var phaseKeys = ['inhale', 'hold', 'exhale'];
    var CYCLE = 12000;            // ms
    var INHALE_END = 4000;        // 0 → 4s
    var HOLD_END   = 6000;        // 4 → 6s
    // exhale: 6 → 12s
    var cycleStart = performance.now();
    var currentPhase = -1;
    function i18nText(key) {
      // Prefer live translation lookup if i18n module is ready
      if (window.i18n && typeof window.i18n.t === 'function') {
        var value = window.i18n.t('hero.breathe.' + key);
        if (value) return value;
      }
      // Fallback based on current document language
      var isEl = (document.documentElement.lang || 'el').indexOf('el') === 0;
      var fallback = {
        inhale: isEl ? 'Εισπνέω' : 'Inhaling',
        hold:   isEl ? 'Κρατώ'   : 'Holding',
        exhale: isEl ? 'Εκπνέω'  : 'Exhaling'
      };
      return fallback[key];
    }
    function tick(now) {
      var elapsed = (now - cycleStart) % CYCLE;
      var phase = elapsed < INHALE_END ? 0 : elapsed < HOLD_END ? 1 : 2;
      if (phase !== currentPhase) {
        currentPhase = phase;
        orbText.textContent = i18nText(phaseKeys[phase]);
        orbText.setAttribute('data-i18n', 'hero.breathe.' + phaseKeys[phase]);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // Re-sync on language change
    window.addEventListener('i18n:changed', function () {
      currentPhase = -1; // force refresh on next tick
    });
  }

  /* ---------- Subtle parallax for decorative elements ---------- */
  var parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length) {
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      window.requestAnimationFrame(function () {
        var y = window.pageYOffset;
        parallaxEls.forEach(function (el) {
          var speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
          el.style.transform = 'translate3d(0,' + (y * speed * -1) + 'px, 0)';
        });
        ticking = false;
      });
      ticking = true;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
