import { useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { api, Article, Category } from "../../lib/api";
import { NewsCard } from "../../components/NewsCard";
import { AdCard } from "../../components/AdCard";
import { CategoryBar, TabValue } from "../../components/CategoryBar";
import { CommentsSheet } from "../../components/CommentsSheet";
import { Colors, FontWeights, FontSizes, Spacing } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

const AD_INTERVAL = 6;

type FeedItem = Article | { type: "ad"; id: string };

function injectAds(articles: Article[]): FeedItem[] {
  const result: FeedItem[] = [];
  articles.forEach((article, i) => {
    result.push(article);
    if ((i + 1) % AD_INTERVAL === 0) {
      result.push({ type: "ad", id: `ad-${i}` });
    }
  });
  return result;
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedTab, setSelectedTab] = useState<TabValue>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1 | 0>>({});
  const [feedHeight, setFeedHeight] = useState(
    Dimensions.get("window").height - tabBarHeight - 150
  );
  const bottomSheetRef = useRef<BottomSheet>(null);

  const isSavedView = selectedTab === "SAVED";
  const selectedCategory = isSavedView ? null : (selectedTab as Category | null);

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => supabase.auth.getSession(),
  });

  const userId = sessionData?.data.session?.user.id ?? null;
  const email = sessionData?.data.session?.user.email ?? null;
  const username = sessionData?.data.session?.user.user_metadata?.username ?? null;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["feed", selectedCategory, userId],
    queryFn: ({ pageParam }) =>
      api.getFeed({ category: selectedCategory ?? undefined, cursor: pageParam as string | undefined, userId: userId ?? undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !isSavedView,
  });

  const { data: bookmarksData, isLoading: bookmarksLoading } = useQuery({
    queryKey: ["bookmarks", userId],
    queryFn: () => api.getBookmarks(userId!),
    enabled: !!userId,
  });

  const bookmarkedIds = useMemo(
    () => new Set((bookmarksData ?? []).map((a) => a.id)),
    [bookmarksData]
  );

  const allArticles = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  const feedItems = useMemo(
    () => isSavedView ? (bookmarksData ?? []) as FeedItem[] : injectAds(allArticles),
    [isSavedView, bookmarksData, allArticles]
  );

  const handleCommentPress = useCallback((article: Article) => {
    setActiveArticle(article);
    bottomSheetRef.current?.expand();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      const card =
        "type" in item && item.type === "ad" ? (
          <AdCard height={feedHeight} />
        ) : (
          <NewsCard
            article={item as Article}
            userId={userId}
            email={email}
            username={username}
            userVote={userVotes[(item as Article).id] ?? 0}
            isBookmarked={bookmarkedIds.has((item as Article).id)}
            onCommentPress={handleCommentPress}
            height={feedHeight}
          />
        );
      return (
        <View style={{ height: feedHeight, overflow: "hidden" }}>
          {card}
        </View>
      );
    },
    [feedHeight, userId, email, username, userVotes, bookmarkedIds, handleCommentPress]
  );

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<FeedItem> | null | undefined, index: number) => ({
      length: feedHeight,
      offset: feedHeight * index,
      index,
    }),
    [feedHeight]
  );

  if ((isLoading && !isSavedView) || (bookmarksLoading && isSavedView)) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (isError && !isSavedView) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Failed to load feed.</Text>
        <Text style={styles.retryText} onPress={() => refetch()}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>tl;dr</Text>
      </View>

      <CategoryBar selected={selectedTab} onSelect={setSelectedTab} />

      {isSavedView && feedItems.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="bookmark-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No saved articles yet</Text>
          <Text style={styles.emptySubtitle}>Tap the bookmark icon on any article to save it here.</Text>
        </View>
      ) : (
        <FlatList
          data={feedItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          snapToInterval={feedHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          style={{ overflow: "hidden" }}
          onLayout={(e) => setFeedHeight(e.nativeEvent.layout.height - tabBarHeight)}
          onEndReached={() => !isSavedView && hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={
            !isSavedView ? (
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Colors.accent}
              />
            ) : undefined
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={Colors.accent} />
              </View>
            ) : null
          }
        />
      )}

      <CommentsSheet
        ref={bottomSheetRef}
        article={activeArticle}
        userId={userId}
        email={email}
        username={username}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  wordmark: {
    fontFamily: FontWeights.mono,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  errorText: {
    fontFamily: FontWeights.medium,
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  retryText: {
    fontFamily: FontWeights.medium,
    fontSize: 14,
    color: Colors.accent,
  },
  footer: {
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
    lineHeight: FontSizes.sm * 1.6,
  },
});
