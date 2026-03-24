import { Category } from "../lib/api";

export const CATEGORIES: { id: Category; label: string; color: string; icon: string }[] = [
  { id: "TECH",     label: "Tech",     color: "#60A5FA", icon: "hardware-chip-outline" },
  { id: "FINANCE",  label: "Finance",  color: "#34D399", icon: "trending-up-outline"   },
  { id: "POLITICS", label: "Politics", color: "#F87171", icon: "megaphone-outline"      },
  { id: "CULTURE",  label: "Culture",  color: "#C084FC", icon: "musical-notes-outline"  },
];

export const SOURCES: { name: string; category: Category }[] = [
  { name: "TechCrunch",           category: "TECH"     },
  { name: "The Verge",            category: "TECH"     },
  { name: "Ars Technica",         category: "TECH"     },
  { name: "WSJ Markets",          category: "FINANCE"  },
  { name: "CNBC Finance",         category: "FINANCE"  },
  { name: "Reuters Business",     category: "FINANCE"  },
  { name: "Reuters Politics",     category: "POLITICS" },
  { name: "Politico",             category: "POLITICS" },
  { name: "AP Politics",          category: "POLITICS" },
  { name: "Variety",              category: "CULTURE"  },
  { name: "The Hollywood Reporter", category: "CULTURE"},
  { name: "Pitchfork",            category: "CULTURE"  },
];
