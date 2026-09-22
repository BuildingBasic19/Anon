// Builds a standard UPI deep link. Any UPI app (FamPay, GPay, PhonePe,
// Paytm...) understands this format, so scanning the QR opens the payment
// screen directly in whichever app the student has.
export function buildUpiLink({ vpa, name, amount, note }) {
  const params = new URLSearchParams({
    pa: vpa,
    pn: name,
    am: String(amount),
    cu: 'INR',
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

// Renders the deep link as a scannable QR code image via a public,
// no-signup QR generation API — nothing sensitive is sent, just the
// already-public UPI payment string.
export function upiQrImageUrl(upiLink) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiLink)}`;
}
