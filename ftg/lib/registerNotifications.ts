// app/lib/registerNotifications.ts
// Registers device for push notifications
// Saves Expo push token to Supabase
// No notifications are sent here

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export async function registerForPushNotifications() {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Android channel (required)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  // Check permission
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return;
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const expoPushToken = tokenData.data;

  // Save token (upsert)
  await supabase.from("device_tokens").upsert(
    {
      user_id: user.id,
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}
