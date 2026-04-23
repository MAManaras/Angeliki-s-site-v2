/**
 * Accordion — enhanced <details>/<summary> with animated height
 */
(function () {
  var items = document.querySelectorAll('.accordion__item');

  function closeItem(item) {
    var content = item.querySelector('.accordion__content');
    if (!content || !item.hasAttribute('open')) return;

    content.style.maxHeight = content.scrollHeight + 'px';
    content.style.overflow = 'hidden';
    content.style.transition = 'max-height 0.3s ease';
    // Force reflow
    content.offsetHeight;
    content.style.maxHeight = '0';

    content.addEventListener(
      'transitionend',
      function handler() {
        item.removeAttribute('open');
        content.style.maxHeight = '';
        content.style.overflow = '';
        content.style.transition = '';
        content.removeEventListener('transitionend', handler);
      },
      { once: true }
    );
  }

  function openItem(item) {
    var content = item.querySelector('.accordion__content');
    if (!content) return;

    item.setAttribute('open', '');
    content.style.overflow = 'hidden';
    content.style.maxHeight = '0';
    content.style.transition = 'max-height 0.3s ease';
    content.offsetHeight;
    content.style.maxHeight = content.scrollHeight + 'px';

    content.addEventListener(
      'transitionend',
      function handler() {
        content.style.maxHeight = '';
        content.style.overflow = '';
        content.style.transition = '';
        content.removeEventListener('transitionend', handler);
      },
      { once: true }
    );
  }

  items.forEach(function (item) {
    var summary = item.querySelector('.accordion__trigger');
    if (!summary) return;

    summary.addEventListener('click', function (e) {
      e.preventDefault();

      if (item.hasAttribute('open')) {
        closeItem(item);
      } else {
        // Close other open items
        items.forEach(function (other) {
          if (other !== item && other.hasAttribute('open')) {
            closeItem(other);
          }
        });
        openItem(item);
      }
    });
  });
})();
