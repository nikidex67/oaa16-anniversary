/* OAA 16 prototype — shared: product quick-view + REAL registration modal.
   Pages using this must load supabase-js CDN and config.js first. */

var sbShared = window.supabase ? window.supabase.createClient(OAA_SUPABASE_URL, OAA_SUPABASE_KEY) : null;

/* ---------- Modal plumbing ---------- */

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') document.querySelectorAll('.overlay.open').forEach(function (o) { o.classList.remove('open'); });
});

/* ---------- Hide "Register" when already registered ---------- */

function hideRegisterUI() {
  document.querySelectorAll('[data-reg-only]').forEach(function (el) { el.style.display = 'none'; });
}
if (localStorage.getItem('oaa_registered')) hideRegisterUI();
else if (sbShared) {
  sbShared.auth.getSession().then(function (r) {
    if (!r.data.session) return;
    sbShared.from('registrations').select('id').ilike('email', r.data.session.user.email).maybeSingle().then(function (q) {
      if (q.data) { localStorage.setItem('oaa_registered', '1'); hideRegisterUI(); }
    });
  });
}

/* ---------- Products ---------- */

var PRODUCTS = [
  { title: 'Black Tee', price: 22500, sizes: ['M', 'L', 'XL', '2XL', '3XL'], desc: 'Heavyweight cotton · oversized fit · 20/16 crest', imgs: ['assets/tee-black.png', 'assets/tee-black-back.png'] },
  { title: 'Beige Tee', price: 22500, sizes: ['M', 'L', 'XL', '2XL', '3XL'], desc: 'Heavyweight cotton · oversized fit · 20/16 crest', imgs: ['assets/tee-beige-front-3.png', 'assets/tee-beige.png'] },
  { title: 'Baby Tee', price: 15000, sizes: ['XS', 'S', 'M', 'L'], desc: 'Fitted baby tee · 20/16 crest · product photos coming soon', imgs: ['assets/tee-beige.png', 'assets/tee-beige-front-3.png'] }
];
var prod = { idx: 0, img: 0, size: '', added: false };

(function buildProductModal() {
  var root = document.getElementById('product-modal-root');
  if (!root) return;
  root.innerHTML =
    '<div class="overlay" id="prod-modal" style="z-index:60">' +
    '<div style="position:relative;width:100%;max-width:920px;max-height:92vh;overflow-y:auto;background:#fff;border-radius:28px;padding:32px;display:flex;gap:36px;flex-wrap:wrap;box-shadow:0 24px 80px rgba(14,12,9,.35)" onclick="event.stopPropagation()">' +
    '<button class="modal-close" onclick="closeModal(\'prod-modal\')" aria-label="Close">✕</button>' +
    '<div style="flex:1 1 380px;min-width:0;display:flex;gap:14px">' +
    '<div style="display:flex;flex-direction:column;gap:12px;flex-shrink:0">' +
    '<button id="prod-thumb-0" aria-label="View 1" style="width:64px;height:80px;border:0;padding:0;cursor:pointer;border-radius:10px;transition:box-shadow .15s" onclick="setProdImg(0)"></button>' +
    '<button id="prod-thumb-1" aria-label="View 2" style="width:64px;height:80px;border:0;padding:0;cursor:pointer;border-radius:10px;transition:box-shadow .15s" onclick="setProdImg(1)"></button>' +
    '</div>' +
    '<div id="prod-main" style="flex:1;min-width:0;min-height:440px;border-radius:16px"></div>' +
    '</div>' +
    '<div style="flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:14px;padding-top:8px">' +
    '<div style="font-size:14px;text-transform:capitalize;color:#858585">Anniversary Collection</div>' +
    '<h3 id="prod-title" style="margin:0;font-size:28px;font-weight:800;line-height:1.1"></h3>' +
    '<div style="font-size:14px;color:var(--muted)" id="prod-desc"></div>' +
    '<div style="font-size:22px;font-weight:800" id="prod-price"></div>' +
    '<select id="prod-size" class="chevron" aria-label="Select size" onchange="setProdSize(this.value)"></select>' +
    '<button id="prod-bag" class="btn btn-ink" style="width:100%" onclick="addToBag()">Pre-order</button>' +
    '<div><div style="font-size:12px;color:var(--muted)">Estimated delivery</div><b style="font-size:14.5px">Ships in 3 – 5 working days</b></div>' +
    '<div style="display:flex;flex-direction:column;gap:8px"><span style="font-size:13px;color:var(--muted)">Also available</span>' +
    '<div style="display:flex;gap:8px" id="prod-alts"></div></div>' +
    '<div style="background:var(--field-bg);border-radius:14px;padding:12px 16px;font-size:13px;line-height:1.5;margin-top:auto">Free delivery within Accra · Pickup at anniversary events</div>' +
    '</div></div></div>';
  root.querySelector('#prod-modal').addEventListener('click', function () { closeModal('prod-modal'); });
})();

