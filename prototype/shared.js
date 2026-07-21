/* OAA 16 prototype — shared modals: product quick-view + registration popup */

var PRODUCTS = [
  { title: 'Black Tee', imgs: ['assets/tee-black.png', 'assets/tee-black-back.png'] },
  { title: 'Beige Tee', imgs: ['assets/tee-beige-front-3.png', 'assets/tee-beige.png'] }
];
var prod = { idx: 0, img: 0, size: '', added: false };

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.open').forEach(function (o) { o.classList.remove('open'); });
  }
});

/* ---------- Product quick-view ---------- */

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
    '<div style="font-size:14px;color:var(--muted)">Heavyweight cotton · oversized fit · 20/16 crest</div>' +
    '<div style="font-size:22px;font-weight:800">GH₵300</div>' +
    '<select id="prod-size" class="chevron" aria-label="Select size" onchange="setProdSize(this.value)">' +
    '<option value="">Select size…</option><option>M</option><option>L</option><option>XL</option><option>2XL</option><option>3XL</option>' +
    '</select>' +
    '<button id="prod-bag" class="btn btn-ink" style="width:100%" onclick="addToBag()">Pre-order</button>' +
    '<div><div style="font-size:12px;color:var(--muted)">Estimated delivery</div><b style="font-size:14.5px">Ships in 3 – 5 working days</b></div>' +
    '<div style="display:flex;flex-direction:column;gap:8px"><span style="font-size:13px;color:var(--muted)">Also available in</span>' +
    '<button id="prod-alt" aria-label="Other colour" style="width:64px;height:80px;border:0;padding:0;cursor:pointer;border-radius:10px;box-shadow:0 2px 8px rgba(14,12,9,.15);transition:transform .15s" onclick="switchProduct()"></button></div>' +
    '<div style="background:var(--field-bg);border-radius:14px;padding:12px 16px;font-size:13px;line-height:1.5;margin-top:auto">Free delivery within Accra · Pickup at anniversary events</div>' +
    '</div></div></div>';
  root.querySelector('#prod-modal').addEventListener('click', function () { closeModal('prod-modal'); });
})();

function bgFor(url, pos) { return '#F0EDF8 url(\'' + url + '\') center ' + (pos || '30%') + '/cover no-repeat'; }

function renderProduct() {
  var p = PRODUCTS[prod.idx];
  document.getElementById('prod-title').textContent = p.title;
  document.getElementById('prod-main').style.background = bgFor(p.imgs[prod.img]);
  [0, 1].forEach(function (i) {
    var t = document.getElementById('prod-thumb-' + i);
    t.style.background = bgFor(p.imgs[i]);
    t.style.boxShadow = prod.img === i ? 'inset 0 0 0 2px #0E0C09' : 'inset 0 0 0 1px rgba(14,12,9,.15)';
  });
  document.getElementById('prod-alt').style.background = bgFor(PRODUCTS[1 - prod.idx].imgs[0]);
  var sizeEl = document.getElementById('prod-size');
  sizeEl.value = prod.size;
  sizeEl.style.borderColor = prod.sizeErr ? 'var(--error)' : 'transparent';
  var bag = document.getElementById('prod-bag');
  if (prod.added) {
    bag.textContent = '✓ Pre-order noted — size ' + prod.size;
    bag.style.background = 'var(--success-bg)';
    bag.style.color = 'var(--success-ink)';
  } else {
    bag.textContent = 'Pre-order';
    bag.style.background = '';
    bag.style.color = '';
  }
}

function openProduct(idx) {
  prod = { idx: idx, img: 0, size: '', added: false, sizeErr: false };
  renderProduct();
  openModal('prod-modal');
}
function setProdImg(i) { prod.img = i; renderProduct(); }
function setProdSize(v) { prod.size = v; prod.sizeErr = false; prod.added = false; renderProduct(); }
function switchProduct() { prod = { idx: 1 - prod.idx, img: 0, size: '', added: false, sizeErr: false }; renderProduct(); }
function addToBag() {
  if (!prod.size) { prod.sizeErr = true; renderProduct(); return; }
  prod.added = true; renderProduct();
}

/* ---------- Registration popup (two-step form, visual prototype) ---------- */

(function buildRegModal() {
  var root = document.getElementById('reg-modal-root');
  if (!root) return;
  root.innerHTML =
    '<div class="overlay" id="reg-modal">' +
    '<div style="position:relative;width:100%;max-width:560px;max-height:min(860px,92vh);overflow-y:auto;background:#fff;border-radius:28px;padding:36px;box-shadow:0 24px 80px rgba(14,12,9,.35)" onclick="event.stopPropagation()">' +
    '<button class="modal-close" onclick="closeModal(\'reg-modal\')" aria-label="Close registration">✕</button>' +
    '<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:500">Class of 2016 · 10 Years On</div>' +
    '<h2 style="font-weight:800;font-size:28px;margin:8px 0 6px">Hi there, Akora</h2>' +
    '<p style="font-size:15px;color:var(--muted);line-height:1.6;margin:0 0 22px">It\'s been 10 years! Help us reconnect the year group.</p>' +
    '<div style="display:flex;flex-direction:column;gap:14px">' +
    '<div style="display:flex;gap:14px"><input type="text" placeholder="First name(s)"><input type="text" placeholder="Last name"></div>' +
    '<input type="text" placeholder="School nickname (if you had one)">' +
    '<div style="display:flex;gap:14px"><input type="email" placeholder="Email address" style="flex:2"><select class="chevron" style="flex:1"><option>Gender…</option><option>Male</option><option>Female</option></select></div>' +
    '<div style="display:flex;gap:14px"><select class="chevron" style="flex:0 0 118px"><option>🇬🇭 +233</option></select><input type="tel" placeholder="Phone number"></div>' +
    '<button class="btn btn-ink" style="width:100%">Next <span>→</span></button>' +
    '<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);text-align:center;font-weight:500">Step 1 of 2 · Contact</div>' +
    '</div></div></div>';
  root.querySelector('#reg-modal').addEventListener('click', function () { closeModal('reg-modal'); });
})();
