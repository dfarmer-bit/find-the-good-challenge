// app/challenges/mission/MissionContext.tsx

import { createContext, useContext, useState } from "react";

type MissionAnswers = {
  step1_values?: string[];
  step2_anchor?: string;
  step3_posture?: string;
  step4_impact?: string;
  step5_audience?: string[];
  step6_domain?: string;
  step7_direction?: string;
  step8_barrier?: string;
  step9_feeling?: string;
  step10_commitment?: string;
};

type MissionContextType = {
  answers: MissionAnswers;
  setAnswer: <K extends keyof MissionAnswers>(
    key: K,
    value: MissionAnswers[K]
  ) => void;
  loadAnswers: (answers: MissionAnswers) => void;
  reset: () => void;
};

const MissionContext = createContext<MissionContextType | null>(null);

export function MissionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [answers, setAnswers] = useState<MissionAnswers>({});

  const setAnswer = <K extends keyof MissionAnswers>(
    key: K,
    value: MissionAnswers[K]
  ) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const loadAnswers = (loaded: MissionAnswers) => {
    setAnswers(loaded ?? {});
  };

  const reset = () => setAnswers({});

  return (
    <MissionContext.Provider
      value={{ answers, setAnswer, loadAnswers, reset }}
    >
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) {
    throw new Error("useMission must be used inside MissionProvider");
  }
  return ctx;
}

/* Required so Expo Router does not treat this as a route */
export default function MissionContextRoute() {
  return null;
}
