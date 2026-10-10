# ダッシュボードを追加・更新する

## 既存定義の更新

1. 対象の `dashboard.json` を編集する。
2. `python3 scripts/manage.py validate` と単体テストを実行する。
3. `python3 scripts/manage.py plan synthetic-signals` で Grafana との差分を確認する。
4. `python3 scripts/manage.py apply synthetic-signals --write` で反映する。保存後の再取得も行う。
5. `python3 scripts/manage.py check synthetic-signals` で一致を確認する。
6. 表示・クエリを変更した場合はブラウザ検証を行い、画像を確認する。
7. JSON と説明を同じコミット / PR に含める。

別環境ではコマンドの先頭に `--environment staging` のように指定します。

## 新しいダッシュボード

`dashboards/<名前>/dashboard.json` と README を追加します。既存サンプルを参考にできますが、タイトル、クエリ、説明と検証条件を新しい目的に合わせて変更してください。

環境ファイルの `dashboards` に名前を登録します。

```json
"service-overview": {
  "uid": "codex-service-overview",
  "folder_uid": "fg0qelcp5ovswe"
}
```

UID は環境内で未使用の値を選び、フォルダーには読み取り・作成・更新権限があることを確認します。新規作成は次のコマンドです。

```bash
python3 scripts/manage.py validate
python3 scripts/manage.py apply service-overview --create --write
python3 scripts/manage.py check service-overview
```

`--create` は既存 UID の上書きを要求しません。UID が衝突したら、既存ダッシュボードを消さずに新しい UID を選び直します。作成成功後も取得できなければ、権限やフォルダーを調べます。

## ブラウザチェックの追加

`checks.json` に確認したい全パネルのタイトル、期待する固定値、時系列の有無を記載します。例はサンプルを参照してください。

```bash
npm run verify:browser -- grafana-cloud service-overview
```

固定値を持たないダッシュボードでは `expected_values` を空にできますが、現在のチェックだけでクエリの正しさが証明できるとは限りません。対象に合う検証を追加してください。

## UI から編集したものを取り込む

`export` は対象の登録 UID だけを取得し、環境依存のデータソース名を論理名へ戻して stdout に JSON を出します。README の手順で `.local/exports/` に保存し、差分をレビューした後で定義に取り込みます。取得失敗時は終了コードが 1 になります。失敗で空になった出力を定義へコピーしないでください。
