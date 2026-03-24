import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors, FontWeights, FontSizes, Spacing } from "../constants/theme";

interface Props {
  upvotes: number;
  downvotes: number;
  userVote: 1 | -1 | 0;
  onVote: (value: 1 | -1 | 0) => void;
}

export function VoteButtons({ upvotes, downvotes, userVote, onVote }: Props) {
  function handleVote(value: 1 | -1) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onVote(userVote === value ? 0 : value);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, userVote === 1 && styles.upActive]}
        onPress={() => handleVote(1)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-up"
          size={13}
          color={userVote === 1 ? Colors.background : Colors.textMuted}
        />
        <Text style={[styles.count, userVote === 1 && styles.upActiveText]}>
          {upvotes}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={[styles.button, userVote === -1 && styles.downActive]}
        onPress={() => handleVote(-1)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-down"
          size={13}
          color={userVote === -1 ? Colors.background : Colors.textMuted}
        />
        <Text style={[styles.count, userVote === -1 && styles.downActiveText]}>
          {downvotes}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  upActive: {
    backgroundColor: Colors.upvote,
  },
  downActive: {
    backgroundColor: Colors.downvote,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  count: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  upActiveText: {
    color: Colors.background,
    fontFamily: FontWeights.semiBold,
  },
  downActiveText: {
    color: Colors.background,
    fontFamily: FontWeights.semiBold,
  },
});
