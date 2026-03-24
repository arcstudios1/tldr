import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Category } from "../lib/api";
import { Colors, FontWeights, FontSizes, Spacing } from "../constants/theme";

// null = All feed, "SAVED" = bookmarks view, Category = filtered feed
export type TabValue = Category | "SAVED" | null;

const TABS: { label: string; value: TabValue; icon?: string }[] = [
  { label: "All", value: null },
  { label: "Saved", value: "SAVED", icon: "bookmark" },
  { label: "Tech", value: "TECH" },
  { label: "Finance", value: "FINANCE" },
  { label: "Politics", value: "POLITICS" },
  { label: "Culture", value: "CULTURE" },
];

interface Props {
  selected: TabValue;
  onSelect: (tab: TabValue) => void;
}

export function CategoryBar({ selected, onSelect }: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {TABS.map((tab) => {
          const isActive = selected === tab.value;
          const isSaved = tab.value === "SAVED";
          return (
            <TouchableOpacity
              key={tab.label}
              style={[styles.pill, isActive && styles.pillActive, isSaved && styles.pillSaved, isActive && isSaved && styles.pillSavedActive]}
              onPress={() => onSelect(tab.value)}
              activeOpacity={0.7}
            >
              {tab.icon && (
                <Ionicons
                  name={isActive ? "bookmark" : "bookmark-outline"}
                  size={12}
                  color={isActive ? Colors.accent : Colors.textSecondary}
                />
              )}
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  container: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(96, 165, 250, 0.1)",
  },
  pillSaved: {},
  pillSavedActive: {
    borderColor: Colors.accent,
  },
  label: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.accent,
  },
});
