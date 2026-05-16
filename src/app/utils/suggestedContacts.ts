/**
 * Suggested contacts — curated experts from the iGaming/affiliate community.
 * Tags strictly drawn from existing TAG_GROUPS (Команда / Трафик / Вертикали).
 */
export type SuggestedContact = {
  id: string;
  name: string;
  username: string;
  company: string;
  role: string;
  description: string;
  tags: string[];
  link?: string;
};

export const SUGGESTED_CONTACTS: SuggestedContact[] = [
  {
    id: "sug-anton-khomenok",
    name: "Anton Khomenok",
    username: "homka6",
    company: "X6 Agency",
    role: "CEO, Founder",
    description: "Медиабаинг через Telegram Ads и SMM в iGaming с 2016. Своя сеть social-источников трафика.",
    tags: ["Buying", "Influence", "Gambling"],
    link: "https://affcatalog.com/en/person/anton-khomenok/",
  },
  {
    id: "sug-max-dovolnyy",
    name: "Max Dovolnyy",
    username: "alfa_otc",
    company: "RUSH Agency",
    role: "Founder",
    description: "HR-агентство в high-risk и affiliate (2025). Первые кандидаты за 24 часа через свои медиаресурсы.",
    tags: ["HR", "Gambling", "Betting"],
    link: "https://affcatalog.com/en/hr-agencies/rush-agency/",
  },
  {
    id: "sug-alex-nomad",
    name: "Alex Nomad",
    username: "AlexWebSEO",
    company: "SEO Dream Team · 1Bet 4Win Partners",
    role: "Founder, CEO",
    description: "Один из самых медийных SEO-специалистов в gambling. Бывший Lead SEO в 1Win, основал SEO Dream Team в 2020. PBN, SERP, GEO SEO, AI-автоматизация.",
    tags: ["SEO", "Gambling", "Betting"],
    link: "https://affcatalog.com/en/aff-team/seo-dream-team/",
  },
  {
    id: "sug-igor-alexeev",
    name: "Igor Alexeev",
    username: "alexeev_work",
    company: "Private inc.",
    role: "Owner",
    description: "Медиабаинг с FB, ASO, PPC-трафиком в Betting и iGaming.",
    tags: ["Buying", "FB", "ASO", "PPC", "Betting", "Gambling"],
    link: "https://affcatalog.com/en/person/igor-alexeev/",
  },
  {
    id: "sug-margo-yans",
    name: "Маргарита Янс",
    username: "margo_gvr",
    company: "G GATE",
    role: "Founder",
    description: "Основательница международного партнёрского сообщества G GATE и конференции G GATE CONF.",
    tags: ["Партнёрская сеть", "Конференции"],
  },
  {
    id: "sug-alex-slobozhenko",
    name: "Alex Slobozhenko",
    username: "alex_slobozhenko",
    company: "Devils",
    role: "Founder",
    description: "Одна из крупнейших арбитражных команд Украины (2019). FB Ads, TikTok, in-app. Betting, Dating, Финансы, iGaming, Нутра.",
    tags: ["Buying", "FB", "TikTok Ads", "Gambling", "Betting", "Нутра", "Финансы"],
    link: "https://affcatalog.com/en/person/alexander-slobozhenko/",
  },
  {
    id: "sug-sergei-glaukus",
    name: "Sergei Glaukus",
    username: "sergei_ggate",
    company: "G GATE",
    role: "CBDO",
    description: "CBDO партнёрского сообщества G GATE. Email-маркетинг, conversion optimization, спикер iGaming-конференций.",
    tags: ["Партнёрская сеть", "Email", "Gambling"],
    link: "https://affcatalog.com/en/person/sergei-glaukus/",
  },
  {
    id: "sug-mike-waizman",
    name: "Mike Waizman",
    username: "misterXT",
    company: "NGM Game",
    role: "CMO",
    description: "Global marketing strategies, бренд-девелопмент и расширение partner network в iGaming/Betting.",
    tags: ["PR", "Партнёрская сеть", "Gambling", "Betting"],
    link: "https://affcatalog.com/en/person/mike-waizman/",
  },
  {
    id: "sug-dzmitry",
    name: "Dzmitry",
    username: "dimasaiditeam",
    company: "Saidi Team",
    role: "Team Lead",
    description: "Арбитражная команда в iGaming-вертикали.",
    tags: ["Buying", "FB", "Gambling"],
  },
  {
    id: "sug-nikita-enchant",
    name: "Никита Николаев",
    username: "enchant_nick",
    company: "Enchant Affiliates",
    role: "CEO",
    description: "CEO Enchant Affiliates — партнёрской сети в iGaming-вертикали.",
    tags: ["Партнёрская сеть", "Gambling"],
  },
  {
    id: "sug-kolya-diveroli",
    name: "Николай",
    username: "Efraim_DiveroIi",
    company: "Diveroli Team",
    role: "CEO",
    description: "CEO Diveroli Team, арбитражник, автор в арбитражных медиа.",
    tags: ["Buying", "Gambling"],
  },

  // ─── New batch ───────────────────────────────────────
  {
    id: "sug-evgeny-ivanov",
    name: "Евгений Иванов",
    username: "dumay",
    company: "Wap.Click",
    role: "Owner, Influencer",
    description: "Owner Wap.Click. Инфлюенсер в affiliate-комьюнити.",
    tags: ["Influence"],
  },
  {
    id: "sug-erdem-ukhinov",
    name: "Эрдэм Ухинов",
    username: "greatagaincpa",
    company: "Royal Partners · AFFVIBE",
    role: "CEO, Founder",
    description: "CEO Royal Partners, founder AFFVIBE. Ведёт TG-канал «Арбитражный Шаман» и подкаст «Трое про ROI». Спикер SiGMA, SBC, Kinza, BROCONF.",
    tags: ["Партнёрская сеть", "Influence", "PR", "Gambling"],
  },
  {
    id: "sug-evgeny-stolpovsky",
    name: "Евгений Столповский",
    username: "stoIpovsky",
    company: "OfferWall",
    role: "Founder, CEO",
    description: "Founder и CEO арбитражной компании OfferWall.",
    tags: ["Buying", "Партнёрская сеть", "Gambling"],
  },
  {
    id: "sug-vadim-korepov",
    name: "Вадим Корепов",
    username: "koreps",
    company: "Partnerkin · MetaPax",
    role: "Co-founder, CEO",
    description: "Со-основатель и CEO Partnerkin.com и MetaPax. Один из ключевых медиа-игроков в affiliate-комьюнити.",
    tags: ["PR"],
  },
  {
    id: "sug-denis-dzyubenko",
    name: "Денис Дзюбенко",
    username: "DenisDzyubenko",
    company: "SiGMA World",
    role: "Managing Director (East EU & CIS)",
    description: "Managing Director SiGMA World по региону East EU и CIS. Организует ключевые iGaming-ивенты.",
    tags: ["PR", "Конференции"],
  },
  {
    id: "sug-sasha-usnul",
    name: "Саша Уснул",
    username: "SashaUsnul",
    company: "JUST Brand Agency",
    role: "CMO",
    description: "CMO JUST Brand Agency. Брендинг и маркетинг в iGaming.",
    tags: ["PR"],
  },
];

// ── Dismissed / added tracking ──────────────────────────
const DISMISSED_KEY = "w52_suggestions_dismissed";
const ADDED_KEY = "w52_suggestions_added";

export function loadDismissedSuggestions(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function dismissSuggestion(id: string) {
  const set = loadDismissedSuggestions();
  set.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
}

export function loadAddedSuggestions(): Set<string> {
  try {
    const raw = localStorage.getItem(ADDED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markSuggestionAdded(id: string) {
  const set = loadAddedSuggestions();
  set.add(id);
  localStorage.setItem(ADDED_KEY, JSON.stringify([...set]));
}

export function getActiveSuggestions(): SuggestedContact[] {
  const dismissed = loadDismissedSuggestions();
  const added = loadAddedSuggestions();
  return SUGGESTED_CONTACTS.filter((s) => !dismissed.has(s.id) && !added.has(s.id));
}
