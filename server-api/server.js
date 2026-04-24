const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger').createLogger('server');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// リクエストロガーミドルウェアを追加（ルート定義の前に配置）
app.use(requestLogger);

// 画像ファイルの公開設定
// http://localhost:3000/uploads/filename.jpg でアクセス可能になります
app.use('/uploads', express.static('uploads'));

// 移行完了後の縮退: APIはSupabase直結へ誘導
app.use('/api', (_req, res) => {
    res.status(410).json({
        message: 'このAPIは廃止されました。Supabase Auth / Database / Storage を利用してください。',
        code: 'MIGRATED_TO_SUPABASE',
    });
});

// 招待リンク中間ページ（認証不要・HTMLを返す）
app.get('/invite/:userId', (req, res) => {
    const userId = req.params.userId;
    const scheme = `daibapp://invite/${encodeURIComponent(userId)}`;
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    // TODO: ストア公開後に実際のURLへ差し替え
    const iosStoreUrl = 'https://apps.apple.com/app/daib-app/id000000000';
    const androidStoreUrl = 'https://play.google.com/store/apps/details?id=com.anonymous.daibapp';
    const fallbackUrl = isIOS ? iosStoreUrl : androidStoreUrl;

    res.send(`<!DOCTYPE html>
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
(function(){
  var opened = false;
  document.getElementById('openApp').addEventListener('click', function(e){
    opened = true;
  });
  setTimeout(function(){
    document.getElementById('storeHint').style.display = 'block';
  }, 1500);
})();
</script>
</body>
</html>`);
});

// エラーハンドラーミドルウェアを最後に追加（すべてのルートの後）
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
    logger.info(`サーバー起動`, { 
        port: PORT,
        url: `http://0.0.0.0:${PORT}`,
        networkUrl: `http://192.168.1.104:${PORT}`
    });
});