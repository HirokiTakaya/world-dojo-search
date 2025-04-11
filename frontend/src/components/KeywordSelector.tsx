// src/components/KeywordSelector.tsx
import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";

////////////////////////////////////////////////////////////////////////////////
// カタカナ → ひらがな変換関数（日本語用）
function unifyHiragana(str: string): string {
  return str.replace(/[ァ-ン]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) - 0x60);
  });
}

////////////////////////////////////////////////////////////////////////////////
// 日本語版キーワード一覧
const BJJ_KEYWORDS_JA: string[] = [
  // サブミッション系
  "アームバー", "三角絞め", "オモプラッタ", "キムラロック", "アメリカーナ",
  "チョーク", "クロスチョーク", "ボウアンドアローチョーク", "ギロチンチョーク",
  "アナコンダチョーク", "ダースチョーク", "ヒールフック", "アンクルロック",
  "ニーバー", "リストロック", "ツイスター", "バギーチョーク", "ミカバリーロック",

  // ガード系
  "クローズドガード", "オープンガード", "ハーフガード", "ディープハーフ",
  "スパイダーガード", "ラッソーガード", "バタフライガード", "デラヒーバガード",
  "リバースデラヒーバ", "Xガード", "シングルXガード", "Zガード", "ワームガード",
  "50/50ガード", "Kガード", "ラペルガード", "スクイッドガード", "スパイラルガード",
  "ラバーガード", "ロックダウン",

  // パスガード系
  "パスガード", "トレアンドパス", "レッグドラッグ", "ニースライス",
  "オーバーアンダーパス", "ダブルアンダーパス", "スマッシュパス",
  "ブルファイターパス", "スタッキングパス", "Xパス", "ロングステップパス",
  "カートホイールパス", "レッグウィーブパス",

  // ポジション系
  "バックテイク", "ニーオンベリー", "サイドコントロール", "マウントポジション",
  "ノースサウス", "バックマウント", "ニースライドポジション",
  "タートル", "クルーシフィックス", "トラックポジション",

  // スイープ系
  "スイープ", "フラワースイープ", "シザースイープ", "ヒップバンプスイープ",
  "トルネードスイープ", "ベリンボロ", "ウェイタースイープ", "オーバーヘッドスイープ",
  "サミールスイープ", "ヘリコプタースイープ", "オールドスクールスイープ",
  "トリポッドスイープ", "デラヒーバスイープ", "オモプラッタスイープ",

  // エスケープ系
  "ブリッジエスケープ", "エルボーエスケープ", "サイドコントロールエスケープ",
  "マウントエスケープ", "バックエスケープ", "タートルエスケープ",
  "グランビーロール", "ロールエスケープ",

  // トランジション系
  "ガードからマウント", "サイドからバック", "マウントからバック",
  "ハーフからスイープ", "スイープからサイド", "パスからニーオンベリー",

  // スタンド・テイクダウン
  "タックル（シングルレッグ）", "タックル（ダブルレッグ）", "飛びつきクローズドガード",
  "引き込み（プルガード）", "内股", "背負い投げ", "巴投げ", "首投げ",

  // モダン＆ノーギ特有技
  "サドル（ハニーホール）", "クロスアシガラミ", "ダブルトラブル",
  "マイキーロック", "エスティマロック", "タリコプラッタ", "バータプラッタ",

  // コンセプト・理論
  "ポスチャー（姿勢）", "フレーム", "ベース", "プレッシャー",
  "トランジション", "スクランブル", "グリップファイト",
  "レバレッジ（てこの原理）", "ディスタンス管理", "オフバランス",
  "スペースコントロール", "ストラクチャー", "タイミング"
];

