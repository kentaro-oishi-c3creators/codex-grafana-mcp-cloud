# Codex × Grafana MCP

Grafana のダッシュボードを JSON として Git で管理し、公式 Grafana MCP を通して取得・反映・検証するリポジトリです。複数のダッシュボードと環境を追加できる構成にしています。

現在の対象は [Grafana Cloud](https://patientmoss2465.grafana.net)。[Synthetic Signals ダッシュボード](https://patientmoss2465.grafana.net/d/codex-test-716e4ec3e357)で、作成・取得・更新・再取得とブラウザ表示を確認しています。

## 構成

| パス | 役割 |
|---|---|
| `dashboards/<名前>/dashboard.json` | 環境に依存しないダッシュボード定義 |
| `dashboards/<名前>/checks.json` | ブラウザで確認するパネルと値 |
| `config/environments/<環境>.json` | URL、ダッシュボード UID、フォルダー、データソースの対応 |
| `config/codex/` | Codex MCP 登録設定の例 |
| `config/network-domains.txt` | 通信先の一覧。自動適用はしません |
| `scripts/` | セットアップ・MCP 起動・差分確認・反映・検証 |
| `tests/` | 定義の破損や環境依存の混入を検出するテスト |
| `demos/<名前>/` | 単独で開ける可視化デモと説明 |
| `docs/` | 設計・運用・環境設定・トラブル対応 |
| `.local/` | 依存関係、スクリーンショット、検証結果。Git 対象外 |
| `AGENTS.md` | Codex などが変更するときの作業ルール |

## 新宿人流ラボ

[SHINJUKU FLOW](demos/shinjuku-flow/README.md) は、人と車の移動アニメーション、時間再生、2D／3D切り替え、点の追跡、CSV保存を試せる独立デモです。HTMLをダウンロードしてブラウザで開けます。外部通信は不要で、データと地図は合成／模式モデルです。Grafana内のパネルとして公開したものではありません。

```bash
npm run verify:shinjuku
```

[設計とデータ仕様](docs/shinjuku-flow.md) に、モデルの前提と実データへ置き換える箇所を記載しています。

### GitHub Pagesで公開する

[公開設定と確認手順](docs/github-pages.md) を用意しています。GitHubの **Settings → Pages → Source → GitHub Actions** を一度選んでください。初回設定後はCodexからmainへの更新で公開処理を起動できます。以後はmain上のデモ変更に合わせて自動で検証・公開します。Pages未有効の場合は公開をスキップするので、ワークフローの成功だけでは公開成功を意味しません。

公開先（有効化・デプロイ成功後）は `https://kentaro-oishi-c3creators.github.io/codex-grafana-mcp-cloud/` です。

## 最初の準備

Python 3.10 以上、uv が必要です。ブラウザ検証には Node.js 20 以上と Chromium / Playwright も使います。

```bash
bash scripts/setup.sh
python3 scripts/manage.py validate
python3 -m unittest discover -s tests -v
```

Grafana のサービスアカウントトークンは、環境設定のネットワークシークレット `GRAFANA_SERVICE_ACCOUNT_TOKEN` に登録します。送信先は対象 Grafana のホスト名です。**トークンを JSON、README、コマンド引数、Git に保存しないでください。** 通常の PC では同名のプロセス環境変数を安全に設定します。

## 既存ダッシュボードを育てる

リポジトリのルートで実行してください。

```bash
# 保存済みの Grafana と Git の差分。書き込みません
python3 scripts/manage.py plan synthetic-signals

# JSON を編集した後、構造をチェック
python3 scripts/manage.py validate

# 反映のプレビュー。--write がない場合は書き込みません
python3 scripts/manage.py apply synthetic-signals

# 指定 UID のダッシュボードを反映し、再取得して一致を検証
python3 scripts/manage.py apply synthetic-signals --write

# 後から同期状態を確認。差分があれば終了コード 1
python3 scripts/manage.py check synthetic-signals
```

画面上で編集した変更を取り込む場合は、まず JSON を書き出して差分を確認します。

```bash
mkdir -p .local/exports
python3 scripts/manage.py export synthetic-signals > .local/exports/synthetic-signals.json
diff -u dashboards/synthetic-signals/dashboard.json .local/exports/synthetic-signals.json
```

確認後、必要な変更を `dashboard.json` に取り込みます。Git と Grafana が自動同期する仕組みではありません。

## ブラウザでも確認する

```bash
npm ci --ignore-scripts --no-audit --no-fund --cache .local/npm-cache
# Chromium がない環境だけ: npx playwright install chromium
npm run verify:browser -- grafana-cloud synthetic-signals
```

全パネルの表示、実際のクエリ結果、読み込みエラー、パネルエラー、JavaScript エラーを確認します。結果は `.local/browser/grafana-cloud/synthetic-signals/` に保存されます。API 保存成功だけでは画面確認の代わりになりません。

Grafana の周辺アプリや解析通信の失敗は別途記録します。サービスアカウント認証でアクセスできない周辺機能があるため、検証成功は対象ダッシュボードの表示・クエリ成功を意味します。

## 次に読むもの

- [現在のダッシュボード一覧](docs/dashboard-inventory.md)
- [既存の人事デモの内容確認](docs/hr-demo-review.md)
- [設計と管理方針](docs/architecture.md)
- [ダッシュボード追加・更新の手順](docs/dashboard-workflow.md)
- [環境と MCP の設定](docs/environment-setup.md)
- [よくあるエラーと確認方法](docs/troubleshooting.md)
- [今回のサンプルの説明](dashboards/synthetic-signals/README.md)

`validate.yml` はGrafana定義の構造チェックと単体テストを実行します。Grafanaの更新は自動実行せず、トークンもCIに要求しません。`pages.yml` は独立したHTMLデモを検証し、Pagesが有効な場合に公開します。
