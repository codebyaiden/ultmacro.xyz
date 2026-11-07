const SHORT_CODE = /^[A-HJ-NP-Z2-9]{12}$/i;

export async function onRequest(context) {
  const code = context.params.shortCode;
  if (!SHORT_CODE.test(code || '') || !['GET', 'HEAD'].includes(context.request.method)) return context.next();
  return context.rewrite(`/shortlink/?code=${encodeURIComponent(code.toUpperCase())}`);
}
