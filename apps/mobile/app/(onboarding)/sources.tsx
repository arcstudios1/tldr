import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { api, Category } from "../../lib/api";
import { SOURCES, CATEGORIES } from "../../constants/sources";
import { Colors, FontWeights, FontSizes, Spacing } from "../../constants/theme";

export default function SourcesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { categories: categoriesParam, mode } = useLocalSearchParams<{
    categories?: string;
    mode?: string;
  }>();
  const isEditMode = mode === "edit";

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession(),
  });

  const userId = sessionData?.data.session?.user.id ?? null;
  const email = sessionData?.data.session?.user.email ?? "";
  const username = sessionData?.data.session?.user.user_metadata?.username ?? "";

  // Sources excluded by the user (empty = all included)
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    api.getPreferences(userId).then((prefs) => {
      setExcluded(new Set(prefs.excludedSources));
      if (isEditMode && prefs.categories.length > 0) {
        setSelectedCategories(prefs.categories);
      }
    });
  }, [userId, isEditMode]);

  useEffect(() => {
    if (!isEditMode && categoriesParam) {
      setSelectedCategories(categoriesParam.split(",") as Category[]);
    }
  }, [categoriesParam, isEditMode]);

  function toggleSource(name: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Get a fresh session in case the cached query hasn't resolved yet
      let uid = userId;
      let userEmail = email;
      let userUsername = username;

      if (!uid || !userEmail) {
        const { data } = await supabase.auth.getSession();
        uid = data.session?.user.id ?? null;
        userEmail = data.session?.user.email ?? "";
        userUsername = data.session?.user.user_metadata?.username ?? "";
      }

      if (!uid || !userEmail) {
        Alert.alert("Session expired", "Please sign in again.");
        return;
      }

      await api.savePreferences(
        uid, userEmail, userUsername,
        selectedCategories,
        Array.from(excluded)
      );

      if (!isEditMode) {
        await supabase.auth.updateUser({ data: { onboardingComplete: true } });
        router.replace("/(tabs)/");
      } else {
        router.back();
      }
    } catch (err) {
      console.error("[Sources] Save error:", err);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Group sources by category, only show categories the user selected
  const visibleCategories = isEditMode
    ? CATEGORIES
    : CATEGORIES.filter((c) =>
        selectedCategories.length === 0 || selectedCategories.includes(c.id)
      );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.inner, { paddingTop: insets.top + Spacing.lg }]}
    >
      {!isEditMode && (
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}

      <Text style={styles.logo}>tl;dr</Text>
      <Text style={styles.heading}>
        {isEditMode ? "Your sources" : "Customize your sources"}
      </Text>
      <Text style={styles.subtext}>
        All sources are included by default. Tap any source to exclude it from your feed.
      </Text>

      {visibleCategories.map((cat) => {
        const catSources = SOURCES.filter((s) => s.category === cat.id);
        return (
          <View key={cat.id} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: cat.color }]}>{cat.label}</Text>
            {catSources.map((source) => {
              const isExcluded = excluded.has(source.name);
              return (
                <TouchableOpacity
                  key={source.name}
                  style={[styles.sourceRow, isExcluded && styles.sourceRowExcluded]}
                  onPress={() => toggleSource(source.name)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sourceName, isExcluded && styles.sourceNameExcluded]}>
                    {source.name}
                  </Text>
                  <View style={[styles.toggle, !isExcluded && { backgroundColor: cat.color }]}>
                    {!isExcluded ? (
                      <Ionicons name="checkmark" size={12} color={Colors.background} />
                    ) : (
                      <Ionicons name="close" size={12} color={Colors.textMuted} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {saving ? "Saving…" : isEditMode ? "Save" : "Done — take me to my feed"}
        </Text>
      </TouchableOpacity>

      {isEditMode && (
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
  },
  backButton: {
    marginBottom: Spacing.md,
  },
  logo: {
    fontFamily: FontWeights.mono,
    fontSize: 32,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  heading: {
    fontFamily: FontWeights.bold,
    fontSize: FontSizes["2xl"],
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtext: {
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: FontSizes.base * 1.5,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sourceRowExcluded: {
    opacity: 0.45,
  },
  sourceName: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  sourceNameExcluded: {
    textDecorationLine: "line-through",
    color: Colors.textMuted,
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.base,
    color: Colors.background,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelText: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
  },
});
