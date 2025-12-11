// theme.ts

import { Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width;

export const theme = {
  colors: {
    blue: "#70D6FF",
    pink: "#FF70A6",
    green: "#99F7AB",
    yellow: "#FFED66",
    purple: "#C9A7FF",
    navy: "#1C2541",
  },

  gradients: {
    blueToGreen: ["#70D6FF", "#99F7AB"], // banner uses this
    pinkToPurple: ["#FF70A6", "#C9A7FF"],
    yellowToOrange: ["#FFED66", "#FFB385"],
  },

  card: {
    width: screenWidth * 0.44,
    height: 110, // slightly smaller
    borderRadius: 20,
    padding: 12,
  },

  emoji: {
    size: 34, // reduced from 38
  },

  text: {
    titleSize: 15,
    labelSize: 13,
  },
};
