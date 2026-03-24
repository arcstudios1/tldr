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
import { CATEGORIES } from "../../constants/sources";
import { Colors, FontWeights, FontSizes, Spacing } from "../../constants/theme";

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = mode === "edit";

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession(),
  });

  const userId = sessionData?.data.session?.user.id ?? null;
  const email = sessionData?.data.session?.user.email ?? "";
  const username = sessionData?.data.session?.user.user_metadata?.username ?? "";

  const [selected, setSelected] = useState<Set<Category>>(new Set());
  const [saving, setSaving] = useState(false);

  // Pre-fill with existing preferences when editing
  useEffect(() => {
    if (!userId || !isEditMode) return;
    api.getPreferences(userId).then((prefs) => {
      if (prefs.categories.length > 0) {
        setSelected(new Set(prefs.categories));
      }
    });
  }, [userId, isEditMode]);

  function toggle(id: Category) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleContinue() {
    if (isEditMode) {
      try {
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

        const currentPrefs = await api.getPreferences(uid);
        await api.savePreferences(
          uid, userEmail, userUsername,
          Array.from(selected),
          currentPrefs.excludedSources
        );
        router.back();
      } catch (err) {
        console.error("[Categories] Save error:", err);
        Alert.alert("Error", "Failed to save preferences. Please try again.");
      }
    } else {
      // Onboarding: save directly, no sources step
      setSaving(true);
      try {
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

        const effectiveUsername = userUsername || userEmail.split("@")[0] || "user";
        await api.savePreferences(uid, userEmail, effectiveUsername, Array.from(selected), []);
        await supabase.auth.updateUser({ data: { onboardingComplete: true } });
        router.replace("/(tabs)/");
      } catch (err) {
        console.error("[Categories] Save error:", err);
        Alert.alert("Error", "Failed to save preferences. Please try again.");
      } finally {
        setSaving(false);
      }
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.inner, { paddingTop: insets.top + Spacing.lg }]}
    >
      <Text style={styles.logo}>tl;dr</Text>
      <Text style={styles.heading}>
        {isEditMode ? "Your topics" : "What interests you?"}
      </Text>
      <Text style={styles.subtext}>
        {isEditMode
          ? "Update the topics you want to see in your feed."
          : "Choose the topics that matter to you. You can always change these later."}
      </Text>

      <View style={styles.grid}>
        {CATEGORIES.map((cat) => {
          const active = selected.has(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.tile,
                active && { borderColor: cat.color, backgroundColor: `${cat.color}18` },
              ]}
              onPress={() => toggle(cat.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={cat.icon as any}
                size={28}
                color={active ? cat.color : Colors.textMuted}
              />
              <Text style={[styles.tileLabel, active && { color: cat.color }]}>
                {cat.label}
              </Text>
              {active && (
                <View style={[styles.checkmark, { backgroundColor: cat.color }]}>
                  <Ionicons name="checkmark" size={10} color={Colors.background} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.button, (selected.size === 0 || saving) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={selected.size === 0 || saving}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {saving ? "Setting up your feed…" : isEditMode ? "Save" : "Continue"}
        </Text>
        {!isEditMode && !saving && <Ionicons name="arrow-forward" size={16} color={Colors.background} />}
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
    marginBottom: Spacing.xl * 1.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xl * 1.5,
  },
  tile: {
    width: "47%",
    aspectRatio: 1.4,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    position: "relative",
  },
  tileLabel: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textMuted,
  },
  checkmark: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  button: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
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