function bgFor(url, pos) { return '#F0EDF8 url(\'' + url + '\') center ' + (pos || '30%') + '/cover no-repeat'; }

function renderProduct() {
  var p = PRODUCTS[prod.idx];
  document.getElementById('prod-title').textContent = p.title;
  document.getElementById('prod-desc').textContent = p.desc;
  document.getElementById('prod-price').textContent = oaaGhs(p.price);
  document.getElementById('prod-main').style.background = bgFor(p.imgs[prod.img]);
  [0, 1].forEach(function (i) {
    var t = document.getElementById('prod-thumb-' + i);
    t.style.background = bgFor(p.imgs[i]);
    t.style.boxShadow = prod.img === i ? 'inset 0 0 0 2px #0E0C09' : 'inset 0 0 0 1px rgba(14,12,9,.15)';
  });
  var sizeEl = document.getElementById('prod-size');
  sizeEl.innerHTML = '<option value="">Select size…</option>' + p.sizes.map(function (s) { return '<option>' + s + '</option>'; }).join('');
  sizeEl.value = prod.size;
  sizeEl.style.borderColor = prod.sizeErr ? 'var(--error)' : 'transparent';
  var alts = document.getElementById('prod-alts');
  alts.innerHTML = '';
  PRODUCTS.forEach(function (q, i) {
    if (i === prod.idx) return;
    var b = document.createElement('button');
    b.setAttribute('aria-label', q.title);
    b.style.cssText = 'width:64px;height:80px;border:0;padding:0;cursor:pointer;border-radius:10px;box-shadow:0 2px 8px rgba(14,12,9,.15);background:' + bgFor(q.imgs[0]);
    b.onclick = function () { prod = { idx: i, img: 0, size: '', added: false, sizeErr: false }; renderProduct(); };
    alts.appendChild(b);
  });
  var bag = document.getElementById('prod-bag');
  if (prod.added) {
    bag.textContent = '✓ Pre-order noted — size ' + prod.size;
    bag.style.background = 'var(--success-bg)'; bag.style.color = 'var(--success-ink)';
  } else {
    bag.textContent = 'Pre-order'; bag.style.background = ''; bag.style.color = '';
  }
}

function openProduct(idx) { prod = { idx: idx, img: 0, size: '', added: false, sizeErr: false }; renderProduct(); openModal('prod-modal'); }
function setProdImg(i) { prod.img = i; renderProduct(); }
function setProdSize(v) { prod.size = v; prod.sizeErr = false; prod.added = false; renderProduct(); }
function addToBag() {
  if (!prod.size) { prod.sizeErr = true; renderProduct(); return; }
  prod.added = true; renderProduct();
}

/* ---------- REAL registration modal (two-step, writes to the database) ---------- */

var HOUSES = {
  Male: ['Aggrey House', 'Livingstone House', 'Lugard House', 'Cadbury House', 'Guggisberg House', 'Gyamfi House', 'Fraser House', 'Kwapong House'],
  Female: ['Clark House', 'Kingsley House', 'Slessor House', 'McCarthy House', 'Baeta House', 'OAA House', 'SOA House']
};
var CLASSES = { Science: 8, Arts: 8 };

