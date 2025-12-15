import { AppHeader } from "@/components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function VolunteerWorkScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !!photoUri;

  const pickFromCamera = async () => {
    const { status } =
      await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result =
      await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
      });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitting(false);
      Alert.alert("Error", "Not authenticated.");
      return;
    }

    // get real challenge id
    const { data: challenge, error: challengeError } =
      await supabase
        .from("challenges")
        .select("id")
        .eq("name", "Volunteer Work")
        .single();

    if (challengeError || !challenge) {
      setSubmitting(false);
      Alert.alert("Error", "Volunteer challenge not found.");
      return;
    }

    const { error } = await supabase
      .from("challenge_activity")
      .insert({
        user_id: user.id,
        challenge_id: challenge.id,
        occurred_at: new Date().toISOString(),
        status: "pending",
        media_url: photoUri,
        metadata: {
          title: title.trim(),
          description: description.trim(),
        },
      });

    setSubmitting(false);

    if (error) {
      Alert.alert("Submission failed", error.message);
      return;
    }

    Alert.alert(
      "Submitted",
      "Your volunteer work has been sent for review.",
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerText}>
            <Text style={styles.icon}>🤝</Text>
            <Text style={styles.title}>Volunteer Work</Text>
            <Text style={styles.subtitle}>
              <Text style={styles.subtitleBold}>
                500 Points | Once Per Month{"\n"}
              </Text>
              Log volunteer work completed with a nonprofit,
              community organization, or service initiative.
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Organization or activity name"
            placeholderTextColor={Colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.textArea}
            placeholder="Describe the volunteer work you completed"
            placeholderTextColor={Colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <View style={styles.photoSection}>
            <View style={styles.photoButtons}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={pickFromCamera}
              >
                <Text>📷 Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoButton}
                onPress={pickFromLibrary}
              >
                <Text>🖼️ Upload Photo</Text>
              </TouchableOpacity>
            </View>

            {photoUri && (
              <Text style={styles.photoSelected}>
                Photo attached
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!canSubmit || submitting) &&
                styles.submitDisabled,
            ]}
            onPress={submit}
            disabled={!canSubmit || submitting}
          >
            <Text style={styles.submitText}>
              {submitting ? "Submitting…" : "Submit for Review"}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.back()}
        >
          <Text>⬅️ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.push("/main")}
        >
          <Text>🏠 Home</Text>
        </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 40,
  },
  headerText: {
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    fontSize: 28,
    marginBottom: 6,
  },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
  subtitleBold: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.cards.journal,
    color: Colors.textPrimary,
    padding: 12,
    borderRadius: Radius.card,
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: Colors.cards.journal,
    color: Colors.textPrimary,
    padding: 12,
    borderRadius: Radius.card,
    minHeight: 90,
    marginBottom: 16,
  },
  photoSection: {
    marginBottom: 20,
  },
  photoButtons: {
    flexDirection: "row",
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: Colors.cards.goals,
    padding: 14,
    borderRadius: Radius.card,
    alignItems: "center",
  },
  photoSelected: {
    marginTop: 8,
    color: Colors.textSecondary,
  },
  submitButton: {
    backgroundColor: Colors.cards.complete,
    paddingVertical: 14,
    borderRadius: Radius.card,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: Colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
});
