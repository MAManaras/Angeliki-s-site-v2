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
