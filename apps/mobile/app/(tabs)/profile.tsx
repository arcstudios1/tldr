import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from "react-native";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../../lib/supabase";
import { api, Article, Category } from "../../lib/api";
import { CATEGORIES, SOURCES } from "../../constants/sources";
import { Colors, FontWeights, FontSizes, Spacing } from "../../constants/theme";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "#60A5FA",
  FINANCE: "#34D399",
  POLITICS: "#F87171",
  CULTURE: "#C084FC",
  SPORTS: "#FB923C",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession(),
  });

  const session = sessionData?.data.session;
  const userId = session?.user.id ?? null;
  const email = session?.user.email ?? "";
  const username = session?.user.user_metadata?.username ?? "";

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["preferences", userId],
    queryFn: () => api.getPreferences(userId!),
    enabled: !!userId,
  });

  const { data: bookmarks, isLoading: bookmarksLoading } = useQuery({
    queryKey: ["bookmarks", userId],
    queryFn: () => api.getBookmarks(userId!),
    enabled: !!userId,
  });

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          queryClient.clear();
          setSigningOut(false);
        },
      },
    ]);
  }

  const activeCategories: Category[] =
    prefs?.categories.length ? prefs.categories : CATEGORIES.map((c) => c.id);
  const excludedSources = prefs?.excludedSources ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Spacing.xl * 2 }}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.wordmark}>tl;dr</Text>
      </View>

      {/* Avatar + user info */}
      <View style={styles.userSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>
            {username ? username[0].toUpperCase() : "?"}
          </Text>
        </View>
        <Text style={styles.username}>@{username}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      {/* Saved Articles */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Saved</Text>
            {bookmarks && bookmarks.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{bookmarks.length}</Text>
              </View>
            )}
          </View>
        </View>
        {bookmarksLoading ? (
          <ActivityIndicator color={Colors.accent} size="small" />
        ) : !bookmarks || bookmarks.length === 0 ? (
          <Text style={styles.emptyText}>No saved articles yet.</Text>
        ) : (
          <View style={styles.bookmarkList}>
            {bookmarks.map((article: Article) => (
              <TouchableOpacity
                key={article.id}
                style={styles.bookmarkRow}
                onPress={() => WebBrowser.openBrowserAsync(article.sourceUrl, { toolbarColor: "#000000", controlsColor: Colors.accent })}
                activeOpacity={0.7}
              >
                {article.imageUrl && (
                  <Image source={{ uri: article.imageUrl }} style={styles.bookmarkThumb} />
                )}
                <View style={styles.bookmarkInfo}>
                  <Text style={styles.bookmarkTitle} numberOfLines={2}>{article.title}</Text>
                  <Text style={styles.bookmarkSource}>{article.sourceName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Topics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Topics</Text>
          <TouchableOpacity
            onPress={() => router.push("/(onboarding)/categories?mode=edit")}
            style={styles.editButton}
          >
            <Ionicons name="pencil-outline" size={14} color={Colors.accent} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        {prefsLoading ? (
          <ActivityIndicator color={Colors.accent} size="small" />
        ) : (
          <View style={styles.pillRow}>
            {activeCategories.map((cat) => {
              const color = CATEGORY_COLORS[cat] ?? Colors.accent;
              return (
                <View key={cat} style={[styles.pill, { borderColor: color, backgroundColor: `${color}18` }]}>
                  <Text style={[styles.pillText, { color }]}>{cat}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Sources */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sources</Text>
          <TouchableOpacity
            onPress={() => router.push("/(onboarding)/sources?mode=edit")}
            style={styles.editButton}
          >
            <Ionicons name="pencil-outline" size={14} color={Colors.accent} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        {prefsLoading ? (
          <ActivityIndicator color={Colors.accent} size="small" />
        ) : (
          <View style={styles.sourceList}>
            {SOURCES.map((source) => {
              const isExcluded = excludedSources.includes(source.name);
              const color = CATEGORY_COLORS[source.category] ?? Colors.accent;
              return (
                <View key={source.name} style={[styles.sourceRow, isExcluded && styles.sourceRowExcluded]}>
                  <View style={[styles.sourceDot, { backgroundColor: isExcluded ? Colors.textMuted : color }]} />
                  <Text style={[styles.sourceText, isExcluded && styles.sourceTextExcluded]}>
                    {source.name}
                  </Text>
                  {isExcluded && (
                    <Text style={styles.excludedBadge}>excluded</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Sign out */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          {signingOut ? (
            <ActivityIndicator color={Colors.textPrimary} size="small" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color={Colors.textPrimary} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  wordmark: {
    fontFamily: FontWeights.mono,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  userSection: {
    alignItems: "center",
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarInitial: {
    fontFamily: FontWeights.bold,
    fontSize: FontSizes["2xl"],
    color: Colors.accent,
  },
  username: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  countBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  countBadgeText: {
    fontFamily: FontWeights.bold,
    fontSize: FontSizes.xs,
    color: Colors.background,
  },
  emptyText: {
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  bookmarkList: { gap: Spacing.sm },
  bookmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  bookmarkThumb: {
    width: 52,
    height: 40,
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  bookmarkInfo: {
    flex: 1,
    gap: 2,
  },
  bookmarkTitle: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    lineHeight: FontSizes.sm * 1.4,
  },
  bookmarkSource: {
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editText: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.xs,
    letterSpacing: 0.5,
  },
  sourceList: { gap: Spacing.sm },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  sourceRowExcluded: { opacity: 0.5 },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  sourceText: {
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    flex: 1,
  },
  sourceTextExcluded: {
    textDecorationLine: "line-through",
    color: Colors.textMuted,
  },
  excludedBadge: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
  },
  buttonDisabled: { opacity: 0.5 },
  signOutText: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
});
