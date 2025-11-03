// Note: This is your full QuizScreen with slides fix on Restart.
// The rest of your features (leaderboard flex, tie-breaker intro/automation, timers, snapshot/revert, etc.) are preserved.
// Update in this version:
// - After the tie-breaker round completes, if it is still a tie, we immediately declare Shared Winners (no more re-running tiebreaker).
// - We prevent the round-complete screen from appearing for the tie-breaker round (avoids "Continue" causing another tie flow).
// - Finished screen now shows: "World Quality Day Quiz - 2025" and a clear Winner/Shared Winners block above your existing summary.

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CircularTimer from "./CircularTimer";
import tieData from "../data/tiebreaker.json";
import "./QuizScreen.css";

// Utility: Check if string is a media URL
const isMediaUrl = (str) => {
  if (!str || typeof str !== "string") return false;
  const image = /\.(jpg|jpeg|png|gif|svg|webp)$/i;
  const audio = /\.(mp3|wav|ogg|aac)$/i;
  const video = /\.(mp4|webm|mov|m4v)$/i;
  if (/cloudinary\.com/.test(str)) {
    if (image.test(str)) return "image";
    if (audio.test(str)) return "audio";
    if (video.test(str)) return "video";
  }
  if (image.test(str)) return "image";
  if (audio.test(str)) return "audio";
  if (video.test(str)) return "video";
  return false;
};

function renderMedia(url, style = {}, isQuestion = false) {
  const type = isMediaUrl(url);
  const baseImgStyle = isQuestion
    ? {
        width: "100%",
        maxWidth: "320px",
        maxHeight: "20vh",
        borderRadius: 12,
        boxShadow: "0 2px 12px #ffe06666",
        objectFit: "contain",
        margin: "1em auto",
        display: "block",
      }
    : {
        width: "100%",
        maxWidth: "380px",
        maxHeight: "26vh",
        borderRadius: 12,
        boxShadow: "0 2px 12px #ffe06666",
        objectFit: "contain",
        margin: "1em auto",
        display: "block",
      };
  if (type === "image") {
    return (
      <div className="media-center">
        <img src={url} alt="quiz-media" style={{ ...baseImgStyle, ...style }} />
      </div>
    );
  }
  if (type === "audio") {
    return (
      <div className="media-center">
        <audio controls style={{ width: "90%" }}>
          <source src={url} />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }
  if (type === "video") {
    return (
      <div className="media-center">
        <video
          controls
          style={{
            maxWidth: isQuestion ? "320px" : "380px",
            maxHeight: isQuestion ? "20vh" : "26vh",
            borderRadius: 12,
            boxShadow: "0 2px 12px #ffe06666",
            objectFit: "contain",
            margin: "1em auto",
            display: "block",
            ...style,
          }}
        >
          <source src={url} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }
  return null;
}

function TieBreakerIntro({ round, tiedTeams, onStart }) {
  let roundLabel = "Tie-Breaker Round";
  if (round === "final-intro") roundLabel = "Final Tie-Breaker Round";
  if (round === "rounds-tie") roundLabel = "Tie-Breaker Round";
  return (
    <div className="tie-intro-center">
      <div className="tie-intro-card">
        <h2 className="right-title tie-intro-title">{roundLabel}!</h2>
        <div className="tie-intro-body">
          <b>Tied Teams:</b>
          <ul className="tie-teams-list">
            {tiedTeams.map((team) => (
              <li key={team} className="tie-team">
                {team}
              </li>
            ))}
          </ul>
          <div className="tie-intro-msg">
            {round === "final-intro"
              ? "Teams are still tied after the tie-breaker. This is the last chance!"
              : "Multiple teams are tied. Only these teams will play the tie-breaker round."}
          </div>
        </div>
        <button className="big-start-btn tie-intro-btn" onClick={onStart}>
          Start {roundLabel}
        </button>
      </div>
    </div>
  );
}

function ConfettiCelebration() {
  const vectors = [
    { dx: 0, dy: -170 },
    { dx: 110, dy: -80 },
    { dx: -110, dy: -80 },
    { dx: 160, dy: 40 },
    { dx: -160, dy: 40 },
    { dx: 70, dy: 120 },
    { dx: -70, dy: 120 },
    { dx: 45, dy: -160 },
    { dx: -45, dy: -160 },
    { dx: 0, dy: 150 },
  ];
  return (
    <div className="confetti-wrapper">
      {vectors.map((vec, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            "--dx": `${vec.dx}px`,
            "--dy": `${vec.dy}px`,
          }}
        />
      ))}
    </div>
  );
}

