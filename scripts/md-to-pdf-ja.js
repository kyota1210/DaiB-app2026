/**
 * Markdown を日本語対応 PDF に変換するスクリプト
 * Puppeteer + HTML レンダリング（日本語完全対応）
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    body { font-family: "Meiryo", "Yu Gothic", "Hiragino Sans", sans-serif; font-size: 12pt; line-height: 1.6; padding: 40px; color: #333; }
    h1 { font-size: 22pt; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #ddd; }
    h2 { font-size: 18pt; margin-top: 20px; margin-bottom: 10px; }
    h3 { font-size: 16pt; margin-top: 16px; margin-bottom: 8px; }
    h4, h5, h6 { font-size: 14pt; margin-top: 12px; margin-bottom: 6px; }
    p { margin: 0 0 10px; }
    ul, ol { margin: 0 0 10px; padding-left: 24px; }
    li { margin-bottom: 4px; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11pt; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 10pt; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: bold; }
    blockquote { border-left: 4px solid #ddd; margin: 12px 0; padding-left: 16px; color: #666; }
    hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="content">
  {{CONTENT}}
  </div>
</body>
</html>`;

async function convertMdToPdf(inputPath, outputPath) {
  const md = fs.readFileSync(inputPath, 'utf8');
  const htmlContent = marked.parse(md, { gfm: true });
  const html = HTML_TEMPLATE.replace('{{CONTENT}}', htmlContent);

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    puppeteer = require('md-to-pdf/node_modules/puppeteer');
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  const docsDir = path.join(__dirname, '..', 'docs');
  const adrDir = path.join(docsDir, 'adr');

  const files = [
    ['README.md', 'README.pdf'],
    ['vision.md', 'vision.pdf'],
    ['requirements.md', 'requirements.pdf'],
    ['user-stories.md', 'user-stories.pdf'],
    ['screen-list.md', 'screen-list.pdf'],
    ['data-model.md', 'data-model.pdf'],
    ['api.md', 'api.pdf'],
  ];

  const adrFiles = [
    ['0001-architecture-decision-jwt-authentication.md', '0001-architecture-decision-jwt-authentication.pdf'],
    ['0002-architecture-decision-logical-deletion.md', '0002-architecture-decision-logical-deletion.pdf'],
    ['0003-architecture-decision-react-native-expo.md', '0003-architecture-decision-react-native-expo.pdf'],
  ];

  for (const [src, dest] of files) {
    const input = path.join(docsDir, src);
    const output = path.join(docsDir, dest);
    if (fs.existsSync(input)) {
      await convertMdToPdf(input, output);
      console.log('Wrote', output);
    }
  }

  for (const [src, dest] of adrFiles) {
    const input = path.join(adrDir, src);
    const output = path.join(adrDir, dest);
    if (fs.existsSync(input)) {
      await convertMdToPdf(input, output);
      console.log('Wrote', output);
    }
  }

  console.log('完了');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
