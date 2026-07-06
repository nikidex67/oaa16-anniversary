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

  // ISO code + dial code for every country; flag emoji is derived from the
  // ISO code (regional indicator symbols), so no flag data is stored.
  var COUNTRY_CODES = ('AF93 AL355 DZ213 AS1684 AD376 AO244 AI1264 AG1268 AR54 AM374 AW297 AU61 AT43 AZ994 BS1242 BH973 BD880 BB1246 BY375 BE32 BZ501 BJ229 BM1441 BT975 BO591 BA387 BW267 BR55 BN673 BG359 BF226 BI257 KH855 CM237 CA1 CV238 KY1345 CF236 TD235 CL56 CN86 CO57 KM269 CG242 CD243 CR506 CI225 HR385 CU53 CY357 CZ420 DK45 DJ253 DM1767 DO1809 EC593 EG20 SV503 GQ240 ER291 EE372 SZ268 ET251 FJ679 FI358 FR33 GF594 PF689 GA241 GM220 GE995 DE49 GH233 GI350 GR30 GL299 GD1473 GP590 GU1671 GT502 GN224 GW245 GY592 HT509 HN504 HK852 HU36 IS354 IN91 ID62 IR98 IQ964 IE353 IL972 IT39 JM1876 JP81 JO962 KZ7 KE254 KI686 KP850 KR82 KW965 KG996 LA856 LV371 LB961 LS266 LR231 LY218 LI423 LT370 LU352 MO853 MG261 MW265 MY60 MV960 ML223 MT356 MH692 MQ596 MR222 MU230 MX52 FM691 MD373 MC377 MN976 ME382 MS1664 MA212 MZ258 MM95 NA264 NR674 NP977 NL31 NC687 NZ64 NI505 NE227 NG234 NU683 MK389 NO47 OM968 PK92 PW680 PS970 PA507 PG675 PY595 PE51 PH63 PL48 PT351 PR1787 QA974 RE262 RO40 RU7 RW250 KN1869 LC1758 VC1784 WS685 SM378 ST239 SA966 SN221 RS381 SC248 SL232 SG65 SK421 SI386 SB677 SO252 ZA27 SS211 ES34 LK94 SD249 SR597 SE46 CH41 SY963 TW886 TJ992 TZ255 TH66 TL670 TG228 TO676 TT1868 TN216 TR90 TM993 TC1649 TV688 UG256 UA380 AE971 GB44 US1 UY598 UZ998 VU678 VE58 VN84 VG1284 VI1340 YE967 ZM260 ZW263').split(' ');

  function flagEmoji(iso) {
    return String.fromCodePoint(127397 + iso.charCodeAt(0), 127397 + iso.charCodeAt(1));
  }

  function populateCountryCodes(select, defaultDial) {
    COUNTRY_CODES.forEach(function (entry) {
      var iso = entry.slice(0, 2);
      var dial = '+' + entry.slice(2);
      var opt = document.createElement('option');
      opt.value = dial;
      opt.textContent = flagEmoji(iso) + ' ' + dial;
      opt.title = iso;
      if (iso === 'GH' && dial === defaultDial) opt.selected = true;
      select.appendChild(opt);
    });
  }

  populateCountryCodes($('#oaa-cc'), '+233');
  populateCountryCodes($('#oaa-wa-cc'), '+233');

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

  /* ---------- Bottom overscroll stop (mobile) ---------- */
  // iOS can only paint the rubber-band gap in one flat color, and the page
  // is white on top / ink on the bottom. Keep the native top bounce (and
  // pull-to-refresh) and cancel only finger-driven overscroll at the bottom.

  if (window.matchMedia('(max-width: 1023px)').matches) {
    var touchStartY = 0;
    document.addEventListener('touchstart', function (e) {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      var el = document.scrollingElement || document.documentElement;
      var atBottom = el.scrollTop + window.innerHeight >= el.scrollHeight - 1;
      var pullingUp = e.touches[0].clientY < touchStartY;
      if (atBottom && pullingUp && e.cancelable) e.preventDefault();
    }, { passive: false });
  }

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