// 英語版キーワード一覧
const BJJ_KEYWORDS_EN: string[] = [
  // Submission
  "Armbar", "Triangle choke", "Omoplata", "Kimura lock", "Americana",
  "Choke", "Cross choke", "Bow and arrow choke", "Guillotine choke",
  "Anaconda choke", "D'Arce choke", "Heel hook", "Ankle lock",
  "Kneebar", "Wrist lock", "Twister", "Buggy choke", "Mikabari lock",

  // Guard
  "Closed guard", "Open guard", "Half guard", "Deep half guard",
  "Spider guard", "Lasso guard", "Butterfly guard", "De la Riva guard",
  "Reverse De la Riva", "X-guard", "Single-leg X", "Z-guard", "Worm guard",
  "50/50 guard", "K-guard", "Lapel guard", "Squid guard", "Spiral guard",
  "Rubber guard", "Lockdown",

  // Pass
  "Guard pass", "Toreando pass", "Leg drag", "Knee slice",
  "Over-under pass", "Double-under pass", "Smash pass",
  "Bullfighter pass", "Stack pass", "X-pass", "Long step pass",
  "Cartwheel pass", "Leg weave pass",

  // Position
  "Back take", "Knee on belly", "Side control", "Mount position",
  "North-south", "Back mount", "Knee slide position",
  "Turtle", "Crucifix", "Truck position",

  // Sweep
  "Sweep", "Flower sweep", "Scissor sweep", "Hip bump sweep",
  "Tornado sweep", "Berimbolo", "Waiter sweep", "Overhead sweep",
  "Samil sweep", "Helicopter sweep", "Old school sweep",
  "Tripod sweep", "De la Riva sweep", "Omoplata sweep",

  // Escape
  "Bridge escape", "Elbow escape", "Side control escape",
  "Mount escape", "Back escape", "Turtle escape",
  "Granby roll", "Roll escape",

  // Transition
  "Guard to mount", "Side to back", "Mount to back",
  "Half to sweep", "Sweep to side", "Pass to knee on belly",

  // Stand & takedown
  "Single-leg takedown", "Double-leg takedown", "Jump to closed guard",
  "Pull guard", "Uchi mata", "Seoi nage", "Tomoe nage", "Kubi nage",

  // Modern & No-gi
  "Saddle (honey hole)", "Cross ashi garami", "Double trouble",
  "Mikey lock", "Estima lock", "Tarikoplata", "Baratoplata",

  // Concept / Theory
  "Posture", "Frame", "Base", "Pressure",
  "Transition", "Scramble", "Grip fight",
  "Leverage", "Distance management", "Off-balancing",
  "Space control", "Structure", "Timing"
];

////////////////////////////////////////////////////////////////////////////////
// Props
interface KeywordSelectorProps {
  onSelect: (keyword: string) => void;
}

////////////////////////////////////////////////////////////////////////////////
const KeywordSelector: React.FC<KeywordSelectorProps> = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // i18n から翻訳関数(t)と現在の言語(i18n.language)を取得
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language; // "en", "ja", ...

  // ◆ 言語が変わったら検索状態をリセット
  useEffect(() => {
    setSearchTerm("");
    setSelected("");
  }, [currentLang]);

  // キーリストを言語により切り替え
  const bjjKeywords = currentLang.startsWith("ja")
    ? BJJ_KEYWORDS_JA
    : BJJ_KEYWORDS_EN;

  // キーワード選択
  const handleSelect = (keyword: string) => {
    setSelected(keyword);
    onSelect(keyword);
    setIsOpen(false);
    setSearchTerm("");
  };

  // 検索バーの入力変更
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 検索・フィルタリング
  const filteredKeywords = useMemo(() => {
    if (!searchTerm) return bjjKeywords;

    if (currentLang.startsWith("ja")) {
      // 日本語ならカタカナ→ひらがな化して検索
      const searchHira = unifyHiragana(searchTerm).toLowerCase();
      return bjjKeywords.filter((keyword) => {
        const keywordHira = unifyHiragana(keyword).toLowerCase();
        return keywordHira.includes(searchHira);
      });
    } else {
      // 英語なら小文字だけ
      const searchLower = searchTerm.toLowerCase();
      return bjjKeywords.filter((keyword) =>
        keyword.toLowerCase().includes(searchLower)
      );
    }
  }, [searchTerm, bjjKeywords, currentLang]);

  return (
    <div className="w-full">
      {/* 開閉ボタン */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            // 開くタイミングで検索欄をリセット
            setSearchTerm("");
          }
        }}
        className="w-full px-4 py-3 rounded-t-lg bg-gray-700 text-white font-semibold hover:bg-gray-600 transition"
      >
        {selected || t("chooseTechnique")}
      </button>

      {isOpen && (
        <div className="border border-t-0 border-gray-600 rounded-b-lg bg-gray-800">
          {/* 検索バー */}
          <div className="p-2 bg-gray-700 border-b border-gray-600">
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className="w-full px-2 py-1 rounded bg-gray-200 text-gray-800 focus:outline-none"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {/* リスト表示エリア */}
          <div className="max-h-64 overflow-y-auto">
            {filteredKeywords.length > 0 ? (
              filteredKeywords.map((keyword) => (
                <button
                  key={keyword}
                  onClick={() => handleSelect(keyword)}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-700 transition text-white"
                >
                  {keyword}
                </button>
              ))
            ) : (
              <p className="text-gray-400 px-4 py-2">
                {t("noResults")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KeywordSelector;
