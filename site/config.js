/* OAA 16 — shared frontend config. These are public (publishable) values;
   row-level security controls what any client can actually read. */
var OAA_SUPABASE_URL = 'https://gbrbmtwpugxmenrfkloh.supabase.co';
var OAA_SUPABASE_KEY = 'sb_publishable_i9sm2any3EigKUBkxCv7Jg_j0UmtOac';
var OAA_PAY_INIT_URL = OAA_SUPABASE_URL + '/functions/v1/bakerypay-init';
var OAA_PAY_BANK_URL = OAA_SUPABASE_URL + '/functions/v1/bakerypay-bank';
var OAA_WHATSAPP_LINK = 'https://chat.whatsapp.com/E7NI1vNHNKgEQeGOUjSxWd?mode=gi_t';
var OAA_MOMO_FEE_RATE = 0.025;  // 2.5% all-in, confirmed with Bakery Pay
var OAA_PAYMENTS_LIVE = false;  // flip to true when Bakery Pay leaves mock mode

var OAA_HOUSE_COLORS = {
  'Aggrey House': '#C1272D', 'Baeta House': '#C1272D', 'Clark House': '#2456C4',
  'Cadbury House': '#5B3A29', 'Fraser House': '#2F9E44', 'Guggisberg House': '#2456C4',
  'Gyamfi House': '#2F9E44', 'Kingsley House': '#B8A004', 'Kwapong House': '#7C3AED',
  'Livingstone House': '#B8A004', 'Lugard House': '#4FA8E0', 'McCarthy House': '#ED7014',
  'OAA House': '#7C3AED', 'SOA House': '#14532D', 'Slessor House': '#8A4B6D'
};

function oaaGhs(pesewas) {
  return 'GH₵' + (pesewas / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
