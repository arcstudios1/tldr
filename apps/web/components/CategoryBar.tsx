"use client";

import React from "react";
import { Category, FeedSort } from "@/lib/api";

export type TabValue = Category | "SAVED" | null;

const CATEGORIES: { label: string; value: TabValue }[] = [
  { label: "All", value: null },
  { label: "Tech", value: "TECH" },
  { label: "Finance", value: "FINANCE" },
  { label: "Politics", value: "POLITICS" },
  { label: "Culture", value: "CULTURE" },
  { label: "Sports", value: "SPORTS" },
  { label: "Saved", value: "SAVED" },
];

const SORT_MODES: { label: string; value: FeedSort; icon: React.ReactNode }[] = [
  {
    label: "For You",
    value: "ranked",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: "Latest",
    value: "latest",
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

interface Props {
  selected: TabValue;
  onSelect: (tab: TabValue) => void;
  sort: FeedSort;
  onSortChange: (sort: FeedSort) => void;
}

export function CategoryBar({ selected, onSelect, sort, onSortChange }: Props) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
      style={{ borderBottom: "1px solid var(--border)", scrollbarWidth: "none" }}
    >
      {/* Sort mode toggle */}
      <div className="flex items-center shrink-0 mr-1" style={{ borderRight: "1px solid var(--border)", paddingRight: 8 }}>
        {SORT_MODES.map((mode) => {
          const isActive = sort === mode.value;
          return (
            <button
              key={mode.value}
              onClick={() => onSortChange(mode.value)}
              className="flex items-center gap-1 shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "var(--accent-dim)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
              }}
              title={mode.label}
            >
              {mode.icon}
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Category tabs */}
      {CATEGORIES.map((tab) => {
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
