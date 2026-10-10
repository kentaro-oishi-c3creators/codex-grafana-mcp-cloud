# ダッシュボード一覧

Grafana 上で現在確認できる15件の一覧は [現在のダッシュボード一覧](../docs/dashboard-inventory.md) にあります。以下は定義を Git 管理しているダッシュボードのみです。

| 名前 | 目的 | 定義 |
|---|---|---|
| [synthetic-signals](synthetic-signals/README.md) | MCP 作成・更新とダミーデータ表示の実証 | [dashboard.json](synthetic-signals/dashboard.json) |

新規追加は `dashboards/<kebab-case>/` に定義・README・必要なチェック条件をまとめ、環境ファイルに登録します。詳細は [追加・更新の手順](../docs/dashboard-workflow.md) を参照してください。
