# 環境と MCP の設定

## 環境設定ファイル

`config/environments/grafana-cloud.json` を参考に環境名の JSON を追加します。秘密情報の値は含めません。

| 項目 | 意味 |
|---|---|
| `grafana_url` | HTTPS の Grafana インスタンス URL |
| `token_env` | 実行時に読むシークレットの変数名 |
| `datasources` | 論理名 → 実際のデータソース UID |
| `dashboards` | ダッシュボード名 → UID とフォルダー UID |

## Codex クラウドのシークレット

ネットワークシークレット `GRAFANA_SERVICE_ACCOUNT_TOKEN` を設定し、許可送信先は `patientmoss2465.grafana.net` とします。同名を通常の環境変数にも重複登録すると、設定の保存や注入に問題が生じるため、重複させません。

サービスアカウントには対象フォルダーの作成・読み取り・更新権限が必要です。今回のアカウントは既存の GrafanaCloud フォルダーで確認済みです。General には作成できても取得できないため、そこには展開しません。

## MCP 登録

`config/codex/mcp.toml.example` は既存の設定に追加するための例です。絶対パスを実際のチェックアウトに合わせます。`bash scripts/start-mcp.sh grafana-cloud` は stdio なので、MCP クライアントが起動して stdin を維持します。バックグラウンド HTTP サーバーとして起動しません。

設定ファイルを置くだけでは、このチャットにツールが追加されたことにはなりません。クライアントの登録・再接続後に実際のツール一覧と操作を確認してください。今回の実証は Python 管理ツールから公式 MCP を起動して行っています。

## 通信とブラウザ

`config/network-domains.txt` は必要な通信先です。既存の許可リストを保持して追加してください。パッケージマネージャーのプリセットがある環境ではインストール先が既に許可されている場合があります。

Grafana の画面は `grafana-assets.grafana.net`、プラグインは `plugins-cdn.grafana.net` から取得します。対象インスタンスだけを許可してもブラウザの確認は完了しません。

ブラウザはシステム Chromium を優先します。別の実行ファイルは `PLAYWRIGHT_CHROMIUM_EXECUTABLE` で指定できます。Chromium がない PC では `npx playwright install chromium` を実行してください。追加のダウンロード先が必要なら公式の通信先を確認して追加します。

HTTPS プロキシの CA が Chromium に認識されない場合は、信頼済みの環境提供 CA と実際に参照する証明書ストアを確認します。今回のクラウドではユーザー承認後に CA を登録し、承認された実行コンテキストでブラウザ確認しました。証明書検証を無効化しないでください。

## インストール・起動の再利用

導入は `bash scripts/setup.sh`、ブラウザ依存は `npm ci --cache .local/npm-cache` で再現します。プロセスはスナップショットに保持されません。公開後や別タスクでは MCP クライアントが起動し直します。設定を公開したことと、復元後に検証したことは別々に記録します。
