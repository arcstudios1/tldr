"use client";

import { Category } from "@/lib/api";

export type TabValue = Category | "SAVED" | null;

const TABS: { label: string; value: TabValue }[] = [
  { label: "All", value: null },
  { label: "Saved", value: "SAVED" },
  { label: "Tech", value: "TECH" },
  { label: "Finance", value: "FINANCE" },
  { label: "Politics", value: "POLITICS" },
  { label: "Culture", value: "CULTURE" },
  { label: "Sports", value: "SPORTS" },
];

interface Props {
  selected: TabValue;
  onSelect: (tab: TabValue) => void;
}

export function CategoryBar({ selected, onSelect }: Props) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
      style={{ borderBottom: "1px solid var(--border)", scrollbarWidth: "none" }}
    >
      {TABS.map((tab) => {
        const isActive = selected === tab.value;
        return (
          <button
            key={tab.label}
            onClick={() => onSelect(tab.value)}
            className="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              backgroundColor: isActive ? "var(--accent-dim)" : "transparent",
              border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
              color: isActive ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
