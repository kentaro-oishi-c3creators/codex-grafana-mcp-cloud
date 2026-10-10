# GitHub Pagesで新宿人流デモを公開する

## 初回設定

1. [リポジトリのSettings → Pages](https://github.com/kentaro-oishi-c3creators/codex-grafana-mcp-cloud/settings/pages) を開きます。
2. **Build and deployment → Source** に **GitHub Actions** を選びます。設定が保存されたことを確認してください。既存のPagesサイトがある場合は、今回のデモを同じサイトのルートへ配信する構成になるため、公開内容を確認してください。
3. 初回設定後、Codexに設定済みと伝えると、mainへの更新で公開処理を起動します。以後、デモ・公開設定・この公開手順の変更をmainへpushすると自動で検証・公開します。手動起動も必要な場合は [Actions → Publish Shinjuku Flow](https://github.com/kentaro-oishi-c3creators/codex-grafana-mcp-cloud/actions/workflows/pages.yml) の **Run workflow** を使えます。
4. `build` と `deploy` の両ジョブが成功したことを確認します。環境保護で承認が必要な場合は GitHub の表示に従って承認してください。

公開先は `https://kentaro-oishi-c3creators.github.io/codex-grafana-mcp-cloud/`。これはデプロイ成功後のURLです。Pages未有効の時点でリンクが表示されても、公開成功を意味しません。

## ワークフロー

`.github/workflows/pages.yml` はmain上のデモ・公開スクリプト・公開手順・関連依存設定の変更、または手動実行で動きます。

- `build`: 固定依存のインストール、13項目のブラウザ検証、公開HTMLの準備、Pages用アーティファクトのアップロード、Pages設定の確認。
- `deploy`: PagesのSourceがGitHub Actionsの場合だけ実行。公式 `configure-pages` / `deploy-pages` で配信し、その公開URLでHTTP 200、HTMLとコミットの一致、13項目の操作を確認。
- デプロイ後の画像・結果を `shinjuku-pages-browser` として7日保存します。

Pagesが未有効、またはSourceが別方式の場合は、`deploy` をスキップし、ジョブのSummaryに初回設定手順を表示します。**buildの成功とdeployの成功を区別してください。** APIの権限エラーなど、404以外の設定確認失敗はエラーとして報告します。公開後の検証失敗も成功として扱いません。ただし配信済みサイトを自動でロールバックするものではありません。

## 公開するファイル

`python3 scripts/build-pages.py` が `.local/pages-site/` に作る `index.html` と `.nojekyll` のみを公開します。HTMLは `demos/shinjuku-flow/index.html` と同じ内容です。ステージング先に想定外のファイルがあれば中止します。Grafanaの設定、トークン、ログ、他のダッシュボード、リポジトリ全体はアップロード対象にしません。

手動でAPIトークンを追加する必要はありません。Actionsの標準 `GITHUB_TOKEN` とPagesのOIDCで公開します。Pages自体の初回有効化は管理画面で行います。公式 `configure-pages` の自動有効化には標準 `GITHUB_TOKEN` 以外の管理権限付きトークンが必要なので、このワークフローでは自動有効化を要求しません。

## このクラウド環境からの確認

Gitのpush権限と、GitHubのPages設定変更APIを使う権限は別です。現在の環境でGitのpushは確認済みですが、`api.github.com` と公開先への通信はネットワークポリシーで拒否されました。

環境設定の下書きには既存のGrafana用ドメインを保持して、`api.github.com` と `kentaro-oishi-c3creators.github.io` を追加済みです。反映には環境設定の保存・公開が必要です。通信許可の追加だけでGitHub APIの認証・管理権限が得られるわけではありません。GitHub側の初回操作は上記の設定画面から行えます。Actions上の公開後検証は、このクラウド環境の通信制限に依存しません。
