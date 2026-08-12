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
if (sbShared) {
  sbShared.auth.getSession().then(function (r) {
    if (!r.data.session) return;
    sbShared.from('registrations').select('first_name, last_name, nickname, house').ilike('email', r.data.session.user.email).maybeSingle().then(function (q) {
      if (!q.data) return;
      localStorage.setItem('oaa_registered', '1');
      hideRegisterUI();
      /* swap the nav "Sign in" link for the member chip */
      var reg = q.data;
      var color = (typeof OAA_HOUSE_COLORS !== 'undefined' && OAA_HOUSE_COLORS[reg.house]) || '#0E0C09';
      document.querySelectorAll('.nav-signin').forEach(function (a) {
        a.href = 'dashboard.html';
        a.className = 'nav-member';
        a.textContent = '';
        var av = document.createElement('span');
        av.className = 'avatar';
        av.style.background = color;
        av.textContent = ((reg.first_name || ' ')[0] + (reg.last_name || ' ')[0]).trim().toUpperCase();
        var nm = document.createElement('span');
        nm.textContent = reg.nickname || (reg.first_name || '').split(' ')[0] || 'Member';
        a.appendChild(av);
        a.appendChild(document.createTextNode(' '));
        a.appendChild(nm);
      });
    });
  });
}

/* ---------- Products ---------- */

var PRODUCTS = [
  { sku: 'black-tee', title: 'Black Tee', price: 22500, sizes: ['M', 'L', 'XL', '2XL', '3XL'], desc: 'Heavyweight cotton · oversized fit · 20/16 crest', imgs: ['assets/tee-black.jpg', 'assets/tee-black-back.jpg'] },
  { sku: 'beige-tee', title: 'Beige Tee', price: 22500, sizes: ['M', 'L', 'XL', '2XL', '3XL'], desc: 'Heavyweight cotton · oversized fit · 20/16 crest', imgs: ['assets/tee-beige-front-3.jpg', 'assets/tee-beige.jpg'] },
  { sku: 'black-baby-tee', title: 'Black Baby Tee', price: 15000, sizes: ['Free size'], desc: 'Fitted black baby tee · 20/16 crest chest print', imgs: ['assets/baby-tee-black.jpg', 'assets/baby-tee-black.jpg'] },
  { sku: 'bw-baby-tee', title: 'Black & White Baby Tee', price: 15000, sizes: ['8', '10', '12', '14', '16'], desc: 'Fitted raglan baby tee · black sleeves · 20/16 crest chest print', imgs: ['assets/baby-tee-bw.jpg', 'assets/baby-tee-bw.jpg'] }
];
var prod = { idx: 0, img: 0, size: '', qty: 1, added: false };

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
    '<div style="display:flex;gap:10px"><select id="prod-size" class="chevron" aria-label="Select size" style="flex:1" onchange="setProdSize(this.value)"></select>' +
    '<select id="prod-qty" class="chevron" aria-label="Quantity" style="flex:0 0 92px" onchange="prod.qty=Number(this.value)"><option value="1">Qty 1</option><option value="2">Qty 2</option><option value="3">Qty 3</option><option value="4">Qty 4</option><option value="5">Qty 5</option></select></div>' +
    '<button id="prod-bag" class="btn btn-ink" style="width:100%" onclick="buyNow()">Buy now · MoMo</button>' +
    '<div id="prod-pay" style="display:none;flex-direction:column;gap:10px;background:var(--field-bg);border-radius:14px;padding:14px 16px">' +
    '<div style="font-size:13px;font-weight:700">Pay with Mobile Money</div>' +
    '<input type="tel" id="prod-phone" placeholder="MoMo number · 0XXXXXXXXX" maxlength="10" style="background:#fff">' +
    '<select id="prod-operator" class="chevron" style="background:#fff"><option value="mtn">MTN MoMo</option><option value="vodafone">Telecel Cash</option><option value="airteltigo">AT Money</option></select>' +
    '<div id="prod-fee" style="font-size:12.5px;color:var(--muted);line-height:1.5"></div>' +
    '<button class="btn btn-accent btn-sm" id="prod-pay-go" onclick="confirmBuy()">Send payment prompt</button>' +
    '</div>' +
    '<div id="prod-msg" style="display:none;border-radius:12px;padding:11px 14px;font-size:13px;line-height:1.5"></div>' +
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
  document.getElementById('prod-qty').value = String(prod.qty);
  var bag = document.getElementById('prod-bag');
  if (typeof OAA_ORDER_DEADLINE !== 'undefined' && Date.now() > new Date(OAA_ORDER_DEADLINE).getTime()) {
    bag.textContent = 'Ordering closed';
    bag.disabled = true; bag.style.opacity = .55;
  } else if (typeof OAA_PAYMENTS_LIVE !== 'undefined' && !OAA_PAYMENTS_LIVE) {
    bag.textContent = 'Ordering opens soon';
    bag.disabled = true; bag.style.opacity = .55;
  } else {
    bag.textContent = 'Buy now · MoMo';
    bag.disabled = false; bag.style.opacity = 1;
  }
}

