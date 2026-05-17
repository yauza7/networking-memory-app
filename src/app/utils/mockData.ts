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

export interface SharedFrom {
  fromUsername: string;
  fromName: string;
  sharedTags: string[];
  sharedNote: string;
  sharedAt: string;
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
  sharedFrom?: SharedFrom[];
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

export const mockContacts: Connection[] = [];
