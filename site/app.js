/* OAA 16 Landing — form + slider logic, ported from OAA 16 Landing.dc.html */
(function () {
  'use strict';

  var WHATSAPP_LINK = 'https://chat.whatsapp.com/E7NI1vNHNKgEQeGOUjSxWd?mode=gi_t';

  // Supabase — paste your Project URL and anon/publishable key from
  // Project Settings → API. Leave empty to run the form without a backend.
  var SUPABASE_URL = 'https://gbrbmtwpugxmenrfkloh.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_i9sm2any3EigKUBkxCv7Jg_j0UmtOac';
  var sb = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var HOUSES = {
    Male: ['Aggrey House', 'Livingstone House', 'Lugard House', 'Cadbury House', 'Guggisberg House', 'Gyamfi House', 'Fraser House', 'Kwapong House'],
    Female: ['Clark House', 'Kingsley House', 'Slessor House', 'McCarthy House', 'Baeta House', 'OAA House', 'SOA House']
  };

  var form = $('#oaa-form');
  var step1 = $('#step-1');
  var step2 = $('#step-2');
  var formState = $('#form-state');
  var submittedState = $('#submitted-state');

  $('#whatsapp-cta').href = WHATSAPP_LINK;

  /* ---------- Errors ---------- */

  var fieldInputs = {
    firstName: $('#oaa-first'),
    lastName: $('#oaa-last'),
    email: $('#oaa-email'),
    gender: $('#oaa-gender'),
    phone: $('#oaa-phone'),
    waPhone: $('#oaa-wa'),
    house: $('#oaa-house'),
    classGroup: $('#oaa-class')
  };

  function showErrors(errors) {
    $$('.error-msg').forEach(function (el) {
      var key = el.getAttribute('data-error-for');
      if (errors[key]) {
        el.textContent = errors[key];
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });
    Object.keys(fieldInputs).forEach(function (key) {
      fieldInputs[key].classList.toggle('has-error', !!errors[key]);
    });
  }

  function clearError(key) {
    var el = document.querySelector('[data-error-for="' + key + '"]');
    if (el) el.hidden = true;
    if (fieldInputs[key]) fieldInputs[key].classList.remove('has-error');
  }

  Object.keys(fieldInputs).forEach(function (key) {
    fieldInputs[key].addEventListener('input', function () { clearError(key); });
    fieldInputs[key].addEventListener('change', function () { clearError(key); });
  });

  /* ---------- Validation ---------- */

  var phoneRe = /^\d{7,12}$/;
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function digitsOf(value) { return value.replace(/[\s\-().]/g, ''); }

  function validateStep1() {
    var errors = {};
    if (!fieldInputs.firstName.value.trim()) errors.firstName = 'Required';
    if (!fieldInputs.lastName.value.trim()) errors.lastName = 'Required';
    var email = fieldInputs.email.value.trim();
    if (!email) errors.email = 'Required';
    else if (!emailRe.test(email)) errors.email = 'Enter a valid email';
    if (!fieldInputs.gender.value) errors.gender = 'Required';
    var digits = digitsOf(fieldInputs.phone.value);
    if (!digits) errors.phone = 'Required';
    else if (!phoneRe.test(digits)) errors.phone = 'Enter a valid phone number';
    if (!$('#oaa-is-wa').checked) {
      var waDigits = digitsOf(fieldInputs.waPhone.value);
      if (!waDigits) errors.waPhone = 'Required';
      else if (!phoneRe.test(waDigits)) errors.waPhone = 'Enter a valid phone number';
    }
    if (!document.querySelector('input[name="ingroup"]:checked')) errors.inGroup = 'Please choose Yes or No';
    return errors;
  }

  function validateStep2() {
    var errors = {};
    if (!fieldInputs.house.value) errors.house = 'Required';
    if (!fieldInputs.classGroup.value) errors.classGroup = 'Required';
    return errors;
  }

  /* ---------- House options (filtered by gender) ---------- */

  function populateHouses() {
    var select = fieldInputs.house;
    var gender = fieldInputs.gender.value;
    var current = select.value;
    select.innerHTML = '';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select house…';
    select.appendChild(placeholder);
    var genders = gender ? [gender] : ['Male', 'Female'];
    genders.forEach(function (g) {
      var group = document.createElement('optgroup');
      group.label = g === 'Male' ? "Boys' houses" : "Girls' houses";
      HOUSES[g].forEach(function (name) {
        var opt = document.createElement('option');
        opt.textContent = name;
        group.appendChild(opt);
      });
      select.appendChild(group);
    });
    // keep the selection when it's still valid for the chosen gender
    select.value = current;
    if (select.value !== current) select.value = '';
  }

  fieldInputs.gender.addEventListener('change', populateHouses);
  populateHouses();

  /* ---------- Step navigation ---------- */

  $('#next-btn').addEventListener('click', function () {
    var errors = validateStep1();
    showErrors(errors);
    if (Object.keys(errors).length) return;
    step1.hidden = true;
    step2.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#back-btn').addEventListener('click', function () {
    showErrors({});
    step2.hidden = true;
    step1.hidden = false;
  });

  /* ---------- WhatsApp field toggle ---------- */

  var waField = $('#wa-field');
  var isWaCheckbox = $('#oaa-is-wa');

  function syncWaField() {
    waField.hidden = isWaCheckbox.checked;
    if (isWaCheckbox.checked) clearError('waPhone');
  }
  isWaCheckbox.addEventListener('change', syncWaField);
  syncWaField();

  /* ---------- In-group radios ---------- */

  $$('input[name="ingroup"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      clearError('inGroup');
      $('#invite-hint').hidden = radio.value !== 'no';
    });
  });

  /* ---------- Description counter ---------- */

  var desc = $('#oaa-desc');
  var descCount = $('#desc-count');
  desc.addEventListener('input', function () {
    descCount.textContent = String(desc.value.length);
  });

  /* ---------- Submit ---------- */

  var registerBtn = $('#register-btn');
  var submitError = $('#submit-error');

  function showSuccess() {
    formState.hidden = true;
    submittedState.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setSubmitting(on) {
    registerBtn.disabled = on;
    registerBtn.textContent = on ? 'Submitting…' : 'Register';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errors = validateStep2();
    showErrors(errors);
    if (Object.keys(errors).length) return;

    var payload = {
      firstName: fieldInputs.firstName.value.trim(),
      lastName: fieldInputs.lastName.value.trim(),
      nickname: $('#oaa-nickname').value.trim(),
      email: fieldInputs.email.value.trim(),
      gender: fieldInputs.gender.value,
      countryCode: $('#oaa-cc').value,
      phone: digitsOf(fieldInputs.phone.value),
      isWhatsApp: isWaCheckbox.checked,
      waCountryCode: $('#oaa-wa-cc').value,
      waPhone: isWaCheckbox.checked ? '' : digitsOf(fieldInputs.waPhone.value),
      inGroup: (document.querySelector('input[name="ingroup"]:checked') || {}).value || '',
      house: fieldInputs.house.value,
      classGroup: fieldInputs.classGroup.value,
      profession: $('#oaa-prof').value.trim(),
      company: $('#oaa-company').value.trim(),
      industry: $('#oaa-industry').value,
      description: desc.value.trim()
    };
    window.OAA_LAST_SUBMISSION = payload;

    if (!sb) {
      // No backend configured yet — succeed locally so the flow still works.
      showSuccess();
      return;
    }

    submitError.hidden = true;
    setSubmitting(true);
    sb.from('registrations').insert({
      first_name: payload.firstName,
      last_name: payload.lastName,
      nickname: payload.nickname || null,
      email: payload.email,
      gender: payload.gender,
      country_code: payload.countryCode,
      phone: payload.phone,
      is_whatsapp: payload.isWhatsApp,
      wa_country_code: payload.isWhatsApp ? null : payload.waCountryCode,
      wa_phone: payload.isWhatsApp ? null : payload.waPhone,
      in_group: payload.inGroup,
      house: payload.house,
      class_group: payload.classGroup,
      profession: payload.profession || null,
      company: payload.company || null,
      industry: payload.industry || null,
      description: payload.description || null
    }).then(function (res) {
      setSubmitting(false);
      if (res.error && res.error.code !== '23505') {
        // 23505 = this email already registered — treat as success.
        submitError.textContent = 'Something went wrong. Please try again.';
        submitError.hidden = false;
        return;
      }
      showSuccess();
    }, function () {
      setSubmitting(false);
      submitError.textContent = 'Couldn’t reach the server. Check your connection and try again.';
      submitError.hidden = false;
    });
  });

  /* ---------- Announcement slider ---------- */

  var slide = 0;
  var SLIDE_COUNT = 2;

  function renderSlides() {
    $$('.slide').forEach(function (el) {
      el.classList.toggle('active', Number(el.getAttribute('data-slide')) === slide);
    });
  }

  function advanceSlide() {
    slide = (slide + 1) % SLIDE_COUNT;
    renderSlides();
  }

  var slideTimer = setInterval(advanceSlide, 5000);

  function manualAdvance() {
    clearInterval(slideTimer);
    advanceSlide();
    slideTimer = setInterval(advanceSlide, 5000);
  }

  $('#prev-slide').addEventListener('click', manualAdvance);
  $('#next-slide').addEventListener('click', manualAdvance);

  renderSlides();
})();
