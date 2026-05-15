export interface User {
  id: string;
  name: string;
  username?: string;
  role: string;
  company: string;
  companyUrl?: string;
  photo?: string;
  tags: string[];
  links: { type: string; url: string }[];
  bio?: string;
}

export interface Connection {
  id: string;
  user: User;
  metAt: string;
  event?: string;
  note?: string;
  aiSummary?: string;
  lastContact?: string;
  followUpSent?: boolean;
  followUpSentAt?: string;
}

export const currentUser: User = {
  id: "user1",
  name: "Алексей Смирнов",
  username: "alexsmirnov",
  role: "Media Buyer",
  company: "Digital Arbitrage Co",
  companyUrl: "https://digitalarbitrage.co",
  photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
  bio: "Специализируюсь на трафике для iGaming и Nutra офферов в LATAM. 5+ лет опыта в арбитраже.",
  tags: ["iGaming", "Nutra", "LATAM", "Traffic Arbitrage"],
  links: [
    { type: "telegram", url: "https://t.me/alexsmirnov" },
    { type: "linkedin", url: "https://linkedin.com/in/alexsmirnov" },
    { type: "instagram", url: "https://instagram.com/alexsmirnov" },
    { type: "email", url: "mailto:alex@digitalarbitrage.co" },
    { type: "website", url: "https://alexsmirnov.pro" },
  ],
};

export const mockContacts: Connection[] = [
  {
    id: "c1",
    user: {
      id: "u2",
      name: "Иван Петров",
      username: "ivanpetrov",
      role: "Affiliate Manager",
      company: "CPA Network",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      tags: ["Dating", "Gambling", "TIER-1"],
      links: [{ type: "telegram", url: "https://t.me/ivanpetrov" }],
    },
    metAt: "2026-05-13T15:30:00Z",
    event: "МАС 2026",
    note: "Ищет партнёров для gambling офферов в EU. Готов делиться эксклюзивными офферами.",
    aiSummary: "Affiliate manager, специализируется на gambling TIER-1, предлагает эксклюзивные офферы",
    lastContact: "2026-05-13",
    followUpSent: true,
    followUpSentAt: "2026-05-13T16:00:00Z",
  },
  {
    id: "c2",
    user: {
      id: "u3",
      name: "Мария Соколова",
      username: "mariasokolova",
      role: "Payment Solutions",
      company: "PayGate",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      tags: ["FinTech", "Payments", "Crypto"],
      links: [
        { type: "telegram", url: "https://t.me/mariasokolova" },
        { type: "website", url: "https://paygate.io" },
      ],
    },
    metAt: "2026-05-13T16:45:00Z",
    event: "МАС 2026",
    note: "Работает с крипто-пэйментами для арбитража. Низкие комиссии для больших объёмов.",
    aiSummary: "Payment provider, крипто-решения для арбитража, гибкие условия для high volume",
    followUpSent: false,
  },
  {
    id: "c3",
    user: {
      id: "u4",
      name: "Дмитрий Волков",
      role: "Team Lead",
      company: "AdTech Solutions",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
      tags: ["AI", "Optimization", "Facebook Ads"],
      links: [],
    },
    metAt: "2026-05-12T14:20:00Z",
    event: "МАС 2026",
    note: "Разработали AI-инструмент для оптимизации креативов. Хочет протестировать на моих кампаниях.",
    followUpSent: false,
  },
  {
    id: "c4",
    user: {
      id: "u5",
      name: "Анна Кузнецова",
      username: "annakuznetsova",
      role: "Compliance Officer",
      company: "Legal Shield",
      photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
      tags: ["Legal", "Compliance", "iGaming"],
      links: [{ type: "telegram", url: "https://t.me/annakuznetsova" }],
    },
    metAt: "2026-05-11T11:00:00Z",
    event: "МАС 2026",
    note: "Консультирует по легальности офферов в разных GEO. Может помочь с проверкой перед запуском.",
    lastContact: "2026-05-12",
    followUpSent: true,
    followUpSentAt: "2026-05-11T18:00:00Z",
  },
];
