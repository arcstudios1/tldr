import { forwardRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Article, Comment } from "../lib/api";
import { Colors, FontWeights, FontSizes, Spacing } from "../constants/theme";

interface Props {
  article: Article | null;
  userId: string | null;
  email: string | null;
  username: string | null;
}

export const CommentsSheet = forwardRef<BottomSheet, Props>(
  ({ article, userId, email, username }, ref) => {
    const [text, setText] = useState("");
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
      queryKey: ["comments", article?.id],
      queryFn: () => api.getComments(article!.id),
      enabled: !!article,
    });

    const postMutation = useMutation({
      mutationFn: (body: string) => api.postComment(article!.id, userId!, email!, username!, body),
      onSuccess: () => {
        setText("");
        queryClient.invalidateQueries({ queryKey: ["comments", article?.id] });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
      },
    });

    const renderBackdrop = useCallback(
      (props: unknown) => (
        <BottomSheetBackdrop
          {...(props as object)}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.6}
        />
      ),
      []
    );

    function handlePost() {
      if (!text.trim() || !userId) return;
      postMutation.mutate(text.trim());
    }

    function renderComment({ item }: { item: Comment }) {
      return (
        <View style={styles.comment}>
          <Text style={styles.commentUsername}>@{item.user.username}</Text>
          <Text style={styles.commentBody}>{item.body}</Text>
          <Text style={styles.commentTime}>{formatTimeAgo(new Date(item.createdAt))}</Text>
        </View>
      );
    }

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={["60%", "90%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={styles.container}>
          <Text style={styles.header}>
            Comments {data ? `(${data.items.length})` : ""}
          </Text>

          {isLoading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
          ) : (
            <FlatList
              data={data?.items ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No comments yet. Be the first.</Text>
              }
            />
          )}

          {userId && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={16}
            >
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Add a comment..."
                  placeholderTextColor={Colors.textMuted}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.postButton, (!text.trim() || postMutation.isPending) && styles.postButtonDisabled]}
                  onPress={handlePost}
                  disabled={!text.trim() || postMutation.isPending}
                  activeOpacity={0.7}
                >
                  {postMutation.isPending ? (
                    <ActivityIndicator color={Colors.background} size="small" />
                  ) : (
                    <Text style={styles.postButtonText}>Post</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

CommentsSheet.displayName = "CommentsSheet";

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.surface,
  },
  handle: {
    backgroundColor: Colors.border,
  },
  container: {
    flex: 1,
  },
  header: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    flexGrow: 1,
  },
  comment: {
    gap: 4,
  },
  commentUsername: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  commentBody: {
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    lineHeight: FontSizes.base * 1.5,
  },
  commentTime: {
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  emptyText: {
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.base,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  postButton: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  postButtonText: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.background,
  },
});