(function buildRegModal() {
  var root = document.getElementById('reg-modal-root');
  if (!root) return;
  var classOpts = '<option value="">Select class…</option>' +
    '<optgroup label="Science">' + Array.from({ length: 8 }, function (_, i) { return '<option>Science ' + (i + 1) + '</option>'; }).join('') + '</optgroup>' +
    '<optgroup label="Arts">' + Array.from({ length: 8 }, function (_, i) { return '<option>Arts ' + (i + 1) + '</option>'; }).join('') + '</optgroup>' +
    '<optgroup label="Home Econs"><option>Voc 1</option></optgroup>' +
    '<optgroup label="Visual Arts"><option>Voc 2</option></optgroup>';
  root.innerHTML =
    '<div class="overlay" id="reg-modal">' +
    '<div style="position:relative;width:100%;max-width:560px;max-height:min(860px,92vh);overflow-y:auto;background:#fff;border-radius:28px;padding:36px;box-shadow:0 24px 80px rgba(14,12,9,.35)" onclick="event.stopPropagation()">' +
    '<button class="modal-close" onclick="closeModal(\'reg-modal\')" aria-label="Close registration">✕</button>' +
    '<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:500">Class of 2016 · 10 Years On</div>' +
    '<h2 style="font-weight:800;font-size:28px;margin:8px 0 6px">Hi there, Akora</h2>' +
    '<p style="font-size:15px;color:var(--muted);line-height:1.6;margin:0 0 22px">It\'s been 10 years! Help us reconnect the year group.</p>' +

    '<div id="reg-step-1" style="display:flex;flex-direction:column;gap:14px">' +
    '<div style="display:flex;gap:14px"><input type="text" id="rg-first" placeholder="First name(s)"><input type="text" id="rg-last" placeholder="Last name"></div>' +
    '<input type="text" id="rg-nick" placeholder="School nickname (if you had one)">' +
    '<div style="display:flex;gap:14px"><input type="email" id="rg-email" placeholder="Email address" style="flex:2"><select id="rg-gender" class="chevron" style="flex:1" onchange="regHouses()"><option value="">Gender…</option><option>Male</option><option>Female</option></select></div>' +
    '<div style="display:flex;gap:14px"><input type="tel" id="rg-phone" placeholder="Phone number (0XXXXXXXXX)" maxlength="10"></div>' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;padding-left:4px"><input type="checkbox" id="rg-iswa" style="width:14px;height:14px;accent-color:var(--accent)"> This is my WhatsApp number</label>' +
    '<div style="background:var(--field-bg);border-radius:16px;padding:16px 18px">' +
    '<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:10px">Already in the OAA 16 WhatsApp group?</div>' +
    '<div style="display:flex;gap:20px"><label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><input type="radio" name="rg-group" value="yes" style="accent-color:var(--accent)"> Yes</label>' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><input type="radio" name="rg-group" value="no" style="accent-color:var(--accent)"> No</label></div></div>' +
    '<button class="btn btn-ink" style="width:100%" onclick="regNext()">Next <span>→</span></button>' +
    '<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);text-align:center;font-weight:500">Step 1 of 2 · Contact</div>' +
    '</div>' +

    '<div id="reg-step-2" style="display:none;flex-direction:column;gap:14px">' +
    '<div style="display:flex;gap:14px"><select id="rg-house" class="chevron"><option value="">Select house…</option></select><select id="rg-class" class="chevron">' + classOpts + '</select></div>' +
    '<div style="display:flex;gap:14px"><input type="text" id="rg-prof" placeholder="Current profession"><input type="text" id="rg-company" placeholder="Company"></div>' +
    '<button class="btn btn-ink" style="width:100%" id="rg-submit" onclick="regSubmit()">Register</button>' +
    '<div style="display:flex;justify-content:space-between;align-items:center">' +
    '<button class="btn btn-soft btn-xs" onclick="regBack()">← Back</button>' +
    '<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:500">Step 2 of 2 · About you</div></div>' +
    '</div>' +

    '<div id="reg-done" style="display:none;flex-direction:column;gap:16px;text-align:center;padding:12px 0">' +
    '<div style="width:56px;height:56px;border-radius:50%;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;margin:0 auto">✓</div>' +
    '<h3 style="margin:0;font-size:26px;font-weight:800">You\'re in! 🎉</h3>' +
    '<p style="margin:0;font-size:15px;color:var(--muted);line-height:1.6">Check your email for a welcome message. Join the WhatsApp group so you don\'t miss anything.</p>' +
    '<a id="rg-wa-btn" href="#" target="_blank" rel="noopener" class="btn" style="background:#25D366;color:#fff;margin:0 auto">Join the WhatsApp Group ↗</a>' +
    '</div>' +

    '<div id="reg-err" style="display:none;background:#FBE4E4;color:var(--error);border-radius:12px;padding:10px 14px;font-size:13px;margin-top:14px;line-height:1.5"></div>' +
    '</div></div>';
  root.querySelector('#reg-modal').addEventListener('click', function () { closeModal('reg-modal'); });
})();

