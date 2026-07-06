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

  // ISO code, country name, dial code — alphabetical by name. Flag emoji is
  // derived from the ISO code (regional indicator symbols).
  var COUNTRIES = ('AF|Afghanistan|93;AL|Albania|355;DZ|Algeria|213;AS|American Samoa|1684;AD|Andorra|376;AO|Angola|244;AI|Anguilla|1264;AG|Antigua & Barbuda|1268;AR|Argentina|54;AM|Armenia|374;AW|Aruba|297;AU|Australia|61;AT|Austria|43;AZ|Azerbaijan|994;BS|Bahamas|1242;BH|Bahrain|973;BD|Bangladesh|880;BB|Barbados|1246;BY|Belarus|375;BE|Belgium|32;BZ|Belize|501;BJ|Benin|229;BM|Bermuda|1441;BT|Bhutan|975;BO|Bolivia|591;BA|Bosnia & Herzegovina|387;BW|Botswana|267;BR|Brazil|55;BN|Brunei|673;BG|Bulgaria|359;BF|Burkina Faso|226;BI|Burundi|257;KH|Cambodia|855;CM|Cameroon|237;CA|Canada|1;CV|Cape Verde|238;KY|Cayman Islands|1345;CF|Central African Republic|236;TD|Chad|235;CL|Chile|56;CN|China|86;CO|Colombia|57;KM|Comoros|269;CG|Congo|242;CD|Congo (DRC)|243;CR|Costa Rica|506;CI|Côte d’Ivoire|225;HR|Croatia|385;CU|Cuba|53;CY|Cyprus|357;CZ|Czechia|420;DK|Denmark|45;DJ|Djibouti|253;DM|Dominica|1767;DO|Dominican Republic|1809;EC|Ecuador|593;EG|Egypt|20;SV|El Salvador|503;GQ|Equatorial Guinea|240;ER|Eritrea|291;EE|Estonia|372;SZ|Eswatini|268;ET|Ethiopia|251;FJ|Fiji|679;FI|Finland|358;FR|France|33;GF|French Guiana|594;PF|French Polynesia|689;GA|Gabon|241;GM|Gambia|220;GE|Georgia|995;DE|Germany|49;GH|Ghana|233;GI|Gibraltar|350;GR|Greece|30;GL|Greenland|299;GD|Grenada|1473;GP|Guadeloupe|590;GU|Guam|1671;GT|Guatemala|502;GN|Guinea|224;GW|Guinea-Bissau|245;GY|Guyana|592;HT|Haiti|509;HN|Honduras|504;HK|Hong Kong|852;HU|Hungary|36;IS|Iceland|354;IN|India|91;ID|Indonesia|62;IR|Iran|98;IQ|Iraq|964;IE|Ireland|353;IL|Israel|972;IT|Italy|39;JM|Jamaica|1876;JP|Japan|81;JO|Jordan|962;KZ|Kazakhstan|7;KE|Kenya|254;KI|Kiribati|686;KW|Kuwait|965;KG|Kyrgyzstan|996;LA|Laos|856;LV|Latvia|371;LB|Lebanon|961;LS|Lesotho|266;LR|Liberia|231;LY|Libya|218;LI|Liechtenstein|423;LT|Lithuania|370;LU|Luxembourg|352;MO|Macao|853;MG|Madagascar|261;MW|Malawi|265;MY|Malaysia|60;MV|Maldives|960;ML|Mali|223;MT|Malta|356;MH|Marshall Islands|692;MQ|Martinique|596;MR|Mauritania|222;MU|Mauritius|230;MX|Mexico|52;FM|Micronesia|691;MD|Moldova|373;MC|Monaco|377;MN|Mongolia|976;ME|Montenegro|382;MS|Montserrat|1664;MA|Morocco|212;MZ|Mozambique|258;MM|Myanmar|95;NA|Namibia|264;NR|Nauru|674;NP|Nepal|977;NL|Netherlands|31;NC|New Caledonia|687;NZ|New Zealand|64;NI|Nicaragua|505;NE|Niger|227;NG|Nigeria|234;NU|Niue|683;KP|North Korea|850;MK|North Macedonia|389;NO|Norway|47;OM|Oman|968;PK|Pakistan|92;PW|Palau|680;PS|Palestine|970;PA|Panama|507;PG|Papua New Guinea|675;PY|Paraguay|595;PE|Peru|51;PH|Philippines|63;PL|Poland|48;PT|Portugal|351;PR|Puerto Rico|1787;QA|Qatar|974;RE|Réunion|262;RO|Romania|40;RU|Russia|7;RW|Rwanda|250;WS|Samoa|685;SM|San Marino|378;ST|São Tomé & Príncipe|239;SA|Saudi Arabia|966;SN|Senegal|221;RS|Serbia|381;SC|Seychelles|248;SL|Sierra Leone|232;SG|Singapore|65;SK|Slovakia|421;SI|Slovenia|386;SB|Solomon Islands|677;SO|Somalia|252;ZA|South Africa|27;KR|South Korea|82;SS|South Sudan|211;ES|Spain|34;LK|Sri Lanka|94;KN|St Kitts & Nevis|1869;LC|St Lucia|1758;VC|St Vincent & Grenadines|1784;SD|Sudan|249;SR|Suriname|597;SE|Sweden|46;CH|Switzerland|41;SY|Syria|963;TW|Taiwan|886;TJ|Tajikistan|992;TZ|Tanzania|255;TH|Thailand|66;TL|Timor-Leste|670;TG|Togo|228;TO|Tonga|676;TT|Trinidad & Tobago|1868;TN|Tunisia|216;TR|Turkey|90;TM|Turkmenistan|993;TC|Turks & Caicos|1649;TV|Tuvalu|688;UG|Uganda|256;UA|Ukraine|380;AE|United Arab Emirates|971;GB|United Kingdom|44;US|United States|1;UY|Uruguay|598;UZ|Uzbekistan|998;VU|Vanuatu|678;VE|Venezuela|58;VN|Vietnam|84;VG|Virgin Islands (UK)|1284;VI|Virgin Islands (US)|1340;YE|Yemen|967;ZM|Zambia|260;ZW|Zimbabwe|263').split(';');

  function flagEmoji(iso) {
    return String.fromCodePoint(127397 + iso.charCodeAt(0), 127397 + iso.charCodeAt(1));
  }

  // The open dropdown shows "🇬🇭 Ghana (+233)"; the closed field shows the
  // compact "🇬🇭 +233" so it fits beside the phone input. Labels are swapped
  // on open/close since a native select can't display the two differently.
  function populateCountryCodes(select) {
    COUNTRIES.forEach(function (entry) {
      var parts = entry.split('|');
      var iso = parts[0], name = parts[1], dial = '+' + parts[2];
      var opt = document.createElement('option');
      opt.value = dial;
      opt.dataset.full = flagEmoji(iso) + ' ' + name + ' (' + dial + ')';
      opt.dataset.compact = flagEmoji(iso) + ' ' + dial;
      opt.textContent = opt.dataset.full;
      if (iso === 'GH') opt.selected = true;
      select.appendChild(opt);
    });

    function expand() {
      Array.prototype.forEach.call(select.options, function (o) { o.textContent = o.dataset.full; });
    }
    function compact() {
      expand();
      var sel = select.options[select.selectedIndex];
      if (sel) sel.textContent = sel.dataset.compact;
    }
    select.addEventListener('mousedown', expand);
    select.addEventListener('focus', expand);
    select.addEventListener('change', compact);
    select.addEventListener('blur', compact);
    compact();
  }

  populateCountryCodes($('#oaa-cc'));
  populateCountryCodes($('#oaa-wa-cc'));

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
