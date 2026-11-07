# Mushroom

OpenCode向けのコーディング規則プラグイン。生成するコードを読みやすく、変更しやすく、理由が分かる状態に保つ。

Ponytailに着想を得た独立したプラグイン。Ponytailには依存せず、同時適用は想定しない。

[English README](README.md)

## 導入

まだnpmへ公開していない。今はこのディレクトリを`opencode.json(c)`の`plugins`へ追加する。

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/mushroom"]
}
```

初回公開後はパッケージ名へ置き換える。

## 使い方

| コマンド | 動作 |
| --- | --- |
| `/mushroom` | 有効化する。有効なら維持し、状態を表示する |
| `/mushroom on` | 有効化する |
| `/mushroom off` | 無効化する |
| `/mushroom status` | 状態を変更せず表示する |
| `/mushroom-review [対象]` | コードを変更せずレビューする |
| `/mushroom-help` | 簡単な案内を表示する |

状態はセッション単位。新規セッションはONで開始する。規則は通常のターン、ツール後の継続、圧縮へ適用する。タイトル生成には適用しない。

## 規則

規則の原本は`rules/SKILL.md`だけ。

## 開発

```sh
npm install
npm run check    # Biome
npm run verify   # Biome、型検査、テスト
```

## ライセンス

MIT。`LICENSE`を参照。
