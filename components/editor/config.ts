import {
  EditorPlugin,
  PluginNames,
  pluginCharacterChecker,
  pluginOcrSuspicious,
  pluginWhitespaceHighlighting,
} from "@/plugins";

export const initialDocumentTitle = "無題の文章";

export const initialContent = `Balloon Editor へようこそ！

【例】
誤植
生田春月

我が生涯《しやうがい》はあはれなる夢、
我れは世界の頁《ページ》の上の一つの誤植なりき。
我れはいかに空《むな》しく世界の著者に
その正誤《しやうご》をば求めけん。
されど誰か否《いな》と云ひ得ん、
この世界自らもまた
あやまれる、無益なる書物なるを。

【文字チェッカー】
青空文庫・外字注記辞書より
※［＃「區＋鳥」、第3水準1-94-69］
佐藤春夫訳「現代語訳　徒然草」の注記より
※「二カ所」「七ヵ条」の「カ」と「ヵ」、「―」と「～」の混在は、底本通りです。

【OCR誤認識ハイライト】
北大路魯山人『南浦紹明墨蹟』より
南浦も、この派の傑僧だから、これで世事にもなかなか通じて角《すみ》におけないところがある。

【スペース・改行の強調】
芥川龍之介『羅生門』より
　ある日の暮方の事である。一人の下人《げにん》が、羅生門《らしょうもん》の下で雨やみを待っていた。
　広い門の下には、この男のほかに誰もいない。
青空文庫の表記注記より
このファイルは W3C 勧告 XHTML1.1 にそった形式で作成されています。
`;

export const plugins: Map<PluginNames, EditorPlugin> = new Map([
  ["character-checker", pluginCharacterChecker],
  ["ocr-suspicious", pluginOcrSuspicious],
  ["whitespace-highlighting", pluginWhitespaceHighlighting],
]);
