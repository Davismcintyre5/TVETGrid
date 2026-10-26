function normalize(phone, countryCode = '254') {
  let p = String(phone || '').replace(/\D/g, '');
  if (!p) return '';
  if (p.startsWith('0')) p = countryCode + p.slice(1);
  else if (p.length <= 10 && !p.startsWith(countryCode)) p = countryCode + p;
  return p;
}

function toE164(phone, countryCode = '254') {
  const p = normalize(phone, countryCode);
  return p ? `+${p}` : '';
}

function isValid(phone, countryCode = '254') {
  const p = normalize(phone, countryCode);
  return p.length >= 10 && p.length <= 15;
}

module.exports = { normalize, toE164, isValid };