import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { Colors, FontWeights, FontSizes, Spacing } from "../constants/theme";

const AD_CONTENT = {
  sponsor: "tl;dr for Business",
  headline: "Reach Readers Who Actually Pay Attention",
  bullets: [
    "tl;dr serves daily news to thousands of professionals in tech, finance, politics, and culture.",
    "Native ad placements look and feel like the content your audience already trusts.",
    "No banner blindness. No noise. Just your message in the right context.",
  ],
  cta: "Advertise on tl;dr →",
  url: "mailto:ads@tldr.news",
};

export function AdCard({ height }: { height: number }) {
  const imageHeight = Math.round(height * 0.30);

  async function handleCta() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await WebBrowser.openBrowserAsync(AD_CONTENT.url, {
      toolbarColor: "#000000",
      controlsColor: Colors.accent,
    });
  }

  return (
    <View style={[styles.container, { height }]}>
      {/* Meta row — mirrors NewsCard */}
      <View style={styles.meta}>
        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredText}>SPONSORED</Text>
        </View>
        <Text style={styles.sponsorName}>{AD_CONTENT.sponsor}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Image placeholder — branded dark block */}
        <View style={[styles.imagePlaceholder, { height: imageHeight }]}>
          <Text style={styles.placeholderLogo}>tl;dr</Text>
          <Text style={styles.placeholderTagline}>for Business</Text>
        </View>

        <Text style={styles.title}>{AD_CONTENT.headline}</Text>

        {/* tl;dr callout block */}
        <View style={styles.summaryBlock}>
          <View style={styles.summaryAccentBar} />
          <View style={styles.summaryInner}>
            <Text style={styles.summaryLabel}>tl;dr</Text>
            {AD_CONTENT.bullets.map((point, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>●</Text>
                <Text style={styles.summary}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.ctaButton} onPress={handleCta} activeOpacity={0.7}>
          <Text style={styles.ctaText}>{AD_CONTENT.cta}</Text>
        </TouchableOpacity>
      </View>

      {/* Actions row — matches NewsCard structure */}
      <View style={styles.actions}>
        <Text style={styles.disclaimer}>Sponsored content</Text>
      </View>
    </View>
  );
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
  sponsoredBadge: {
    borderWidth: 1,
    borderRadius: 4,
    borderColor: Colors.textMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sponsoredText: {
    fontFamily: FontWeights.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  sponsorName: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    justifyContent: "flex-start",
    gap: Spacing.md,
  },
  imagePlaceholder: {
    width: "100%",
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  placeholderLogo: {
    fontFamily: FontWeights.mono,
    fontSize: 28,
    color: Colors.accent,
  },
  placeholderTagline: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
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
    backgroundColor: Colors.textMuted,
  },
  summaryInner: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontFamily: FontWeights.mono,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
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
    color: Colors.textMuted,
    marginTop: 6,
  },
  summary: {
    flex: 1,
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: FontSizes.sm * 1.65,
  },
  ctaButton: {
    paddingVertical: 4,
  },
  ctaText: {
    fontFamily: FontWeights.medium,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  disclaimer: {
    fontFamily: FontWeights.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
});
