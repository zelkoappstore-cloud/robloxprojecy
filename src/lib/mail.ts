export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://zelko-prototype.vercel.app';
export const mailEnabled = () => !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);

export const mailHtml = (title: string, body: string, cta?: { label: string; url: string }) =>
  `<div style='font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0f172a'><h2 style='margin:0 0 12px'>${esc(title)}</h2><p style='line-height:1.5'>${esc(body)}</p>${cta ? `<p><a href='${cta.url}' style='display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none'>${esc(cta.label)}</a></p>` : ''}<p style='color:#64748b;font-size:12px'>Zelko · message automatique, merci de ne pas répondre.</p></div>`;

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!mailEnabled()) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
