import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Article, api } from "../lib/api";
import { VoteButtons } from "./VoteButtons";
import { Colors, FontWeights, FontSizes, Spacing } from "../constants/theme";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: Colors.accent,
  FINANCE: "#34D399",
  POLITICS: "#F87171",
  CULTURE: "#C084FC",
};

interface Props {
  article: Article;
  userId: string | null;
  email: string | null;
  username: string | null;
  userVote: 1 | -1 | 0;
  isBookmarked?: boolean;
  onCommentPress: (article: Article) => void;
  height: number;
}

export function NewsCard({ article, userId, email, username, userVote, isBookmarked = false, onCommentPress, height }: Props) {
  const queryClient = useQueryClient();
  const [localVote, setLocalVote] = useState<1 | -1 | 0>(userVote);
  const [localBookmark, setLocalBookmark] = useState(isBookmarked);

  const voteMutation = useMutation({
    mutationFn: (value: 1 | -1 | 0) =>
      api.vote(article.id, userId!, email!, username!, value),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });

  const bookmarkMutation = useMutation({
    mutationFn: (shouldBookmark: boolean) =>
      shouldBookmark
        ? api.addBookmark(article.id, userId!, email!, username!)
        : api.removeBookmark(article.id, userId!),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  async function openSource() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await WebBrowser.openBrowserAsync(article.sourceUrl, {
      toolbarColor: "#000000",
      controlsColor: Colors.accent,
    });
  }

  async function handleShare() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({
      title: article.title,
      message: `${article.title}\n\n${article.sourceUrl}`,
      url: article.sourceUrl,
    });
  }

  function handleVote(value: 1 | -1 | 0) {
    if (!userId) return;
    setLocalVote(value);
    voteMutation.mutate(value);
  }

  function handleBookmark() {
    if (!userId) return;
    const next = !localBookmark;
    setLocalBookmark(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bookmarkMutation.mutate(next);
  }

  const categoryColor = CATEGORY_COLORS[article.category] ?? Colors.accent;
  const timeAgo = formatTimeAgo(new Date(article.publishedAt));
  const hasImage = !!article.imageUrl;
  const imageHeight = Math.round(height * 0.30);

  return (
    <View style={[styles.container, { height }]}>
      {/* Meta row */}
      <View style={styles.meta}>
        <View style={[styles.categoryBadge, { borderColor: categoryColor }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {article.category}
          </Text>
        </View>
        <Text style={styles.sourceName}>{article.sourceName}</Text>
        <Text style={styles.timeAgo}>{timeAgo}</Text>
      </View>

      {/* Content */}
      <View style={[styles.content, !hasImage && styles.contentCentered]}>
        {hasImage && (
          <Image
            source={{ uri: article.imageUrl! }}
            style={[styles.featuredImage, { height: imageHeight }]}
            resizeMode="cover"
          />
        )}

        <Text style={styles.title}>{article.title}</Text>

        {/* tl;dr callout block */}
        <View style={styles.summaryBlock}>
          <View style={styles.summaryAccentBar} />
          <View style={styles.summaryInner}>
            <Text style={styles.summaryLabel}>tl;dr</Text>
            {article.summary.split("\n").filter(Boolean).map((point, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>●</Text>
                <Text style={styles.summary}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.readMoreButton}
          onPress={openSource}
          activeOpacity={0.7}
        >
          <Text style={styles.readMoreText}>Read full story →</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <VoteButtons
          upvotes={article.upvotes}
          downvotes={article.downvotes}
          userVote={localVote}
          onVote={handleVote}
        />

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, localBookmark && styles.iconButtonActive]}
            onPress={handleBookmark}
            activeOpacity={0.7}
          >
            <Ionicons
              name={localBookmark ? "bookmark" : "bookmark-outline"}
              size={16}
              color={localBookmark ? Colors.accent : Colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.commentsButton}
            onPress={() => onCommentPress(article)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.commentsCount}>{article.commentCount}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: "column",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  categoryBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryText: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.xs,
    letterSpacing: 0.5,
  },
  sourceName: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  timeAgo: {
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    justifyContent: "flex-start",
    gap: Spacing.md,
  },
  contentCentered: {
    justifyContent: "center",
  },
  featuredImage: {
    width: "100%",
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  title: {
    fontFamily: FontWeights.bold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    lineHeight: FontSizes.xl * 1.25,
  },
  summaryBlock: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  summaryAccentBar: {
    width: 2,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  summaryInner: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontFamily: FontWeights.mono,
    fontSize: FontSizes.xs,
    color: Colors.accent,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
  },
  bulletDot: {
    fontSize: 6,
    color: Colors.accent,
    marginTop: 6,
  },
  summary: {
    flex: 1,
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    lineHeight: FontSizes.sm * 1.65,
  },
  readMoreButton: {
    paddingVertical: 4,
  },
  readMoreText: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(96, 165, 250, 0.1)",
  },
  commentsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 34,
  },
  commentsCount: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
});
