const IOS_STORE_URL = Deno.env.get('IOS_STORE_URL') ?? '';
const INVITE_LANDING_URL = Deno.env.get('INVITE_LANDING_URL') ?? '';
// const ANDROID_STORE_URL = Deno.env.get('ANDROID_STORE_URL') ?? '';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 招待元の userId を URL 末尾のセグメントから取り出す。
 * `/invite-redirect/invite/<userId>` と `/invite-redirect/<userId>` の両形式に対応する。
 */
const extractUserId = (url: string): string => {
  const last = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
  const decoded = decodeURIComponent(last);
  return UUID.test(decoded) ? decoded : '';
};

const redirect = (location: string) =>
  new Response(null, {
    status: 302,
    headers: { location, 'cache-control': 'no-store' },
  });

// Supabase の共有ドメイン（*.supabase.co）では Edge Function が HTML を返せず、
// content-type が text/plain に書き換えられる（Custom Domain 必須の制限）。
// そのため「アプリで開く / ストアへ」の分岐は外部ホストの中継ページに任せ、
// ここでは userId を引き継いだリダイレクトのみを行う。
Deno.serve((req) => {
  const userId = extractUserId(req.url);

  if (INVITE_LANDING_URL && userId) {
    const landing = new URL(INVITE_LANDING_URL);
    landing.searchParams.set('u', userId);
    return redirect(landing.toString());
  }

  // 中継ページが未設定、または userId が取れない場合はストアへ直接送る
  if (IOS_STORE_URL) {
    return redirect(IOS_STORE_URL);
  }

  return new Response('DaiB\nスマートフォンからアプリをダウンロードしてください\n', {
    status: 503,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
});
