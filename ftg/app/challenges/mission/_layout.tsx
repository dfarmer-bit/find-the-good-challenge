// app/challenges/mission/_layout.tsx

import { Slot } from "expo-router";
import { MissionProvider } from "./MissionContext";

export default function MissionLayout() {
  return (
    <MissionProvider>
      <Slot />
    </MissionProvider>
  );
}
