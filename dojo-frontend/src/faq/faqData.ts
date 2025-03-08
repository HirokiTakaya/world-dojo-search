// src/faq/faqData.ts

export interface FAQItem {
  keywords: string[]; // マッチ対象となるキーワード群（複数の表現）
  answers: {
    ja: string[]; // 日本語の回答候補
    en: string[]; // 英語の回答候補
  };
}

export const faqItems: FAQItem[] = [
  {
    keywords: [
      "このアプリの使い方",
      "アプリの使い方",
      "使い方",
      "使い方を教えて",
      "どうやって使う",
      "使用方法",
      "利用方法",
      "使い方が知りたい",
      "使い方を知りたい",
      "使い方の説明"
    ],
    answers: {
      ja: [
        "このアプリでは、まずホーム画面でログインし、各機能はメニューバーから利用できます。"
      ],
      en: [
        "In this app, first log in on the home screen, then use the various features available in the menu bar."
      ]
    }
  },
  {
    keywords: [
      "操作方法",
      "操作について",
      "操作の仕方",
      "ナビゲーション",
      "画面操作",
      "機能の使い方",
      "どうやって操作する",
      "操作方法を教えて",
      "使い方と操作"
    ],
    answers: {
      ja: [
        "操作方法はシンプルです。ログイン後、画面上部のナビゲーションバーから柔術道場情報が気になる地域の土地名を検索して情報を得るだけです。他にお気に入り機能や、練習カレンダー機能もあります。"
      ],
      en: [
        "The operation is simple. After logging in, just search for the area name of the region you're interested in for jiu-jitsu dojo information using the top navigation bar. Additionally, the app offers a favorites feature and a practice calendar."
      ]
    }
  },
  {
    keywords: [
      "サポート",
      "問い合わせ",
      "問い合わせ方法",
      "ヘルプ",
      "支援",
      "コンタクト",
      "サポートに連絡",
      "助けて"
    ],
    answers: {
      ja: [
        "サポートへのお問い合わせは、アプリ内の『サポート』セクションから行えます。詳細はサポートページをご確認ください。",
        "何かお困りの場合は、アプリ内のサポートボタンを押してお問い合わせください。"
      ],
      en: [
        "You can contact support through the 'Support' section within the app. Please check the support page for more details.",
        "If you encounter any issues, simply tap the support button within the app to get help."
      ]
    }
  },
  {
    keywords: [
      "何を検索したら良いのか",
      "検索方法",
      "検索",
      "検索して",
      "どう検索する",
      "どのように検索",
      "what should i search for",
      "search keywords",
      "search",
      "search term"
    ],
    answers: {
      ja: [
        "検索ワードは、ご自身の柔術道場情報を得たい土地名を検索してください。たとえば、あなたが東京の柔術道場を調べたい場合、東京と検索してください。"
      ],
      en: [
        "For search keywords, please enter the name of the area for which you want jiu-jitsu dojo information. For example, if you want to search for jiu-jitsu dojos in Tokyo, just search for 'Tokyo'."
      ]
    }
  },
  {
    keywords: [
      "このアプリの目的",
      "アプリの目的",
      "目的は",
      "何のためのアプリ",
      "アプリの狙い",
      "purpose of this app",
      "what is this app for",
      "app objective"
    ],
    answers: {
      ja: [
        "このアプリは、ユーザーが柔術道場をを効率的に探すことができ、柔術の練習頻度を増やせることを目標としています。出稽古文化が盛んな柔術だからこそ、実現できたアプリケーションです。"
      ],
      en: [
        "This app is designed to help users efficiently search for jiu-jitsu dojos and increase their practice frequency. It is made possible by the strong culture of training outside the dojo in jiu-jitsu."
      ]
    }
  },
  {
    keywords: [
      "練習カレンダーの使い方",
      "練習カレンダー",
      "カレンダー",
      "予定の登録",
      "スケジュール",
      "practice calendar",
      "how to use practice calendar",
      "calendar usage",
      "practice schedule"
    ],
    answers: {
      ja: [
        "練習カレンダーでは、練習した日にマークをすることができます。練習後にマークをすることができ、その週やその月にどのぐらいの頻度練習したのかを確認できます。"
      ],
      en: [
        "With the practice calendar, you can mark the days you have practiced. This allows you to check how frequently you practiced during the week or month."
      ]
    }
  },
  {
    keywords: [
      "お気に入りの使い方",
      "お気に入り",
      "ブックマーク",
      "お気に入り登録",
      "favorites",
      "how to use favorites",
      "save favorites",
      "favorite feature"
    ],
    answers: {
      ja: [
        "お気に入り機能では、気になる道場や行って良かった道場を自分のお気に入りとして保存いただけます。"
      ],
      en: [
        "The favorites feature lets you save dojos that interest you or that you had a good experience with as your favorites."
      ]
    }
  }
];
