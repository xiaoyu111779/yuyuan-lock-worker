// 芋圆机 · 锁机邮件扳机(自部署 Cloudflare Worker)
// 芋圆机 → POST /lock {token,minutes,char,reason} → 本 Worker 用 Resend 发一封主题 YC-LOCK-<分钟> 的邮件到你自己的邮箱
// → iPhone 快捷指令自动化「收到主题含 YC-LOCK 的邮件」→ 运行 one sec「Start Block Session」(strict,时长=主题里的数字)
// POST /unlock → 主题 YC-UNLOCK → 另一条自动化跑一次极短 block 盖掉当前长 block = 提前放行
// 变量(在 Cloudflare 后台 Settings → Variables 填):
//   RESEND_API_KEY  Resend 的 API Key(免费账号即可)
//   TO_EMAIL        你手机上收邮件的地址(必须是 iCloud/Exchange 这类【推送】账户;Gmail 在系统邮件 App 是 15 分钟拉一次,会晚)
//   LOCK_TOKEN      你自己随便设一串密码,芋圆机里填同一串;没对上不发(防止别人拿你的地址乱锁你)
//   FROM_EMAIL      (可选)发件人;不填用 Resend 内置 onboarding@resend.dev(只能发给 Resend 账号本人邮箱——刚好)
//   UNLOCK_SECONDS  (可选)解锁那次短 block 的秒数,默认 10(仅写进邮件正文给自动化参考;自动化里时长要你自己填)
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': '*', 'Cache-Control': 'no-store' };
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/' || url.pathname === '/ping') {
      return J({ ok: true, app: 'yuyuan-lock', hasKey: !!env.RESEND_API_KEY, hasTo: !!env.TO_EMAIL, hasToken: !!env.LOCK_TOKEN, unlockSeconds: Number(env.UNLOCK_SECONDS || 10) });
    }
    if (req.method !== 'POST' || (url.pathname !== '/lock' && url.pathname !== '/unlock')) return J({ ok: false, error: 'not found' }, 404);
    let body = {}; try { body = await req.json(); } catch (e) {}
    if (!env.RESEND_API_KEY || !env.TO_EMAIL) return J({ ok: false, error: '没配 RESEND_API_KEY / TO_EMAIL(去 Cloudflare 后台 Settings → Variables 填)' }, 500);
    if (env.LOCK_TOKEN && String(body.token || '') !== String(env.LOCK_TOKEN)) return J({ ok: false, error: 'token 不对(芋圆机里填的要和 Worker 变量 LOCK_TOKEN 一样)' }, 403);
    const ch = String(body.char || '').slice(0, 40);
    const reason = String(body.reason || '').slice(0, 200);
    let subject, text;
    if (url.pathname === '/lock') {
      let m = parseInt(body.minutes, 10); if (isNaN(m) || m < 1) m = 30; if (m > 480) m = 480;
      subject = 'YC-LOCK-' + m;
      text = (ch || '芋圆机') + ' 把你的 App 锁了 ' + m + ' 分钟。' + (reason ? '\n' + reason : '') + '\n\n(这封邮件是给快捷指令自动化看的,可以删)';
    } else {
      const s = Number(env.UNLOCK_SECONDS || 10);
      subject = 'YC-UNLOCK';
      text = (ch || '芋圆机') + ' 把你放出来了。' + (reason ? '\n' + reason : '') + '\n\n(自动化会跑一次约 ' + s + ' 秒的短 block 盖掉当前的锁;这封邮件可以删)';
    }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.FROM_EMAIL || '芋圆机 <onboarding@resend.dev>', to: [env.TO_EMAIL], subject, text })
    });
    const rj = await r.json().catch(() => ({}));
    if (!r.ok) return J({ ok: false, error: 'Resend 拒绝:' + (rj && (rj.message || rj.error) || r.status) }, 502);
    return J({ ok: true, subject, id: rj.id || '' });
  }
};
