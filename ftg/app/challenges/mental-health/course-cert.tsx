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

export default function CourseCertScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0;

  const ensureCameraPermission = async () => {
    const { status } =
      await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Camera access is required to take a photo."
      );
      return false;
    }
    return true;
  };

  const ensureLibraryPermission = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Photo library access is required to upload a photo."
      );
      return false;
    }
    return true;
  };

  const pickFromCamera = async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    const ok = await ensureLibraryPermission();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSubmitting(false);
      Alert.alert("Error", "You must be logged in to submit.");
      return;
    }

    const { error } = await supabase
      .from("challenge_activity")
      .insert({
        user_id: user.id,
        challenge_id: "f14f4802-7c5e-4ab5-bc1f-5ed3e5aca0f8",
        status: "pending",
        occurred_at: new Date().toISOString(),
        media_url: photoUri,
        metadata: {
          title: title.trim(),
          description: description.trim(),
        },
      });

    setSubmitting(false);

    if (error) {
      Alert.alert(
        "Submission failed",
        "Please try again."
      );
      return;
    }

    Alert.alert(
      "Submitted",
      "Your course or certification has been sent for review.",
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
            <Text style={styles.icon}>🎓</Text>
            <Text style={styles.title}>
              Online Courses & Certifications
            </Text>
            <Text style={styles.subtitle}>
              <Text style={styles.subtitleBold}>
                +1500 Points{"\n"}
              </Text>
              Submit an online course or professional certification you’ve
              completed that helps you grow in your role.  Requiest admin 
              approval for points.
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <TextInput
              style={styles.input}
              placeholder="Course or certification name"
              placeholderTextColor={Colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={styles.textArea}
              placeholder="Briefly describe what the course covered and how it applies to your work"
              placeholderTextColor={Colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View style={styles.photoSection}>
            <Text style={styles.photoLabel}>
              Proof (mandatory for points award)
            </Text>

            <View style={styles.photoButtons}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={pickFromCamera}
              >
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoButton}
                onPress={pickFromLibrary}
              >
                <Text style={styles.photoIcon}>🖼️</Text>
                <Text style={styles.photoText}>Upload Photo</Text>
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
            disabled={!canSubmit || submitting}
            onPress={submit}
          >
            <Text style={styles.submitText}>
              Submit for Review
            </Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

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
  scrollContent: { paddingBottom: 40 },
  headerText: { alignItems: "center", marginBottom: 20 },
  icon: { fontSize: 28, marginBottom: 6 },
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
    lineHeight: 20,
  },
  subtitleBold: { fontWeight: "700", color: Colors.textPrimary },
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
  photoSection: { marginBottom: 20 },
  photoLabel: { color: Colors.textSecondary, marginBottom: 8 },
  photoButtons: { flexDirection: "row", gap: 12 },
  photoButton: {
    flex: 1,
    backgroundColor: Colors.cards.goals,
    borderRadius: Radius.card,
    paddingVertical: 14,
    alignItems: "center",
  },
  photoIcon: { fontSize: 20, marginBottom: 4 },
  photoText: { color: Colors.textPrimary, fontWeight: "700" },
  photoSelected: { marginTop: 8, color: Colors.textSecondary, fontSize: 12 },
  submitButton: {
    backgroundColor: Colors.cards.complete,
    paddingVertical: 14,
    borderRadius: Radius.card,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: Colors.textPrimary, fontWeight: "700", fontSize: 16 },
  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
  },
  bottomButtonRow: { flexDirection: "row", gap: 16 },
  backButton: {
    ...Components.backButton,
    flexDirection: "row",
    alignItems: "center",
  },
  backIcon: { fontSize: 18, marginRight: 8 },
  backText: { color: Colors.textPrimary, fontSize: 16, fontWeight: "700" },
});