function regHouses() {
  var g = document.getElementById('rg-gender').value;
  var sel = document.getElementById('rg-house');
  var opts = '<option value="">Select house…</option>';
  (g ? [g] : ['Male', 'Female']).forEach(function (k) {
    opts += '<optgroup label="' + (k === 'Male' ? "Boys' houses" : "Girls' houses") + '">' +
      HOUSES[k].map(function (h) { return '<option>' + h + '</option>'; }).join('') + '</optgroup>';
  });
  sel.innerHTML = opts;
}
if (document.getElementById('rg-house')) regHouses();

function regErr(msg, html) {
  var e = document.getElementById('reg-err');
  if (html) e.innerHTML = msg; else e.textContent = msg;
  e.style.display = msg ? 'block' : 'none';
}

function regNext() {
  var first = document.getElementById('rg-first').value.trim();
  var last = document.getElementById('rg-last').value.trim();
  var email = document.getElementById('rg-email').value.trim();
  var gender = document.getElementById('rg-gender').value;
  var phone = document.getElementById('rg-phone').value.trim();
  var group = document.querySelector('input[name="rg-group"]:checked');
  if (!first || !last) return regErr('Please fill in your first and last name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return regErr('Enter a valid email address.');
  if (!gender) return regErr('Please select your gender.');
  if (!/^0\d{9}$/.test(phone)) return regErr('Enter your phone number as 0XXXXXXXXX.');
  if (!group) return regErr('Tell us whether you\'re in the WhatsApp group.');
  regErr('');
  document.getElementById('reg-step-1').style.display = 'none';
  document.getElementById('reg-step-2').style.display = 'flex';
}

function regBack() {
  regErr('');
  document.getElementById('reg-step-2').style.display = 'none';
  document.getElementById('reg-step-1').style.display = 'flex';
}

function regSubmit() {
  var house = document.getElementById('rg-house').value;
  var cls = document.getElementById('rg-class').value;
  if (!house || !cls) return regErr('Please select your house and class.');
  var btn = document.getElementById('rg-submit');
  btn.disabled = true; btn.textContent = 'Registering…';
  regErr('');
  var row = {
    first_name: document.getElementById('rg-first').value.trim(),
    last_name: document.getElementById('rg-last').value.trim(),
    nickname: document.getElementById('rg-nick').value.trim() || null,
    email: document.getElementById('rg-email').value.trim(),
    gender: document.getElementById('rg-gender').value,
    country_code: '+233',
    phone: document.getElementById('rg-phone').value.trim(),
    is_whatsapp: document.getElementById('rg-iswa').checked,
    in_group: document.querySelector('input[name="rg-group"]:checked').value,
    house: house,
    class_group: cls,
    profession: document.getElementById('rg-prof').value.trim() || null,
    company: document.getElementById('rg-company').value.trim() || null
  };
  sbShared.from('registrations').insert(row).then(function (r) {
    btn.disabled = false; btn.textContent = 'Register';
    if (r.error) {
      if (r.error.code === '23505') {
        regErr('This email is already registered. <a href="signin.html" style="color:var(--error);font-weight:700">Sign in instead →</a>', true);
      } else {
        regErr('Something went wrong — please try again.');
      }
      return;
    }
    localStorage.setItem('oaa_registered', '1');
    hideRegisterUI();
    document.getElementById('rg-wa-btn').href = OAA_WHATSAPP_LINK;
    document.getElementById('reg-step-2').style.display = 'none';
    document.getElementById('reg-done').style.display = 'flex';
  });
}
