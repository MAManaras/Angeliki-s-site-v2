/**
 * Navigation — sticky header, mobile menu, smooth scroll, active state
 */
(function () {
  const header = document.getElementById('header');
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.mobile-menu__overlay');
  const navLinks = document.querySelectorAll('.header__nav-link');
  const mobileLinks = document.querySelectorAll('.mobile-menu__link');
  const sections = document.querySelectorAll('section[id]');

  // Sticky header shadow on scroll
  function handleScroll() {
    if (window.scrollY > 20) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  // Mobile menu toggle
  function openMenu() {
    hamburger.classList.add('is-active');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('is-open');
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    hamburger.classList.remove('is-active');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (hamburger) {
    hamburger.addEventListener('click', function () {
      if (mobileMenu.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeMenu);
  }

  // Close mobile menu on link click
  mobileLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
      closeMenu();
    }
  });

  // Active nav state on scroll (IntersectionObserver)
  if (sections.length > 0 && navLinks.length > 0) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');

            navLinks.forEach(function (link) {
              link.classList.remove('is-active');
              if (link.getAttribute('href') === '#' + id) {
                link.classList.add('is-active');
              }
            });
          }
        });
      },
      {
        rootMargin: '-20% 0px -80% 0px',
      }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }
})();