function openProduct(idx) {
  prod = { idx: idx, img: 0, size: '', qty: 1, added: false, sizeErr: false };
  renderProduct();
  document.getElementById('prod-pay').style.display = 'none';
  prodMsg('');
  openModal('prod-modal');
}
function setProdImg(i) { prod.img = i; renderProduct(); }
function setProdSize(v) { prod.size = v; prod.sizeErr = false; renderProduct(); }

function prodMsg(text, kind) {
  var el = document.getElementById('prod-msg');
  if (!text) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.style.background = kind === 'ok' ? 'var(--success-bg)' : kind === 'err' ? '#FBE4E4' : 'var(--field-bg)';
  el.style.color = kind === 'ok' ? 'var(--success-ink)' : kind === 'err' ? 'var(--error)' : 'var(--ink)';
  el.innerHTML = text;
}

function buyNow() {
  if (typeof OAA_PAYMENTS_LIVE !== 'undefined' && !OAA_PAYMENTS_LIVE) return;
  if (typeof OAA_ORDER_DEADLINE !== 'undefined' && Date.now() > new Date(OAA_ORDER_DEADLINE).getTime()) return;
  if (!prod.size) { prod.sizeErr = true; renderProduct(); return; }
  if (!sbShared) return;
  sbShared.auth.getSession().then(function (r) {
    if (!r.data.session) {
      prodMsg('You need a member account to order. <a href="signin.html" style="color:var(--accent);font-weight:700">Sign in →</a> or register on the <a href="index.html" style="color:var(--accent);font-weight:700">home page</a>.');
      return;
    }
    sbShared.from('registrations').select('phone').ilike('email', r.data.session.user.email).maybeSingle().then(function (q) {
      var phone = ((q.data || {}).phone || '').replace(/\D/g, '');
      if (phone.length === 9) phone = '0' + phone;
      if (/^0\d{9}$/.test(phone)) document.getElementById('prod-phone').value = phone;
      var p = PRODUCTS[prod.idx];
      var total = p.price * prod.qty;
      var fee = Math.round(total * OAA_MOMO_FEE_RATE);
      document.getElementById('prod-fee').textContent =
        prod.qty + ' × ' + p.title + ' (' + prod.size + ') = ' + oaaGhs(total) +
        ". You'll be charged " + oaaGhs(total + fee) + ' (includes the 2.5% provider fee).';
      document.getElementById('prod-pay').style.display = 'flex';
      prodMsg('');
    });
  });
}

function confirmBuy() {
  var phone = document.getElementById('prod-phone').value.trim();
  if (!/^0\d{9}$/.test(phone)) { prodMsg('Enter your MoMo number as 0XXXXXXXXX.', 'err'); return; }
  var go = document.getElementById('prod-pay-go');
  go.disabled = true; go.textContent = 'Sending prompt…';
  sbShared.auth.getSession().then(function (r) {
    if (!r.data.session) { go.disabled = false; go.textContent = 'Send payment prompt'; return; }
    fetch(OAA_PAY_INIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + r.data.session.access_token },
      body: JSON.stringify({
        order: { items: [{ sku: PRODUCTS[prod.idx].sku, size: prod.size, qty: prod.qty }] },
        phone: phone,
        operator: document.getElementById('prod-operator').value,
      }),
    }).then(function (res) { return res.json(); }).then(function (d) {
      if (!d.reference) {
        go.disabled = false; go.textContent = 'Send payment prompt';
        prodMsg('Could not start the payment: ' + (d.error || 'unknown error') + '. Try again.', 'err');
        return;
      }
      prodMsg('Approve the prompt on your phone — confirming your order…');
      pollOrderPayment(d.reference, 0);
    }).catch(function () {
      go.disabled = false; go.textContent = 'Send payment prompt';
      prodMsg('Network error — try again.', 'err');
    });
  });
}

