# 運用スクリプト

すべてリポジトリのルートから実行します。

| スクリプト | 役割 |
|---|---|
| `setup.sh` | 公式 MCP v2.0.2 を `.local/` にインストール |
| `start-mcp.sh <環境>` | 指定環境の MCP を stdio で起動 |
| `manage.py` | 構造検証、差分、反映、取得、一致チェック |
| `verify-browser.cjs <環境> <ダッシュボード>` | Chromium で表示・実クエリ結果・エラー確認 |

`manage.py` は Python 標準ライブラリだけを使います。ブラウザ用 Playwright は `package-lock.json` に固定しています。管理コマンドの一覧は `python3 scripts/manage.py --help`、個別のオプションは `python3 scripts/manage.py apply --help` で確認できます。

認証情報は環境変数からのみ取得します。ブラウザは対象 Grafana のオリジンに限って Authorization ヘッダーを送り、認証状態やトークンを保存しません。

## 新宿人流デモの検証

`npm run verify:shinjuku`（`verify-shinjuku.cjs`）は独立したHTMLデモをChromiumで操作し、13項目を確認します。Grafana認証やネット接続は不要です。画像と結果は `.local/browser/shinjuku-flow/` に保存します。開き方は [デモのREADME](../demos/shinjuku-flow/README.md) を参照してください。
