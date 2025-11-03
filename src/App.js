import React, { useEffect, useState } from "react";
import GlobalStyle from "./styles/GlobalStyle";
import SetupScreen from "./components/SetupScreen";
import QuizScreen from "./components/QuizScreen";
import SlidesScreen from "./components/SlidesScreen";

function App() {
  // Bump this string whenever you want everyone to re-see slides on a fresh open
  const APP_VERSION = "slides-v2";

  const makeDefaultState = () => ({
    teams: [],
    aliveTeams: [],
    started: false,
    currentQuestion: 0,
    scores: {},
    turn: 0,
    round: "main", // legacy
    timer: {
      running: false,
      timeLeft: 30,
      paused: false,
      passMode: false,
      startedAt: null,
    },
    winnerTeams: [],
    // slidesSeen controls whether SlidesScreen is shown first
    slidesSeen: false,
    // rounds mode fields
    rounds: null,
    currentRoundIndex: 0,
    timerSettings: {
      perRound: [30, 30, 30, 30, 30],
      passOn: 15,
    },
    _appVersion: APP_VERSION,
  });

  const [quizState, setQuizState] = useState(() => {
    const saved = localStorage.getItem("quizState");
    if (!saved) return makeDefaultState();

    try {
      const parsed = JSON.parse(saved);
      // If version changes (e.g., after a deploy), show slides first again
      if (parsed._appVersion !== APP_VERSION) {
        return {
          ...makeDefaultState(),
          ...parsed,
          slidesSeen: false,
          _appVersion: APP_VERSION,
        };
      }
      // Normal path: keep persisted state
      return { ...parsed, _appVersion: APP_VERSION };
    } catch {
      return makeDefaultState();
    }
  });

  useEffect(() => {
    // Ensure version is always stored
    const stateToSave = { ...quizState, _appVersion: APP_VERSION };
    localStorage.setItem("quizState", JSON.stringify(stateToSave));
  }, [quizState, APP_VERSION]);

  // Show slides first (if not seen) then Setup -> Quiz
  if (!quizState.slidesSeen && !quizState.started) {
    return (
      <>
        <GlobalStyle />
        <SlidesScreen quizState={quizState} setQuizState={setQuizState} />
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      {quizState.started ? (
        <QuizScreen quizState={quizState} setQuizState={setQuizState} />
      ) : (
        <SetupScreen quizState={quizState} setQuizState={setQuizState} />
      )}
    </>
  );
}

export default App;