import React, { useEffect, useState } from "react";
import GlobalStyle from "./styles/GlobalStyle";
import SetupScreen from "./components/SetupScreen";
import QuizScreen from "./components/QuizScreen";

function App() {
  const [quizState, setQuizState] = useState(() => {
    const saved = localStorage.getItem("quizState");
    return saved
      ? JSON.parse(saved)
      : {
          teams: [],
          aliveTeams: [],
          started: false,
          currentQuestion: 0,
          scores: {},
          turn: 0,
          round: "main", // "main", "tiebreaker", "final", "finished"
          timer: {
            running: false,
            timeLeft: 30,
            paused: false,
            passMode: false,
          },
          winnerTeams: [],
        };
  });

  useEffect(() => {
    localStorage.setItem("quizState", JSON.stringify(quizState));
  }, [quizState]);

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