function RestartModal({ onConfirm, onCancel }) {
  return (
    <div className="restart-modal-overlay">
      <motion.div
        className="restart-modal"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
      >
        <div className="restart-modal-title">Restart Quiz?</div>
        <div className="restart-modal-msg">
          Are you sure you want to restart the quiz?
          <br />
          All progress will be lost.
        </div>
        <div className="restart-modal-btn-row">
          <button
            className="restart-modal-btn confirm"
            onClick={onConfirm}
            autoFocus
          >
            Yes, Restart
          </button>
          <button className="restart-modal-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function QuizScreen({ quizState, setQuizState }) {
  const {
    teams,
    scores,
    turn,
    currentQuestion,
    timer,
    started,
    round: legacyRound = "main",
    aliveTeams = teams,
    winnerTeams = [],
    tieIntro = null,
  } = quizState;

  const roundsMode =
    Array.isArray(quizState.rounds) && quizState.rounds.length > 0;
  const currentRoundIndex = roundsMode ? quizState.currentRoundIndex || 0 : 0;
  const currentRound = roundsMode ? quizState.rounds[currentRoundIndex] : null;

  const teamsToUse = roundsMode
    ? currentRound?.teamsToUse || (aliveTeams.length ? aliveTeams : teams)
    : legacyRound === "main"
    ? teams
    : aliveTeams;

  // UI state
  const [questions, setQuestions] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [passedTeams, setPassedTeams] = useState([]);
  const [originalTurn, setOriginalTurn] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [questionRevealed, setQuestionRevealed] = useState(false);
  const [showRoundCompleteScreen, setShowRoundCompleteScreen] = useState(false);
  const [lastCompletedRoundIndex, setLastCompletedRoundIndex] = useState(null);
  const [showConfirmRestart, setShowConfirmRestart] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const timerRef = useRef();
  const isFirstMount = useRef(true);
  const teamListRef = useRef();

  const perRoundTimers =
    (quizState.timerSettings && quizState.timerSettings.perRound) ||
    [30, 30, 30, 30, 30];
  const passOnTimer =
    (quizState.timerSettings && quizState.timerSettings.passOn) || 15;

  // Helper: compute top score and tied teams from a given state
  const computeTopAndTiedTeams = (state) => {
    const scoringTeams =
      state.aliveTeams && state.aliveTeams.length
        ? state.aliveTeams
        : state.teams || [];
    if (!scoringTeams || scoringTeams.length === 0)
      return { topScore: 0, tiedTeams: [] };
    const scoresArr = scoringTeams.map((t) => state.scores?.[t] || 0);
    const maxScore = Math.max(...scoresArr);
    const tied = scoringTeams.filter(
      (t) => (state.scores?.[t] || 0) === maxScore
    );
    return { topScore: maxScore, tiedTeams: tied };
  };

  // Load questions for the current round
  useEffect(() => {
    if (roundsMode) {
      setQuestions(currentRound?.questions ?? []);
    } else {
      if (legacyRound === "main") setQuestions(quizState.questions ?? []);
      else if (legacyRound === "tiebreaker")
        setQuestions(quizState.tiebreaker ?? []);
      else if (legacyRound === "final")
        setQuestions(quizState.finalTiebreaker ?? []);
      else setQuestions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    legacyRound,
    roundsMode,
    currentRoundIndex,
    currentRound?.questions,
    quizState.questions,
    quizState.tiebreaker,
    quizState.finalTiebreaker,
  ]);

  const questionObj = questions?.[currentQuestion];

  // Snapshots
  const saveSnapshot = () => {
    try {
      localStorage.setItem("quizStateSnapshot", JSON.stringify(quizState));
    } catch (e) {}
  };
  const revertSnapshot = () => {
    try {
      const s = localStorage.getItem("quizStateSnapshot");
      if (!s) {
        return alert("No previous state to revert to.");
      }
      const parsed = JSON.parse(s);
      localStorage.setItem("quizState", JSON.stringify(parsed));
      setQuizState(parsed);
    } catch (e) {
      console.error("Revert failed", e);
    }
  };

  // Round-complete screen (prevent it for tie-breaker round to avoid re-triggering tie flow)
  useEffect(() => {
    if (!started) return;
    const qLen = questions.length;
    const isRoundComplete = qLen > 0 && currentQuestion >= qLen;
    if (
      isRoundComplete &&
      !showRoundCompleteScreen &&
      !tieIntro &&
      quizState.round !== "finished"
    ) {
      // If current round is the tiebreaker, do not show round-complete UI
      if (roundsMode && currentRound?.id === "tiebreaker") return;

      if (roundsMode) setLastCompletedRoundIndex(currentRoundIndex);
      else setLastCompletedRoundIndex(null);
      setShowRoundCompleteScreen(true);
    }
  }, [
    currentQuestion,
    legacyRound,
    started,
    questions,
    showRoundCompleteScreen,
    tieIntro,
    quizState.round,
    roundsMode,
    currentRoundIndex,
    currentRound?.id,
  ]);

  // Continue after round-complete
  const handleShowTieIntroAfterRoundComplete = () => {
    saveSnapshot();
    setShowRoundCompleteScreen(false);

    // If we somehow show round-complete while in tiebreaker, finish immediately (shared winners allowed)
    if (roundsMode && currentRound?.id === "tiebreaker") {
      setQuizState((prev) => {
        const scoringTeams =
          prev.aliveTeams && prev.aliveTeams.length ? prev.aliveTeams : prev.teams || [];
        const base = prev.tieBaseScores || {};
        const gains = Object.fromEntries(
          scoringTeams.map((t) => [t, (prev.scores?.[t] || 0) - (base[t] || 0)])
        );
        const maxGain = Math.max(...scoringTeams.map((t) => gains[t] || 0));
        const winners = scoringTeams.filter((t) => (gains[t] || 0) === maxGain);
        const next = { ...prev, round: "finished", winnerTeams: winners, tieIntro: null };
        localStorage.setItem("quizState", JSON.stringify(next));
        return next;
      });
      return;
    }

    if (roundsMode) {
      setQuizState((prev) => {
        const nextIndex = (prev.currentRoundIndex || 0) + 1;

        if (nextIndex >= (prev.rounds?.length || 0)) {
          const scoringTeams =
            prev.aliveTeams && prev.aliveTeams.length
              ? prev.aliveTeams
              : prev.teams || [];
          const aliveScores = scoringTeams.map(
            (team) => prev.scores?.[team] || 0
          );
          const maxScore = aliveScores.length ? Math.max(...aliveScores) : 0;
          const tiedTeams = scoringTeams.filter(
            (team) => (prev.scores?.[team] || 0) === maxScore
          );

          const tieHasQuestions =
            tieData &&
            Array.isArray(tieData.questions) &&
            tieData.questions.length > 0;

          if (tiedTeams.length > 1 && tieHasQuestions) {
            // Show tie-intro once; do not auto-switch (host starts it)
            const next = {
              ...prev,
              tieIntro: "rounds-tie",
              roundsTieTeams: tiedTeams,
            };
            localStorage.setItem("quizState", JSON.stringify(next));
            return next;
          }

          // No tie (or tiebreaker already handled) -> finish
          const winners = tiedTeams;
          const finishedState = {
            ...prev,
            round: "finished",
            currentRoundIndex: nextIndex,
            winnerTeams: winners,
            tieIntro: null,
          };
          localStorage.setItem("quizState", JSON.stringify(finishedState));
          return finishedState;
        }

        const next = {
          ...prev,
          currentRoundIndex: nextIndex,
          currentQuestion: 0,
          turn: 0,
          timer: {
            running: false,
            timeLeft:
              (prev.timerSettings?.perRound &&
                prev.timerSettings.perRound[nextIndex]) || 30,
            paused: false,
            passMode: false,
            startedAt: null,
          },
          tieIntro: null,
        };
        localStorage.setItem("quizState", JSON.stringify(next));
        return next;
      });
    } else {
      // legacy flow
      saveSnapshot();
      setQuizState((prev) => {
        const next = {
          ...prev,
          tieIntro:
            legacyRound === "main"
              ? "tie"
              : legacyRound === "tiebreaker"
              ? "final"
              : null,
        };
        localStorage.setItem("quizState", JSON.stringify(next));
        return next;
      });
    }
  };

  // Timer helpers
  function pausedTime(timerObj) {
    if (!timerObj) {
      return roundsMode ? (perRoundTimers[currentRoundIndex] ?? 30) : 30;
    }
    if (timerObj.running && timerObj.startedAt) {
      const elapsed = Math.floor((Date.now() - timerObj.startedAt) / 1000);
      const base = timerObj.passMode
        ? passOnTimer
        : roundsMode
        ? perRoundTimers[currentRoundIndex] ?? 30
        : 30;
      return Math.max(0, (timerObj.timeLeft ?? base) - elapsed);
    }
    if (typeof timerObj.timeLeft === "number") return timerObj.timeLeft;
    return roundsMode ? (perRoundTimers[currentRoundIndex] ?? 30) : 30;
  }

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      setQuizState((prev) => {
        const t = prev.timer || {};
        let left = pausedTime(t);
        const nextState = {
          ...prev,
          started: prev.started || false,
          timer: {
            running: false,
            paused: true,
            passMode: !!t.passMode,
            timeLeft: left,
            startedAt: null,
          },
        };
        localStorage.setItem("quizState", JSON.stringify(nextState));
        return nextState;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset per-question UI
  useEffect(() => {
    setShowAnswer(false);
    setPassedTeams([]);
    setOriginalTurn(turn);
    setTimeUp(false);
    setQuestionRevealed(false);
    setSelectedOption(null);
    setQuizState((prev) => {
      const next = {
        ...prev,
        timer: {
          ...prev.timer,
          running: false,
          paused: true,
          startedAt: null,
        },
      };
      localStorage.setItem("quizState", JSON.stringify(next));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, started, legacyRound, currentRoundIndex]);

  // Start timer when question revealed
  useEffect(() => {
    if (!started || !questionRevealed) return;
    setQuizState((prev) => {
      const baseTime =
        passedTeams.length !== 0
          ? passOnTimer
          : roundsMode
          ? perRoundTimers[currentRoundIndex] ?? 30
          : 30;
      const next = {
        ...prev,
        timer: {
          running: true,
          paused: false,
          passMode: passedTeams.length !== 0,
          timeLeft: baseTime,
          startedAt: Date.now(),
        },
      };
      localStorage.setItem("quizState", JSON.stringify(next));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionRevealed, started, passedTeams.length, currentRoundIndex]);

  // Timer tick
  useEffect(() => {
    if (!started || !timer?.running || timer.paused || showAnswer) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setQuizState((prevState) => {
        let tl = (prevState.timer.timeLeft ?? 0) - 1;
        const nextState = {
          ...prevState,
          timer: {
            ...prevState.timer,
            timeLeft: Math.max(0, tl),
            running: tl > 0,
          },
        };
        localStorage.setItem("quizState", JSON.stringify(nextState));
        return nextState;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, timer?.running, timer?.paused, showAnswer, setQuizState]);

  useEffect(() => {
    setTimeUp(timer?.timeLeft === 0 && !showAnswer);
  }, [timer, showAnswer]);

  // After tie-breaker finishes -> decide winners (delta from base). If tie persists => shared victory.
  useEffect(() => {
    if (!roundsMode) return;
    const current = quizState.rounds?.[quizState.currentRoundIndex];
    if (!current) return;
    if (current.id !== "tiebreaker") return;
    if (!questions || questions.length === 0) return;
    if (currentQuestion < questions.length) return;

    const scoringTeams =
      quizState.aliveTeams && quizState.aliveTeams.length
        ? quizState.aliveTeams
        : quizState.teams;
    const base = quizState.tieBaseScores || {};
    const gains = Object.fromEntries(
      scoringTeams.map((t) => [
        t,
        (quizState.scores?.[t] || 0) - (base[t] || 0),
      ])
    );
    const maxGain = Math.max(...scoringTeams.map((t) => gains[t] || 0));
    const winners = scoringTeams.filter((t) => (gains[t] || 0) === maxGain);

    setQuizState((prev) => {
      const next = {
        ...prev,
        round: "finished",
        winnerTeams: winners,
        tieIntro: null,
      };
      localStorage.setItem("quizState", JSON.stringify(next));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    questions.length,
    currentQuestion,
    quizState.rounds,
    quizState.currentRoundIndex,
    quizState.aliveTeams,
    quizState.scores,
  ]);

  // Leaderboard
  const leaderboard = useMemo(() => {
    const arr = (teamsToUse || []).map((team) => ({
      name: team,
      score: (scores && scores[team]) || 0,
      origIdx: (teamsToUse || []).indexOf(team),
    }));
    arr.sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.origIdx - b.origIdx
    );
    return arr;
  }, [teamsToUse, scores]);

  const highestScore = leaderboard.length > 0 ? leaderboard[0].score : 0;

  // Pause / Play
  const handlePausePlay = () => {
    setQuizState((prevState) => {
      const nextState = prevState.timer.paused
        ? {
            ...prevState,
            timer: {
              ...prevState.timer,
              paused: false,
              running: true,
              startedAt: Date.now(),
            },
          }
        : {
            ...prevState,
            timer: {
              ...prevState.timer,
              paused: true,
              running: false,
              startedAt: null,
            },
          };
      localStorage.setItem("quizState", JSON.stringify(nextState));
      return nextState;
    });
  };

  // Restart modal controls
  const handleRestartSafe = () => setShowConfirmRestart(true);
  const handleRestartCancel = () => setShowConfirmRestart(false);

  // IMPORTANT: set slidesSeen false so Slides show first after Restart
  const handleRestartConfirm = () => {
    saveSnapshot();
    setShowConfirmRestart(false);
    localStorage.removeItem("quizState");
    setQuizState({
      teams: [],
      aliveTeams: [],
      started: false,
      currentQuestion: 0,
      scores: {},
      turn: 0,
      round: "main",
      timer: {
        running: false,
        timeLeft: 30,
        paused: false,
        passMode: false,
        startedAt: null,
      },
      winnerTeams: [],
      tieIntro: null,
      slidesSeen: false, // show Slides first after restart
      rounds: null,
      currentRoundIndex: 0,
      timerSettings: {
        perRound: [30, 30, 30, 30, 30],
        passOn: 15,
      },
    });
  };

  const handleGoHome = () => {
    saveSnapshot();
    setQuizState((prev) => {
      const next = {
        ...prev,
        started: false,
        currentQuestion: 0,
        turn: 0,
        round: "main",
        timer: {
          running: false,
          timeLeft:
            (prev.timerSettings?.perRound && prev.timerSettings.perRound[0]) ||
            30,
          paused: false,
          passMode: false,
          startedAt: null,
        },
        aliveTeams: prev.teams || [],
        scores:
          prev.scores ||
          Object.fromEntries((prev.teams || []).map((t) => [t, 0])),
        winnerTeams: [],
        tieIntro: null,
      };
      localStorage.setItem("quizState", JSON.stringify(next));
      return next;
    });
  };

  const handleStartQuiz = () => {
    saveSnapshot();
    setQuizState((prev) => {
      const nextState = { ...prev, started: true };
      localStorage.setItem("quizState", JSON.stringify(nextState));
      return nextState;
    });
  };

  const handleStartQuestion = () => {
    saveSnapshot();
    setQuestionRevealed(true);
  };

  const handlePass = () => {
    saveSnapshot();
    const totalTeams = teamsToUse.length;
    let nextTurn = turn;
    let attempts = 0;
    let newPassedTeams = [...passedTeams, turn];
    while (attempts < totalTeams) {
      nextTurn = (nextTurn + 1) % totalTeams;
      if (nextTurn !== originalTurn && !newPassedTeams.includes(nextTurn))
        break;
      attempts++;
    }
    const uniquePassedTeams = Array.from(
      new Set(newPassedTeams.filter((idx) => idx !== originalTurn))
    );
    if (uniquePassedTeams.length >= teamsToUse.length - 1) {
      setShowAnswer(true);
      setQuizState((prev) => {
        const nextState = {
          ...prev,
          timer: {
            ...prev.timer,
            running: false,
            paused: true,
            startedAt: null,
          },
        };
        localStorage.setItem("quizState", JSON.stringify(nextState));
        return nextState;
      });
    } else {
      setPassedTeams(newPassedTeams);
      setQuestionRevealed(true);
      setQuizState((prev) => {
        const nextState = {
          ...prev,
          turn: nextTurn,
          timer: {
            running: true,
            paused: false,
            passMode: true,
            timeLeft: passOnTimer,
            startedAt: Date.now(),
          },
        };
        localStorage.setItem("quizState", JSON.stringify(nextState));
        return nextState;
      });
    }
  };

  const handleCorrect = () => {
    saveSnapshot();
    const teamName = teamsToUse[turn];
    const pts = questionObj?.points ?? 10;
    setQuizState((prev) => {
      const newScores = {
        ...prev.scores,
        [teamName]: (prev.scores[teamName] || 0) + pts,
      };
      const nextTurn = (originalTurn + 1) % (teamsToUse.length || 1);
      const nextState = {
        ...prev,
        scores: newScores,
        currentQuestion: (prev.currentQuestion || 0) + 1,
        turn: nextTurn,
        timer: {
          running: false,
          paused: true,
          passMode: false,
          timeLeft: roundsMode ? perRoundTimers[currentRoundIndex] ?? 30 : 30,
          startedAt: null,
        },
      };
      localStorage.setItem("quizState", JSON.stringify(nextState));
      return nextState;
    });
  };

  const handleReveal = () => {
    saveSnapshot();
    setShowAnswer(true);
    setAnswered(true);
    setQuizState((prev) => {
      const nextState = {
        ...prev,
        timer: {
          ...prev.timer,
          running: false,
          paused: true,
          startedAt: null,
        },
      };
      localStorage.setItem("quizState", JSON.stringify(nextState));
      return nextState;
    });
  };

  const handleNext = () => {
    saveSnapshot();
    setQuizState((prev) => ({
      ...prev,
      currentQuestion: (prev.currentQuestion || 0) + 1,
      turn: ((originalTurn || 0) + 1) % (teamsToUse.length || 1),
    }));
  };

  const handleOptionSelect = (idx) => {
    if (!questionRevealed) {
      saveSnapshot();
      setQuestionRevealed(true);
    }
    setSelectedOption(idx);
    setShowAnswer(true);
  };

  const getCorrectAnswerText = () => {
    if (!questionObj) return "";
    if (
      Array.isArray(questionObj.options) &&
      typeof questionObj.answerIndex === "number"
    ) {
      return questionObj.options[questionObj.answerIndex];
    }
    if (questionObj.answer) return questionObj.answer;
    if (
      typeof questionObj.answerIndex === "number" &&
      Array.isArray(questionObj.options)
    ) {
      return questionObj.options[questionObj.answerIndex];
    }
    return "";
  };

  // Legacy tie-intros
  if (tieIntro === "tie") {
    const scoringTeams =
      quizState.aliveTeams && quizState.aliveTeams.length
        ? quizState.aliveTeams
        : quizState.teams;
    const aliveScores = scoringTeams.map((team) => scores[team] || 0);
    const maxScore = Math.max(...aliveScores);
    const tiedTeams = scoringTeams.filter(
      (team) => (scores[team] || 0) === maxScore
    );
    return (
      <TieBreakerIntro
        round="tie-intro"
        tiedTeams={tiedTeams}
        onStart={() => {
          saveSnapshot();
          setQuizState((prev) => {
            const next = {
              ...prev,
              round: "tiebreaker",
              currentQuestion: 0,
              turn: 0,
              tieIntro: null,
            };
            localStorage.setItem("quizState", JSON.stringify(next));
            return next;
          });
        }}
      />
    );
  }
  if (tieIntro === "final") {
    const scoringTeams =
      quizState.aliveTeams && quizState.aliveTeams.length
        ? quizState.aliveTeams
        : quizState.teams;
    const aliveScores = scoringTeams.map((team) => scores[team] || 0);
    const maxScore = Math.max(...aliveScores);
    const tiedTeams = scoringTeams.filter(
      (team) => (scores[team] || 0) === maxScore
    );
    return (
      <TieBreakerIntro
        round="final-intro"
        tiedTeams={tiedTeams}
        onStart={() => {
          saveSnapshot();
          setQuizState((prev) => {
            const next = {
              ...prev,
              round: "final",
              currentQuestion: 0,
              turn: 0,
              tieIntro: null,
            };
            localStorage.setItem("quizState", JSON.stringify(next));
            return next;
          });
        }}
      />
    );
  }

  // Rounds-mode tie intro (after last selected round if tied)
  if (tieIntro === "rounds-tie") {
    const tiedTeams = quizState.roundsTieTeams || [];
    return (
      <TieBreakerIntro
        round="rounds-tie"
        tiedTeams={tiedTeams}
        onStart={() => {
          saveSnapshot();
          setQuizState((prev) => {
            const existingIndex = (prev.rounds || []).findIndex(
              (r) => r && r.id === "tiebreaker"
            );
            const tieRoundTime =
              tieData.timeLimitSeconds ??
              tieData.questions?.[0]?.timeLimitSeconds ??
              30;

            if (existingIndex >= 0) {
              const patchedPerRound = Array.isArray(
                prev.timerSettings?.perRound
              )
                ? [...prev.timerSettings.perRound]
                : [];
              if (!patchedPerRound[existingIndex])
                patchedPerRound[existingIndex] = tieRoundTime;
              const next = {
                ...prev,
                currentRoundIndex: existingIndex,
                currentQuestion: 0,
                turn: 0,
                aliveTeams: tiedTeams.length ? tiedTeams : prev.aliveTeams,
                timerSettings: {
                  ...(prev.timerSettings || {}),
                  perRound: patchedPerRound,
                },
                tieIntro: null,
                round: "rounds",
                tieBaseScores: Object.fromEntries(
                  (tiedTeams.length ? tiedTeams : prev.aliveTeams).map(
                    (t) => [t, prev.scores?.[t] || 0]
                  )
                ),
              };
              localStorage.setItem("quizState", JSON.stringify(next));
              return next;
            }

            const newRounds = [
              ...(prev.rounds || []),
              {
                ...tieData,
                id: "tiebreaker",
                title: tieData.title || "Tie-Breaker Round",
              },
            ];
            const newPerRound = Array.isArray(prev.timerSettings?.perRound)
              ? [...prev.timerSettings.perRound]
              : [];
            newPerRound.push(tieRoundTime);

            const next = {
              ...prev,
              rounds: newRounds,
              currentRoundIndex: newRounds.length - 1,
              currentQuestion: 0,
              turn: 0,
              aliveTeams: tiedTeams.length ? tiedTeams : prev.aliveTeams,
              timerSettings: {
                ...(prev.timerSettings || {}),
                perRound: newPerRound,
              },
              tieIntro: null,
              round: "rounds",
              tieBaseScores: Object.fromEntries(
                (tiedTeams.length ? tiedTeams : prev.aliveTeams).map(
                  (t) => [t, prev.scores?.[t] || 0]
                )
              ),
            };
            localStorage.setItem("quizState", JSON.stringify(next));
            return next;
          });
        }}
      />
    );
  }

  // Round complete screen
  if (showRoundCompleteScreen) {
    const idx = lastCompletedRoundIndex ?? currentRoundIndex;
    const roundLabel = roundsMode
      ? `Round ${idx + 1} (${
          quizState.rounds?.[idx]?.title || currentRound?.title || "Round"
        })`
      : legacyRound === "main"
      ? "Main Round"
      : legacyRound;
    return (
      <div className="container">
        <div style={{ position: "absolute", right: 12, top: 12, zIndex: 1200 }}>
          <button
            className="revert-btn"
            onClick={revertSnapshot}
            title="Revert last change"
          >
            Revert
          </button>
        </div>

        <div className="left-panel">
          <button
            className="small-restart-btn"
            onClick={handleRestartSafe}
            title="Restart Quiz"
            aria-label="Restart Quiz"
          >
            ⟲
          </button>
          <div className="leaderboard-timer-row">
            <div className="leaderboard-timer-center">
              <CircularTimer
                value={0}
                max={30}
                paused={true}
                onClick={() => {}}
                className="compact"
              />
            </div>
          </div>
          <div className="leaderboard-container">
            <h2 className="leaderboard-title">Leaderboard</h2>
            <ul className="team-list" ref={teamListRef}>
              {leaderboard.map((teamObj) => (
                <li
                  className="team-item"
                  key={teamObj.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{teamObj.name}</span>
                  <span>
                    {teamObj.score}
                    {teamObj.score === highestScore && highestScore > 0 ? (
                      <span className="trophy">🏆</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="right-panel">
          <div className="round-complete-card">
            <div className="round-complete-title">{roundLabel} Complete!</div>
            <div className="round-complete-msg">
              The round has ended! Below are the teams and their current scores.
            </div>

            <div style={{ marginTop: 12 }}>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {leaderboard.map((t) => (
                  <li
                    key={t.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <span style={{ fontWeight: 700, marginRight: 10 }}>{t.name} Score: </span>
                    <span style={{ fontWeight: 800 }}>{t.score}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                className="round-complete-next-btn"
                onClick={handleShowTieIntroAfterRoundComplete}
              >
                Continue
              </button>
            </div>
          </div>
        </div>

        {showConfirmRestart && (
          <RestartModal
            onConfirm={handleRestartConfirm}
            onCancel={handleRestartCancel}
          />
        )}
      </div>
    );
  }

  // Finished screen
  if (quizState.round === "finished") {
    const baseTeams =
      (quizState.aliveTeams && quizState.aliveTeams.length
        ? quizState.aliveTeams
        : quizState.teams) || [];
    const maxScore = baseTeams.length
      ? Math.max(...baseTeams.map((t) => scores[t] || 0))
      : 0;
    const fallbackWinners = baseTeams.filter(
      (t) => (scores[t] || 0) === maxScore
    );
    const winnersToShow =
      winnerTeams && winnerTeams.length > 0 ? winnerTeams : fallbackWinners;

    // Title and explicit "Winner"/"Shared Winners" block
    const quizTitle = "World Quality Day Quiz - 2025";
    const isShared = winnersToShow?.length > 1;
    const resultHeading = isShared ? "Shared Winners" : "Winner";
    const resultNames = isShared
      ? winnersToShow.join(" & ")
      : winnersToShow?.[0] || "No winner determined";

    return (
      <div className="container">
        <div style={{ position: "absolute", right: 12, top: 12, zIndex: 1200 }}>
          <button
            className="revert-btn"
            onClick={revertSnapshot}
            title="Revert last change"
          >
            Revert
          </button>
        </div>

        {showConfetti && <ConfettiCelebration />}
        <div className="left-panel">
          <button className="small-restart-btn" onClick={handleRestartSafe}>
            ⟲
          </button>
          <div className="leaderboard-timer-row">
            <div className="leaderboard-timer-center">
              <CircularTimer
                value={0}
                max={30}
                paused={true}
                onClick={() => {}}
                className="compact"
              />
            </div>
          </div>
          <div
            className="leaderboard-container"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "220px",
            }}
          >
            <div className="winner-display" role="status" aria-live="polite">
              <div className="winner-shine" />
              <div className="trophy-pop" aria-hidden="true">
                🏆
              </div>
              <div className="winner-text" style={{ zIndex: 2 }}>
                {winnersToShow?.length > 1
                  ? `🎉 Shared Victory: ${winnersToShow.join(" & ")}!`
                  : winnersToShow?.length === 1
                  ? `🏆 ${winnersToShow[0]} Wins!`
                  : "No winner determined"}
              </div>
            </div>
          </div>
        </div>

        <div
          className="right-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {/* Title and winner section */}
          <h2
            className="right-title"
            style={{
              marginBottom: "0.75rem",
              fontSize: "1.8rem",
              color: "#222037",
            }}
          >
            {quizTitle}
          </h2>

          <div
            style={{
              marginTop: "0.25rem",
              padding: "0.9rem 1.2rem",
              borderRadius: 12,
              background:
                "linear-gradient(90deg, rgba(245,247,250,0.85) 0%, rgba(227,238,255,0.85) 100%)",
              boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
              minWidth: 280,
            }}
          >
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 900,
                color: isShared ? "#e73827" : "#1e4e80",
                letterSpacing: ".02em",
                marginBottom: "0.35rem",
              }}
            >
              {resultHeading}
            </div>
            <div
              style={{
                fontSize: isShared ? "1.25rem" : "1.4rem",
                fontWeight: 900,
                color: isShared ? "#e73827" : "#1f6f2e",
              }}
            >
              {resultNames}
              {!isShared && winnersToShow?.length === 1 ? " 🏆" : ""}
            </div>
          </div>

          {/* Your original summary block (kept) */}
          <h3 className="right-title" style={{ marginTop: "1.4rem" }}>
            Quiz Finished
          </h3>
          {winnersToShow?.length > 1 ? (
            <div
              style={{
                margin: "0.9rem 0 0.4rem",
                textAlign: "center",
                color: "#e73827",
                fontSize: "1.1rem",
                fontWeight: 800,
              }}
            >
              Shared Victory 🎉
              <br />
              Teams: {winnersToShow.join(", ")}
            </div>
          ) : (
            <div
              style={{
                margin: "0.9rem 0 0.4rem",
                textAlign: "center",
                color: "#43ad36",
                fontSize: "1.2rem",
                fontWeight: 900,
              }}
            >
              {winnersToShow?.length === 1
                ? `Winner: ${winnersToShow[0]} 🏆`
                : "No winner determined"}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.9rem", marginTop: "1.2rem" }}>
            <button className="round-complete-next-btn" onClick={handleGoHome}>
              Home
            </button>
            <button
              className="round-complete-next-btn"
              onClick={handleRestartConfirm}
              style={{
                background: "linear-gradient(90deg,#5f2c82 0%, #49a09d 100%)",
                color: "#fff",
              }}
            >
              Restart
            </button>
          </div>
        </div>
        {showConfirmRestart && (
          <RestartModal
            onConfirm={handleRestartConfirm}
            onCancel={handleRestartCancel}
          />
        )}
      </div>
    );
  }

  // Not started screen
  if (!started) {
    return (
      <div className="container" style={{ position: "relative" }}>
        <div
          style={{ position: "absolute", right: 12, top: 12, zIndex: 1200 }}
        >
          <button
            className="revert-btn"
            onClick={revertSnapshot}
            title="Revert last change"
          >
            Revert
          </button>
        </div>

        <div className="left-panel">
          <button className="small-restart-btn" onClick={handleRestartSafe}>
            ⟲
          </button>
        <div className="leaderboard-timer-row">
            <div className="leaderboard-timer-center">
              <CircularTimer
                value={0}
                max={30}
                paused={true}
                onClick={() => {}}
                className="compact"
              />
            </div>
          </div>
          <div className="leaderboard-container">
            <h2 className="leaderboard-title">Leaderboard</h2>
            <ul className="team-list" ref={teamListRef}>
              <AnimatePresence>
                {leaderboard.map((teamObj) => (
                  <motion.li
                    key={teamObj.name}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 35,
                    }}
                    className="team-item"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      minHeight: "3.6em",
                      fontWeight: "400",
                      fontSize: "1.16rem",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: "400" }}>{teamObj.name}</span>
                    <span>{teamObj.score}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </div>

        <div
          className="right-panel"
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <button
            className="big-start-btn"
            onClick={handleStartQuiz}
            style={{
              fontSize: "2rem",
              padding: "1.3rem 3.5rem",
              borderRadius: "2.5rem",
              border: "none",
              background: "linear-gradient(90deg, #6dc6ff 0%, #f3fafe 100%)",
              color: "#1e4e80",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 10px #6dc6ff33",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            Start Quiz
          </button>
        </div>
        {showConfirmRestart && (
          <RestartModal
            onConfirm={handleRestartConfirm}
            onCancel={handleRestartCancel}
          />
        )}
      </div>
    );
  }

  // --- Quiz Running Screen ---
  let roundTitle = "Quiz";
  if (roundsMode) {
    roundTitle = currentRound?.title ?? `Round ${currentRoundIndex + 1}`;
  } else {
    if (legacyRound === "tiebreaker") roundTitle = "Tie-Breaker Round";
    if (legacyRound === "final") roundTitle = "Final Tie-Breaker Round";
  }

  const questionMedia =
    isMediaUrl(questionObj?.question) &&
    renderMedia(questionObj?.question, {}, true);
  const explicitMedia =
    questionObj?.media && renderMedia(questionObj?.media, {}, true);

  const totalQuestions = questions.length;
  const currentQNum = currentQuestion + 1;
  const isMultipleChoice =
    Array.isArray(questionObj?.options) && questionObj.options.length > 0;

  const optionButtonStyle = (i) => {
    const base = {
      padding: "0.8rem 1rem",
      borderRadius: 10,
      margin: "6px 0",
      width: "100%",
      textAlign: "left",
      cursor: showAnswer ? "default" : "pointer",
      border: "1px solid #e6e6ea",
      background: "#ffffff",
      boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
      fontWeight: 700,
      color: "#222",
    };

    if (showAnswer) {
      const correctIndex =
        typeof questionObj?.answerIndex === "number"
          ? questionObj.answerIndex
          : null;
      if (correctIndex === i) {
        base.background = "linear-gradient(90deg,#e6f9ee 0%, #d9f1df 100%)";
        base.border = "2px solid #19a849";
        base.color = "#0b6b2a";
      } else if (selectedOption === i && selectedOption !== correctIndex) {
        base.background = "linear-gradient(90deg,#ffecec 0%, #ffd6d6 100%)";
        base.border = "2px solid #f85032";
        base.color = "#7a1f1f";
      } else {
        base.opacity = 0.9;
      }
    } else if (selectedOption === i) {
      base.background = "#f0f4ff";
      base.border = "1.5px solid #d6e2ff";
      base.color = "#1e3a8a";
    }

    if (!questionRevealed || showAnswer) {
      base.opacity = base.opacity ?? 1;
      if (!questionRevealed) base.cursor = "not-allowed";
    }

    return base;
  };

  const currentRoundNumberLabel = roundsMode
    ? `Round ${currentRoundIndex + 1}`
    : legacyRound.toUpperCase();

  return (
    <div className="container" style={{ position: "relative" }}>
      <div style={{ position: "absolute", right: 12, top: 12, zIndex: 1200 }}>
        <button
          className="revert-btn"
          onClick={revertSnapshot}
          title="Revert last change"
        >
          Revert
        </button>
      </div>

      <div className="left-panel">
        <button
          className="small-restart-btn"
          onClick={handleRestartSafe}
          title="Restart Quiz"
        >
          ⟲
        </button>
        <div className="leaderboard-timer-row">
          <div className="leaderboard-timer-center">
            {questionRevealed ? (
              <CircularTimer
                value={timer?.timeLeft ?? 0}
                max={
                  timer?.passMode
                    ? passOnTimer
                    : roundsMode
                    ? perRoundTimers[currentRoundIndex] ?? 30
                    : 30
                }
                paused={timer?.paused || false}
                onClick={handlePausePlay}
              />
            ) : (
              <CircularTimer
                value={0}
                max={30}
                paused={true}
                onClick={() => {}}
                className="compact"
              />
            )}
          </div>
        </div>

        <div className="leaderboard-container">
          <h2 className="leaderboard-title">Leaderboard</h2>
          <ul className="team-list" ref={teamListRef}>
            <AnimatePresence>
              {leaderboard.map((teamObj, i) => (
                <motion.li
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 35,
                  }}
                  key={teamObj.name}
                  className={`team-item${
                    teamsToUse[turn] === teamObj.name ? " highlight" : ""
                  }`}
                  style={{
                    minHeight: "3.6em",
                    fontWeight: "650",
                    fontSize: "1.16rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: "650", color: "#5F2F83" }}>
                    {teamObj.name}
                  </span>
                  <span>
                    {teamObj.score}
                    {i === 0 && teamObj.score === highestScore && highestScore > 0 ? (
                      <span className="trophy" title="Top Team">
                        🏆
                      </span>
                    ) : null}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>

      <div className="right-panel">
        <div className="quiz-header-row"></div>

        <div className="right-title" style={{ textAlign: "left", marginBottom: 8 }}>
          <div>
            {currentRoundNumberLabel} — {roundTitle}
          </div>
        </div>

        <div style={{ textAlign: "left", marginBottom: 0 }}>
          <div
            className="right-title-q"
            style={{
              marginBottom: 0,
              fontSize: "1.45rem",
              fontWeight: 800,
              minHeight: "3.1em",
            }}
          >
            Question for {teamsToUse[turn]}
          </div>
        </div>

        {!questionRevealed ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "170px",
            }}
          >
            <button
              className="start-question-btn"
              onClick={handleStartQuestion}
              style={{
                fontSize: "1.1rem",
                padding: "0.8rem 2.2rem",
                borderRadius: "2rem",
                border: "none",
                background: "linear-gradient(90deg, #fff3c4 0%, #ffe066 100%)",
                color: "#7c6900",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px #ffe06633",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              Start Question
            </button>
          </div>
        ) : (
          <div className={`question-box responsive-media-box`}>
            <span className="question-progress">
              {currentQNum}/{totalQuestions}
            </span>
            <div
              className="question-main-text"
              style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 8 }}
            >
              {questionObj?.question}
            </div>

            {isMultipleChoice && (
              <div
                style={{
                  width: "100%",
                  maxWidth: 640,
                  margin: "0.6rem auto 0",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                {questionObj.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (!showAnswer && questionRevealed) handleOptionSelect(i);
                    }}
                    disabled={!questionRevealed || showAnswer}
                    aria-pressed={selectedOption === i}
                    style={optionButtonStyle(i)}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div
                        style={{
                          minWidth: 34,
                          minHeight: 34,
                          borderRadius: 8,
                          background: selectedOption === i ? "#f0f4ff" : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid #eee",
                          fontWeight: 800,
                          color: "#333",
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                      <div style={{ flex: 1, textAlign: "left", fontWeight: 700 }}>
                        {opt}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {questionMedia}
            {explicitMedia}

            {timeUp && !showAnswer && (
              <div className="timeup-msg">
                Time's up! Please pass or reveal answer.
              </div>
            )}
          </div>
        )}

        <div className="button-row" style={{ marginTop: isMultipleChoice ? 16 : 24 }}>
          <button
            className="control-btn"
            onClick={handlePass}
            disabled={showAnswer || !questionRevealed}
          >
            Pass
          </button>
          <button
            className="control-btn green"
            onClick={() => {
              if (isMultipleChoice && selectedOption !== null) {
                const correctIndex = questionObj?.answerIndex;
                if (typeof correctIndex === "number") {
                  if (selectedOption === correctIndex) {
                    handleCorrect();
                    return;
                  }
                }
              }
              handleCorrect();
            }}
            disabled={showAnswer === false && !questionRevealed}
          >
            Correct
          </button>
          <button
            className="control-btn red"
            onClick={handleReveal}
            disabled={showAnswer || !questionRevealed}
          >
            Reveal
          </button>
          <button className="control-btn" onClick={handleNext} disabled={!showAnswer}>
            Next Question
          </button>
        </div>

        {showAnswer && (
          <div className="answer-box" style={{ width: "100%", textAlign: "center", marginTop: 12 }}>
            <b>Answer:</b>{" "}
            <span>
              {isMultipleChoice ? getCorrectAnswerText() : questionObj?.answer}
            </span>
          </div>
        )}
      </div>

      {showConfetti && <ConfettiCelebration />}
      {showConfirmRestart && (
        <RestartModal
          onConfirm={handleRestartConfirm}
          onCancel={handleRestartCancel}
        />
      )}
    </div>
  );
}