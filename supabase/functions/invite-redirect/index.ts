const IOS_STORE_URL = Deno.env.get('IOS_STORE_URL') ?? '';
// const ANDROID_STORE_URL = Deno.env.get('ANDROID_STORE_URL') ?? '';

Deno.serve((req) => {
  const ua = (req.headers.get('user-agent') ?? '').toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  // const isAndroid = /android/.test(ua);

  // iOS はストアへ直接リダイレクト
  if (isIOS && IOS_STORE_URL) {
    return new Response(null, {
      status: 302,
      headers: { location: IOS_STORE_URL },
    });
  }

  // Android 対応は一旦コメントアウト
  // if (isAndroid && ANDROID_STORE_URL) {
  //   return new Response(null, {
  //     status: 302,
  //     headers: { location: ANDROID_STORE_URL },
  //   });
  // }

  // PC など: ストアへのリンクを案内する HTML を返す
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>DaiB - \u62db\u5f85\u30ea\u30f3\u30af</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#E8E6E1;color:#1c1c1e;text-align:center;padding:24px;box-sizing:border-box}
  .card{background:#fff;border-radius:16px;padding:40px 32px;max-width:360px;width:100%;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  h1{font-size:24px;margin:0 0 8px}
  p{font-size:15px;color:#666;margin:8px 0 24px}
  .btn{display:inline-block;margin:8px;padding:14px 28px;background:#4E5F5C;color:#fff;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600}
</style>
</head>
<body>
<div class="card">
  <h1>DaiB</h1>
  <p>\u30b9\u30de\u30fc\u30c8\u30d5\u30a9\u30f3\u304b\u3089\u30a2\u30d7\u30ea\u3092\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9\u3057\u3066\u304f\u3060\u3055\u3044</p>
  ${IOS_STORE_URL ? `<a class="btn" href="${IOS_STORE_URL}">App Store</a>` : ''}
</div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
  });
});
