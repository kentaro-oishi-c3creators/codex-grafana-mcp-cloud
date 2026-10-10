# 現在のダッシュボード一覧

確認日: 2026-10-10。現在のサービスアカウントから公式 MCP の一覧取得と内容サマリー取得に成功した **15件** です。インスタンス全体の全件を保証する一覧ではありません。検索はページ末尾まで取得しています。

「パネル数」は行見出し（row）を除く表示パネル数です。テキストパネルも含みます。構成の確認を行った一覧であり、全15件の表示やクエリの成功を検証したものではありません。

## 試作・Git 管理

| ダッシュボード | パネル数 | 内容 | Git 管理 |
|---|---:|---|---|
| [グループ統合人事デモダッシュボード（モビリティグループ連結）](https://patientmoss2465.grafana.net/d/kevrzj5/861482a) | 4 | 月次の離職率・残業・エンゲージメント、年代別男女人数、会社別人事 KPI、従業員数 | 内容調査のみ。[詳細](hr-demo-review.md)。定義は未取り込み |
| [Codex MCP Test - Synthetic Signals - Verified](https://patientmoss2465.grafana.net/d/codex-test-716e4ec3e357) | 4 | 定数と時刻から生成する波形、72のゲージ、99.5の数値、実験説明 | [定義・説明](../dashboards/synthetic-signals/README.md)。作成・更新・公開後表示まで検証済み |

## Grafana の利用・運用監視

以下はパネル構成から用途を要約しています。既存定義を Git へ取り込んだり変更したりはしていません。

| ダッシュボード | パネル数 | 主な内容 |
|---|---:|---|
| [Alert Groups Insights](https://patientmoss2465.grafana.net/d/3ce476e3-931c-4b97-8e51-eb8d2243a2e7) | 17 | アラートグループ数、応答・解決時間、チームや連携別の状況 |
| [Billing/Usage](https://patientmoss2465.grafana.net/d/4ad7226d-4813-4bf8-aa32-00116c537cda) | 82 | 製品別・月別の課金使用量、メトリクス・ログ等の利用状況 |
| [Cardinality management - 1 - overview](https://patientmoss2465.grafana.net/d/cardinality-management) | 8 | メトリクスのカーディナリティ概要 |
| [Cardinality management - 2 - metrics](https://patientmoss2465.grafana.net/d/cardinality-management-metrics-detail) | 9 | メトリクス別のカーディナリティ分析 |
| [Cardinality management - 3 - labels](https://patientmoss2465.grafana.net/d/cardinality-management-label-detail) | 6 | ラベル別のカーディナリティ分析 |
| [Cloud Logs Export Insights](https://patientmoss2465.grafana.net/d/4_D6mSh4z) | 8 | Cloud Logs Export のエクスポート状況 |
| [Incident Insights](https://patientmoss2465.grafana.net/d/1f501b4f-c974-4fc0-9a82-2785e8c55d61) | 20 | インシデント対応の状況と集計 |
| [Usage Insights - 1 - Overview](https://patientmoss2465.grafana.net/d/XU8HAD5Gk) | 11 | Grafana の利用状況全体 |
| [Usage Insights - 2 - Data sources](https://patientmoss2465.grafana.net/d/AEbrOO2Mz) | 13 | データソースの利用状況 |
| [Usage Insights - 3 - Query Errors](https://patientmoss2465.grafana.net/d/MpmkYhRVz) | 8 | クエリエラーの可視化・分析 |
| [Usage Insights - 4 - Alertmanager](https://patientmoss2465.grafana.net/d/ntS5Ujs7z) | 4 | Alertmanager の利用状況 |
| [Usage Insights - 5 - Metrics Ingestion](https://patientmoss2465.grafana.net/d/cdn9jukg55bswb) | 10 | メトリクス取り込みと破棄率など |
| [Usage Insights - 6 - Loki Query Fair Usage Drilldown](https://patientmoss2465.grafana.net/d/cdybdibbio2dcd) | 9 | Loki のクエリ負荷・公平利用の分析 |

## 一覧に含まれない既知の項目

初回の MCP 実験で General に作成した UID `codex-test-e994900070fb` は、以前の確認で読み取り権限不足（403）でした。現在の検索結果にも含まれていません。削除確認はしていないため、削除済みとは扱いません。上の15件には数えていません。

他のフォルダーに、現在のサービスアカウントから見えないダッシュボードがある可能性もあります。アカウント全体の一覧が必要な場合は、対象フォルダーへの読み取り権限を用意したうえで再取得します。

## 更新するとき

公式 MCP の `search_dashboards` をページ末尾まで取得し、`get_dashboard_summary` で内容を確認してこの一覧を更新します。Git 管理対象を増やすこととは別の作業です。定義の取り込み・反映は [追加・更新の手順](dashboard-workflow.md) に従います。
