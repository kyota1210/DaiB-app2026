import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const IOS_STORE_URL = Deno.env.get('IOS_STORE_URL') ?? 'https://apps.apple.com/app/daib-app/id000000000';
const ANDROID_STORE_URL = Deno.env.get('ANDROID_STORE_URL') ?? 'https://play.google.com/store/apps/details?id=com.anonymous.daibapp';

serve((req) => {
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const userId = segments[segments.length - 1] ?? '';
  const scheme = `daibapp://invite/${encodeURIComponent(userId)}`;
  const ua = (req.headers.get('user-agent') ?? '').toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const fallbackUrl = isIOS ? IOS_STORE_URL : ANDROID_STORE_URL;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>DaiB - 招待リンク</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#E8E6E1;color:#1c1c1e;text-align:center;padding:24px;box-sizing:border-box}
  .card{background:#fff;border-radius:16px;padding:40px 32px;max-width:360px;width:100%;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  h1{font-size:24px;margin:0 0 8px}
  p{font-size:15px;color:#666;margin:8px 0 24px}
  .btn{display:inline-block;padding:14px 32px;background:#4E5F5C;color:#fff;border-radius:12px;text-decoration:none;font-size:16px;font-weight:600}
  .store{margin-top:16px;font-size:13px;color:#999}
  .store a{color:#4E5F5C}
</style>
</head>
<body>
<div class="card">
  <h1>DaiB</h1>
  <p>アプリを開いてフレンド申請を送りましょう</p>
  <a class="btn" id="openApp" href="${scheme}">アプリで開く</a>
  <div class="store" id="storeHint" style="display:none">
    <p>アプリをお持ちでない場合</p>
    <a href="${fallbackUrl}">ストアからダウンロード</a>
  </div>
</div>
<script>
setTimeout(function(){document.getElementById('storeHint').style.display='block';}, 1500);
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
});
