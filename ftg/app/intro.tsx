import { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Image, Animated } from "react-native";
import { useRouter } from "expo-router";
import { Video, ResizeMode } from "expo-av";

export default function IntroScreen() {
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  const [showLogo, setShowLogo] = useState(false);
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Safety fallback in case video events don't fire
    const fallback = setTimeout(() => {
      startLogoFade();
    }, 5200);

    return () => clearTimeout(fallback);
  }, []);

  const startLogoFade = () => {
    if (showLogo) return;

    setShowLogo(true);

    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        router.replace("/main");
      }, 1500);
    });
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={require("../assets/videos/ftg-intro.mp4")}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={(status) => {
          // When video finishes, fade in logo
          if ((status as any)?.didJustFinish) startLogoFade();
        }}
      />

      {showLogo && (
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity }]}>
          <Image
            source={require("../assets/images/FTG1.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logoWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(244, 239, 229, 0.85)", // cream tint overlay
  },
  logo: {
    width: 260,
    height: 260,
  },
});
