/**
 * i18n — Bilingual translation engine
 * Greek is the default language embedded in HTML.
 * English translations loaded from JSON on demand.
 */
(function () {
  var STORAGE_KEY = 'site-lang';
  var DEFAULT_LANG = 'el';
  var translations = {};
  var currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;

  // Resolve nested key like "hero.title" from an object
  function resolve(obj, path) {
    return path.split('.').reduce(function (acc, key) {
      return acc && acc[key] !== undefined ? acc[key] : null;
    }, obj);
  }

  // Determine base path for i18n JSON files
  function getBasePath() {
    var scripts = document.querySelectorAll('script[src*="i18n.js"]');
    if (scripts.length > 0) {
      var src = scripts[0].getAttribute('src');
      // src is like "js/i18n.js" or "../js/i18n.js"
      var parts = src.split('/');
      parts.pop(); // remove "i18n.js"
      parts.pop(); // remove "js"
      var base = parts.join('/');
      return base ? base + '/i18n/' : 'i18n/';
    }
    return 'i18n/';
  }

  // Load a translation file
  function loadTranslations(lang, callback) {
    if (translations[lang]) {
      callback(translations[lang]);
      return;
    }

    var basePath = getBasePath();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', basePath + lang + '.json', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          translations[lang] = JSON.parse(xhr.responseText);
        } catch (e) {
          translations[lang] = {};
        }
        callback(translations[lang]);
      } else {
        callback({});
      }
    };
    xhr.onerror = function () {
      callback({});
    };
    xhr.send();
  }

  // Apply translations to the DOM
  function applyTranslations(data) {
    // Text content
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var value = resolve(data, key);
      if (value !== null) {
        // For title element, set document.title
        if (el.tagName === 'TITLE') {
          document.title = value;
        } else {
          el.textContent = value;
        }
      }
    });

    // HTML content (trusted only)
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      var value = resolve(data, key);
      if (value !== null) {
        el.innerHTML = value;
      }
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var value = resolve(data, key);
      if (value !== null) {
        el.setAttribute('placeholder', value);
      }
    });

    // Aria labels
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      var value = resolve(data, key);
      if (value !== null) {
        el.setAttribute('aria-label', value);
      }
    });

    // Update html lang attribute
    document.documentElement.setAttribute('lang', currentLang);
  }

  // Set language
  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    // Update switcher UI
    document.querySelectorAll('.lang-switch__btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-lang') === lang);
    });

    loadTranslations(lang, applyTranslations);
  }

  // Initialize language switcher buttons
  document.querySelectorAll('.lang-switch__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.getAttribute('data-lang');
      if (lang !== currentLang) {
        setLanguage(lang);
      }
    });
  });

  // Apply saved language on page load
  if (currentLang !== DEFAULT_LANG) {
    setLanguage(currentLang);
  } else {
    // Load Greek translations too for consistency
    loadTranslations('el', function () {
      // Update switcher state
      document.querySelectorAll('.lang-switch__btn').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-lang') === 'el');
      });
    });
  }

  // Expose globally for standalone pages
  window.i18n = {
    setLanguage: setLanguage,
    getCurrentLang: function () {
      return currentLang;
    },
  };
})();
