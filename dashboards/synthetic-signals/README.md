# Synthetic Signals

Grafana MCP で作成・取得・更新できることを試す、ダミーデータのダッシュボードです。

| パネル | 種類 | データ |
|---|---|---|
| Synthetic wave | 時系列 | `50 + 20 * sin(vector(time()) / 60)` |
| Demo load | ゲージ | `vector(72)` |
| Demo success rate | 数値 | `vector(99.5)` |
| Experiment status | テキスト | 実験の説明 |

論理データソース名 `prometheus` は環境ファイルで既存 Prometheus に対応させます。実メトリクスは参照せず、新しいデータソースやサービスは作りません。

`dashboard.json` は表示エラーを修正した Grafana v2 定義を取得したものです。`checks.json` は4パネル、72、99.5、複数点の時系列を確認します。Grafana Cloud 環境での作成・取得・更新・再取得、公開後の接続とブラウザ表示を確認済みです。

画面の編集を取り込む際は `python3 scripts/manage.py export synthetic-signals` を使い、差分をレビューします。追加したパネルやクエリの説明と検証条件も更新してください。