function pollOrderPayment(reference, tries) {
  if (tries > 36) {
    prodMsg('Still waiting on the payment. If you approved it, your order will confirm automatically — check the Orders tab on your <a href="dashboard.html" style="color:var(--accent);font-weight:700">dashboard</a>.', 'err');
    return;
  }
  sbShared.from('payments').select('status').eq('provider_ref', reference).maybeSingle().then(function (r) {
    var s = (r.data || {}).status;
    if (s === 'success') {
      document.getElementById('prod-pay').style.display = 'none';
      var go = document.getElementById('prod-pay-go');
      go.disabled = false; go.textContent = 'Send payment prompt';
      prodMsg('✓ Order confirmed! A receipt is on its way to your email. Track it any time in the Orders tab on your <a href="dashboard.html" style="color:var(--accent);font-weight:700">dashboard</a>.', 'ok');
    } else if (s === 'failed') {
      var g = document.getElementById('prod-pay-go');
      g.disabled = false; g.textContent = 'Send payment prompt';
      prodMsg('The payment did not go through. No money moved — try again.', 'err');
    } else {
      setTimeout(function () { pollOrderPayment(reference, tries + 1); }, 5000);
    }
  });
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
    '<div style="display:flex;gap:10px"><select id="rg-cc" class="chevron" style="flex:0 0 128px" onchange="regCcLabel()" onfocus="regCcNames()"></select><input type="tel" id="rg-phone" placeholder="Phone number" maxlength="15" style="flex:1;min-width:0"></div>' +
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

var REG_COUNTRIES = ('AF|Afghanistan|93;AL|Albania|355;DZ|Algeria|213;AS|American Samoa|1684;AD|Andorra|376;AO|Angola|244;AI|Anguilla|1264;AG|Antigua & Barbuda|1268;AR|Argentina|54;AM|Armenia|374;AW|Aruba|297;AU|Australia|61;AT|Austria|43;AZ|Azerbaijan|994;BS|Bahamas|1242;BH|Bahrain|973;BD|Bangladesh|880;BB|Barbados|1246;BY|Belarus|375;BE|Belgium|32;BZ|Belize|501;BJ|Benin|229;BM|Bermuda|1441;BT|Bhutan|975;BO|Bolivia|591;BA|Bosnia & Herzegovina|387;BW|Botswana|267;BR|Brazil|55;BN|Brunei|673;BG|Bulgaria|359;BF|Burkina Faso|226;BI|Burundi|257;KH|Cambodia|855;CM|Cameroon|237;CA|Canada|1;CV|Cape Verde|238;KY|Cayman Islands|1345;CF|Central African Republic|236;TD|Chad|235;CL|Chile|56;CN|China|86;CO|Colombia|57;KM|Comoros|269;CG|Congo|242;CD|Congo (DRC)|243;CR|Costa Rica|506;CI|Côte d’Ivoire|225;HR|Croatia|385;CU|Cuba|53;CY|Cyprus|357;CZ|Czechia|420;DK|Denmark|45;DJ|Djibouti|253;DM|Dominica|1767;DO|Dominican Republic|1809;EC|Ecuador|593;EG|Egypt|20;SV|El Salvador|503;GQ|Equatorial Guinea|240;ER|Eritrea|291;EE|Estonia|372;SZ|Eswatini|268;ET|Ethiopia|251;FJ|Fiji|679;FI|Finland|358;FR|France|33;GF|French Guiana|594;PF|French Polynesia|689;GA|Gabon|241;GM|Gambia|220;GE|Georgia|995;DE|Germany|49;GH|Ghana|233;GI|Gibraltar|350;GR|Greece|30;GL|Greenland|299;GD|Grenada|1473;GP|Guadeloupe|590;GU|Guam|1671;GT|Guatemala|502;GN|Guinea|224;GW|Guinea-Bissau|245;GY|Guyana|592;HT|Haiti|509;HN|Honduras|504;HK|Hong Kong|852;HU|Hungary|36;IS|Iceland|354;IN|India|91;ID|Indonesia|62;IR|Iran|98;IQ|Iraq|964;IE|Ireland|353;IL|Israel|972;IT|Italy|39;JM|Jamaica|1876;JP|Japan|81;JO|Jordan|962;KZ|Kazakhstan|7;KE|Kenya|254;KI|Kiribati|686;KW|Kuwait|965;KG|Kyrgyzstan|996;LA|Laos|856;LV|Latvia|371;LB|Lebanon|961;LS|Lesotho|266;LR|Liberia|231;LY|Libya|218;LI|Liechtenstein|423;LT|Lithuania|370;LU|Luxembourg|352;MO|Macao|853;MG|Madagascar|261;MW|Malawi|265;MY|Malaysia|60;MV|Maldives|960;ML|Mali|223;MT|Malta|356;MH|Marshall Islands|692;MQ|Martinique|596;MR|Mauritania|222;MU|Mauritius|230;MX|Mexico|52;FM|Micronesia|691;MD|Moldova|373;MC|Monaco|377;MN|Mongolia|976;ME|Montenegro|382;MS|Montserrat|1664;MA|Morocco|212;MZ|Mozambique|258;MM|Myanmar|95;NA|Namibia|264;NR|Nauru|674;NP|Nepal|977;NL|Netherlands|31;NC|New Caledonia|687;NZ|New Zealand|64;NI|Nicaragua|505;NE|Niger|227;NG|Nigeria|234;NU|Niue|683;KP|North Korea|850;MK|North Macedonia|389;NO|Norway|47;OM|Oman|968;PK|Pakistan|92;PW|Palau|680;PS|Palestine|970;PA|Panama|507;PG|Papua New Guinea|675;PY|Paraguay|595;PE|Peru|51;PH|Philippines|63;PL|Poland|48;PT|Portugal|351;PR|Puerto Rico|1787;QA|Qatar|974;RE|Réunion|262;RO|Romania|40;RU|Russia|7;RW|Rwanda|250;WS|Samoa|685;SM|San Marino|378;ST|São Tomé & Príncipe|239;SA|Saudi Arabia|966;SN|Senegal|221;RS|Serbia|381;SC|Seychelles|248;SL|Sierra Leone|232;SG|Singapore|65;SK|Slovakia|421;SI|Slovenia|386;SB|Solomon Islands|677;SO|Somalia|252;ZA|South Africa|27;KR|South Korea|82;SS|South Sudan|211;ES|Spain|34;LK|Sri Lanka|94;KN|St Kitts & Nevis|1869;LC|St Lucia|1758;VC|St Vincent & Grenadines|1784;SD|Sudan|249;SR|Suriname|597;SE|Sweden|46;CH|Switzerland|41;SY|Syria|963;TW|Taiwan|886;TJ|Tajikistan|992;TZ|Tanzania|255;TH|Thailand|66;TL|Timor-Leste|670;TG|Togo|228;TO|Tonga|676;TT|Trinidad & Tobago|1868;TN|Tunisia|216;TR|Turkey|90;TM|Turkmenistan|993;TC|Turks & Caicos|1649;TV|Tuvalu|688;UG|Uganda|256;UA|Ukraine|380;AE|United Arab Emirates|971;GB|United Kingdom|44;US|United States|1;UY|Uruguay|598;UZ|Uzbekistan|998;VU|Vanuatu|678;VE|Venezuela|58;VN|Vietnam|84;VG|Virgin Islands (UK)|1284;VI|Virgin Islands (US)|1340;YE|Yemen|967;ZM|Zambia|260;ZW|Zimbabwe|263').split(';').map(function (e) {
  var p = e.split('|');
  var flag = p[0].replace(/./g, function (c) { return String.fromCodePoint(127397 + c.charCodeAt(0)); });
  return { flag: flag, name: p[1], dial: '+' + p[2] };
}).sort(function (a, b) { return a.name.localeCompare(b.name); });

(function fillCc() {
  var sel = document.getElementById('rg-cc');
  if (!sel) return;
  sel.innerHTML = REG_COUNTRIES.map(function (c) {
    return '<option value="' + c.dial + '"' + (c.name === 'Ghana' ? ' selected' : '') + '>' + c.flag + ' ' + c.name + ' (' + c.dial + ')</option>';
  }).join('');
  regCcLabel();
})();

function regCcLabel() {
  var sel = document.getElementById('rg-cc');
  var o = sel.selectedOptions[0];
  var c = REG_COUNTRIES[sel.selectedIndex];
  if (o && c) o.textContent = c.flag + ' ' + c.dial;
}
function regCcNames() {
  var sel = document.getElementById('rg-cc');
  Array.prototype.forEach.call(sel.options, function (o, i) {
    var c = REG_COUNTRIES[i];
    o.textContent = c.flag + ' ' + c.name + ' (' + c.dial + ')';
  });
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
  var cc = document.getElementById('rg-cc').value;
  var digits = phone.replace(/\D/g, '');
  if (cc === '+233' && !/^0?\d{9}$/.test(digits)) return regErr('Enter your Ghana number as 0XXXXXXXXX.');
  if (cc !== '+233' && (digits.length < 5 || digits.length > 15)) return regErr('Enter a valid phone number for your country.');
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
    country_code: document.getElementById('rg-cc').value,
    phone: document.getElementById('rg-phone').value.trim().replace(/\D/g, ''),
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
