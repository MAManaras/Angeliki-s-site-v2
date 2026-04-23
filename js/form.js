/**
 * Contact Form — client-side validation
 */
(function () {
  var form = document.getElementById('contactForm');
  if (!form) return;

  var successEl = document.getElementById('formSuccess');

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    if (!phone) return true; // optional field
    return /^[\d\s\-+().]{7,20}$/.test(phone);
  }

  function setError(input, show) {
    if (show) {
      input.classList.add('form__input--error');
      input.classList.add('form__select--error');
      input.classList.add('form__textarea--error');
    } else {
      input.classList.remove('form__input--error');
      input.classList.remove('form__select--error');
      input.classList.remove('form__textarea--error');
    }
  }

  // Clear errors on input
  form.querySelectorAll('.form__input, .form__select, .form__textarea').forEach(function (input) {
    input.addEventListener('input', function () {
      setError(input, false);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var isValid = true;

    // Name
    var name = form.querySelector('#name');
    if (!name.value.trim()) {
      setError(name, true);
      isValid = false;
    }

    // Email
    var email = form.querySelector('#email');
    if (!validateEmail(email.value.trim())) {
      setError(email, true);
      isValid = false;
    }

    // Phone (optional)
    var phone = form.querySelector('#phone');
    if (!validatePhone(phone.value.trim())) {
      setError(phone, true);
      isValid = false;
    }

    // Message
    var message = form.querySelector('#message');
    if (!message.value.trim()) {
      setError(message, true);
      isValid = false;
    }

    if (!isValid) {
      // Focus first error
      var firstError = form.querySelector('.form__input--error, .form__textarea--error');
      if (firstError) firstError.focus();
      return;
    }

    // Success — in a real site this would submit to a backend
    form.style.display = 'none';
    if (successEl) {
      successEl.classList.add('is-visible');
    }
  });
})();
