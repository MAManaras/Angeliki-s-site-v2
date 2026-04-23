/**
 * Main — initialize all modules
 * All modules are self-initializing IIFEs, so this file handles
 * any cross-cutting initialization.
 */
(function () {
  // Set current year in footer copyright
  var copyrightEl = document.querySelector('.footer__bottom p');
  if (copyrightEl) {
    var text = copyrightEl.textContent || copyrightEl.innerText;
    var currentYear = new Date().getFullYear();
    copyrightEl.textContent = text.replace(/\d{4}/, currentYear);
  }
})();
