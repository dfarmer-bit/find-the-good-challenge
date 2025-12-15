import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { AppHeader } from "../../components/AppHeader";
import {
    Colors,
    Components,
    Layout,
    Radius,
    Spacing,
} from "../../constants/theme";
import { supabase } from "../../lib/supabase";

const CHALLENGE_ID = "8610c34f-d0cd-464d-a65c-28898c8504b4";

const BASE_URL =
  "https://mcltdvfugzapqgqdlgoy.supabase.co/storage/v1/object/public/mindfulness-audio/";

const TRACKS = [
  "mindfulness_01.mp3",
  "mindfulness_02.mp3",
  "mindfulness_03.mp3",
  "mindfulness_04.mp3",
  "mindfulness_05.mp3",
  "mindfulness_06.mp3",
];

export default function MindfulnessScreen() {
  const router = useRouter();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  function getRandomTrack() {
    return TRACKS[Math.floor(Math.random() * TRACKS.length)];
  }

  function startAnimations() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }

  async function startSession() {
    try {
      setCompleted(false);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const selected = getRandomTrack();
      setTrackId(selected);

      const uri = encodeURI(`${BASE_URL}${selected}`);

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;

          if (status.durationMillis && status.positionMillis) {
            setRemainingMs(
              status.durationMillis - status.positionMillis
            );
          }

          if (status.didJustFinish) {
            setCompleted(true);
            setIsPlaying(false);
          }
        }
      );

      setSound(sound);
      setIsPlaying(true);
      startAnimations();
    } catch {
      Alert.alert("Audio Error", "Unable to play meditation.");
    }
  }

  async function submitMood(mood: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    await supabase.from("challenge_activity").insert({
      user_id: user.id,
      challenge_id: CHALLENGE_ID,
      occurred_at: new Date().toISOString(),
      occurred_date: today,
      status: "approved",
      metadata: { mood, track_id: trackId },
    });

    router.replace("/main");
  }

  function formatTime(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Mindfulness & Meditation</Text>
        <Text style={styles.subtitle}>
          Earn 20 points per session (up to 3× weekly). Stay until the end, then
          choose how you feel to receive points.
        </Text>
      </View>

      <View style={styles.content}>
        {!isPlaying && !completed && (
          <>
            <TouchableOpacity
              style={styles.startButton}
              onPress={startSession}
            >
              <Text style={styles.startText}>Start Session</Text>
            </TouchableOpacity>

            <View style={styles.tipsCard}>
              <Text style={styles.tipsHeader}>
                Quick 3-Minute Meditation Tips
              </Text>

              <View style={styles.tipBlock}>
                <Text style={styles.tipTitle}>Get comfortable</Text>
                <Text style={styles.tipSubtitle}>
                  Sit or stand where you are — no perfect posture needed.
                </Text>
              </View>

              <View style={styles.tipBlock}>
                <Text style={styles.tipTitle}>Breathe naturally</Text>
                <Text style={styles.tipSubtitle}>
                  Slow, easy breaths. Just notice them.
                </Text>
              </View>

              <View style={styles.tipBlock}>
                <Text style={styles.tipTitle}>Let thoughts pass</Text>
                <Text style={styles.tipSubtitle}>
                  When your mind wanders, gently come back.
                </Text>
              </View>

              <View style={styles.tipBlock}>
                <Text style={styles.tipTitle}>End with intention</Text>
                <Text style={styles.tipSubtitle}>
                  Choose one word for how you want to feel next.
                </Text>
              </View>
            </View>
          </>
        )}

        {isPlaying && (
          <>
            <Animated.Text
              style={[
                styles.meditationIcon,
                { transform: [{ translateY: floatY }] },
              ]}
            >
              🧘
            </Animated.Text>

            <Animated.Text
              style={[
                styles.musicIcon,
                { transform: [{ rotate }] },
              ]}
            >
              🎵
            </Animated.Text>

            {remainingMs !== null && (
              <Text style={styles.timerText}>
                ~ {formatTime(remainingMs)} remaining
              </Text>
            )}
          </>
        )}

        {completed && (
          <View style={styles.completedBox}>
            <Text style={styles.completedText}>
              Nice job. How do you feel?
            </Text>

            <View style={styles.moodRow}>
              <TouchableOpacity onPress={() => submitMood("calm")}>
                <Text style={styles.mood}>😌</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => submitMood("okay")}>
                <Text style={styles.mood}>🙂</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => submitMood("stressed")}>
                <Text style={styles.mood}>😕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>⬅️</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/main")}
          >
            <Text style={styles.backIcon}>🏠</Text>
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
    paddingHorizontal: Spacing.screenPadding,
  },

  headerText: {
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 440,
    lineHeight: 20,
  },

  content: {
    flex: 1,
    alignItems: "center",
  },

  startButton: {
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 20,
  },

  startText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  tipsCard: {
    backgroundColor: Colors.cards.journal,
    borderRadius: Radius.card,
    padding: 16,
    width: "100%",
    maxWidth: 420,
  },

  tipsHeader: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },

  tipBlock: {
    marginBottom: 10,
  },

  tipTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  tipSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  meditationIcon: {
    fontSize: 64,
    marginBottom: 12,
  },

  musicIcon: {
    fontSize: 32,
    marginBottom: 12,
  },

  timerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  completedBox: {
    marginTop: 32,
    alignItems: "center",
  },

  completedText: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 16,
  },

  moodRow: {
    flexDirection: "row",
    gap: 24,
  },

  mood: {
    fontSize: 36,
  },

  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
  },

  bottomButtonRow: {
    flexDirection: "row",
    gap: 16,
  },

  backButton: {
    ...Components.backButton,
    flexDirection: "row",
    alignItems: "center",
  },

  backIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  backText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
