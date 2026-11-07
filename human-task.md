# Human tasks for the first npm publish

作業ディレクトリ: `~/10_Projects/mushroom`

## 1. npmへログインする（必須）

```sh
npm login
npm whoami
```

`npm whoami`が自分のアカウント名を返せば完了。

2要素認証が有効な場合、公開時にOTPを聞かれる。手元で入力できる状態にする。

## 2. 公開内容を確認する（任意）

```sh
cd ~/10_Projects/mushroom
npm run verify
npm publish --dry-run
```

期待値:

- `mushroom-mentor@0.1.0`
- 9ファイル、約8 kB
- `LICENSE`、README 2言語、`rules/SKILL.md`、`src` 4ファイル
- テストと開発設定は含まれない

`npm publish`時は`prepublishOnly`が`npm run verify`とリリース検査を自動実行する。版が未公開であること、最新より大きいこと、必須ファイル、clean tree、タグ未作成を確認する。

## 3. 公開する

```sh
npm publish
```

OTPが必要な場合:

```sh
npm publish --otp=123456
```

成功表示は`+ mushroom-mentor@0.1.0`。

ログイン後、エージェントに公開を任せてもよい。

## 4. コミットをpushし、タグとReleaseを作る

```sh
git push origin main
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --title v0.1.0 --notes "First public release."
```

## 5. npmから導入して確認する

本番のOpenCode設定を汚さないため、隔離した設定で試す。

```sh
mkdir -p /tmp/mushroom-npm/.config/opencode
cat > /tmp/mushroom-npm/.config/opencode/opencode.json <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["mushroom-mentor"]
}
EOF
XDG_CONFIG_HOME=/tmp/mushroom-npm opencode
```

確認項目:

- `/mushroom status` が`Mushroom: ON`を返す
- `/mushroom off` が`Mushroom: OFF`を返す
- `/mushroom` でONへ戻る
- `/mushroom-help` が案内を表示する
- `/mushroom-review` がコードを変更しない
- Ponytailが有効なら`/ponytail off`の案内が出る

## 6. 常用設定へ切り替える（任意）

```sh
opencode plugin add mushroom-mentor
```

Ponytailと併用しない。Ponytail側を止める。

```text
/ponytail off
```

## 失敗した場合

- 公開直後72時間以内なら`npm unpublish mushroom-mentor@0.1.0`で取り消せる。可能なら避け、修正版を出す。
- 導入できない場合は、バージョンとOpenCodeの版を記録し、`npm view mushroom-mentor version`で公開を確認する。
- 状態が読めない場合は`Mushroom: ON`を推測せず、`/mushroom status`の案内に従う。
