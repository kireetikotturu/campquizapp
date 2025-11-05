// Note: Full QuizScreen with all previous features preserved and a password lock added.
// Key features retained:
// - Media shown BELOW question text, options below media.
// - Bottom status line for "Time's up" and "Answer" (doesn't cover content).
// - Pass-on scoring: original team correct = 10 (or question.points), pass-on team correct = 5.
// - Robust multi-step Revert history: exact step-by-step undo including timer/pass/score/UI.
// - Slim subtle scrollbar for the question container.
// - Manual timer start for the first team; auto-start on pass.
// - Round-complete screen after each selected round to show scores and continue the flow.
// - After all selected rounds: if tie -> single tie-breaker round; if tie persists after it -> Shared Winners and finish.
// - Option click reveals the answer and pauses timer; Next enabled only after reveal.
// - Dynamic tie-breaker questions: 2 teams => 4 questions; otherwise one per tied team; capped by JSON available.
//
// NEW: Password Lock ("campq202530")
// - When starting the quiz (pressing Start Quiz) a password is required (once per page load).
// - While the quiz is ongoing (started and not finished), on any page refresh a password is required before viewing.
// - The password prompt appears only on page load/refresh or when starting; once unlocked, it won't appear again until the next refresh.
// - Timer is NOT forcibly modified by the lock; overlay blocks interaction and view until unlocked.

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
        maxWidth: "100%",
        maxHeight: "55vh",
        borderRadius: 12,
        boxShadow: "0 2px 12px #ffe06666",
        objectFit: "contain",
        margin: "0 auto",
        display: "block",
      }
    : {
        width: "100%",
        maxWidth: "100%",
        maxHeight: "55vh",
        borderRadius: 12,
        boxShadow: "0 2px 12px #ffe06666",
        objectFit: "contain",
        margin: "0 auto",
        display: "block",
      };
  if (type === "image") {
    return (
      <div className="media-center" style={{ width: "100%" }}>
        <img src={url} alt="quiz-media" style={{ ...baseImgStyle, ...style }} />
      </div>
    );
  }
  if (type === "audio") {
    return (
      <div className="media-center" style={{ width: "100%" }}>
        <audio controls style={{ width: "100%" }}>
          <source src={url} />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }
  if (type === "video") {
    return (
      <div className="media-center" style={{ width: "100%" }}>
        <video
          controls
          style={{
            width: "100%",
            maxWidth: "100%",
            maxHeight: "55vh",
            borderRadius: 12,
            boxShadow: "0 2px 12px #ffe06666",
            objectFit: "contain",
            margin: "0 auto",
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

function PasswordLockModal({
  onSubmit,
  onCancel,
  error,
}) {
  const [pwd, setPwd] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(pwd);
  };
  return (
    <div className="restart-modal-overlay" style={{ zIndex: 4000 }}>
      <motion.div
        className="restart-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
        style={{ maxWidth: 460 }}
      >
        <div className="restart-modal-title">Unlock Quiz</div>
        <div className="restart-modal-msg" style={{ marginBottom: 10 }}>
          Enter the quiz password to continue.
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e6e6ea",
              outline: "none",
              fontSize: "1rem",
              marginBottom: 10,
            }}
          />
          {error ? (
            <div
              style={{
                color: "#b91c1c",
                fontWeight: 800,
                fontSize: ".95rem",
                marginBottom: 6,
              }}
            >
              {error}
            </div>
          ) : null}
          <div className="restart-modal-btn-row">
            <button type="submit" className="restart-modal-btn confirm">
              Unlock
            </button>
            <button type="button" className="restart-modal-btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function QuizScreen({ quizState, setQuizState }) {
  // Inject scoped layout CSS
  const injectedLayoutCSS = `
    .qbox { position: relative; display: flex; flex-direction: column; gap: 10px; }
    .q-main { flex: 1; min-height: 0; display: flex; }
    .q-scroll { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px; overflow: auto; padding-right: 4px; }

    /* Slim, subtle scrollbar only for question container */
    .q-scroll { scrollbar-width: thin; scrollbar-color: rgba(34,34,34,0.18) transparent; }
    .q-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .q-scroll::-webkit-scrollbar-track { background: transparent; }
    .q-scroll::-webkit-scrollbar-thumb { background: rgba(34,34,34,0.22); border-radius: 8px; }
    .q-scroll:hover::-webkit-scrollbar-thumb { background: rgba(34,34,34,0.32); }
    .q-scroll::-webkit-scrollbar-corner { background: transparent; }

    .q-row { width: 100%; }
    .q-media { width: 100%; display: flex; align-items: center; justify-content: center; }
    .opts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; max-width: 940px; margin: 6px auto 0; }
    .q-status { margin-top: clamp(10px, 1.6vh, 16px); display: flex; align-items: center; justify-content: center; min-height: 1.6em; }
    .q-line { font-size: 0.95rem; line-height: 1.3; font-weight: 800; text-align: center; }
    .q-line.warn { color: #b91c1c; }
    .q-line.answer { color: #0b6b2a; }
    .question-main-text { word-wrap: break-word; overflow-wrap: anywhere; font-size: clamp(1.08rem, 1.6vw, 1.65rem) !important; }
    @media (max-width: 1280px) {
      .opts-grid { max-width: 860px; }
    }
    @media (max-width: 1024px) {
      .opts-grid { grid-template-columns: 1fr; max-width: 740px; }
    }
  `;

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

  // Password lock state (memory only; resets on refresh)
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const [lockError, setLockError] = useState("");

  // Refs/timers
  const timerRef = useRef();
  const isFirstMount = useRef(true);
  const suppressResetRef = useRef(false);
  const teamListRef = useRef();

  const perRoundTimers =
    (quizState.timerSettings && quizState.timerSettings.perRound) ||
    [30, 30, 30, 30, 30];
  const passOnTimer =
    (quizState.timerSettings && quizState.timerSettings.passOn) || 15;

  // Helper: derive tie-breaker questions count based on tied team count
  const deriveTieBreakerQuestions = (count) => {
    const all = (tieData && Array.isArray(tieData.questions)) ? tieData.questions : [];
    if (count <= 0) return [];
    let desired = count === 2 ? 4 : count; // 2 teams -> 4 questions; otherwise one per team
    desired = Math.min(desired, all.length);
    return all.slice(0, desired);
  };

  // ---------------- History for Revert ----------------
  const HISTORY_KEY = "quizHistory";
  const HISTORY_LIMIT = 100;

  const getEffectiveTimeLeft = (t, ctx) => {
    if (!t) {
      return ctx.roundsMode ? (ctx.perRoundTimers[ctx.currentRoundIndex] ?? 30) : 30;
    }
    if (t.running && t.startedAt) {
      const elapsed = Math.floor((Date.now() - t.startedAt) / 1000);
      const base = t.passMode
        ? ctx.passOnTimer
        : ctx.roundsMode
        ? ctx.perRoundTimers[ctx.currentRoundIndex] ?? 30
        : 30;
      return Math.max(0, (t.timeLeft ?? base) - elapsed);
    }
    if (typeof t.timeLeft === "number") return t.timeLeft;
    return ctx.roundsMode ? (ctx.perRoundTimers[ctx.currentRoundIndex] ?? 30) : 30;
  };

  const normalizeQuizStateForSnapshot = (state) => {
    const ctx = {
      roundsMode,
      perRoundTimers,
      currentRoundIndex,
      passOnTimer,
    };
    const tl = getEffectiveTimeLeft(state.timer, ctx);
    return {
      ...state,
      timer: {
        ...state.timer,
        running: false,
        paused: true,
        startedAt: null,
        timeLeft: tl,
      },
    };
  };

  const currentUIState = () => ({
    showAnswer,
    answered,
    selectedOption,
    passedTeams,
    originalTurn,
    timeUp,
    questionRevealed,
    showRoundCompleteScreen,
    lastCompletedRoundIndex,
    showConfirmRestart,
    showConfetti,
  });

  const applyUIState = (ui) => {
    setShowAnswer(ui.showAnswer || false);
    setAnswered(ui.answered || false);
    setSelectedOption(
      typeof ui.selectedOption === "number" ? ui.selectedOption : null
    );
    setPassedTeams(Array.isArray(ui.passedTeams) ? ui.passedTeams : []);
    setOriginalTurn(typeof ui.originalTurn === "number" ? ui.originalTurn : 0);
    setTimeUp(!!ui.timeUp);
    setQuestionRevealed(!!ui.questionRevealed);
    setShowRoundCompleteScreen(!!ui.showRoundCompleteScreen);
    setLastCompletedRoundIndex(
      typeof ui.lastCompletedRoundIndex === "number"
        ? ui.lastCompletedRoundIndex
        : null
    );
    setShowConfirmRestart(!!ui.showConfirmRestart);
    setShowConfetti(!!ui.showConfetti);
  };

  const readHistory = () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const writeHistory = (arr) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    } catch {}
  };

  const saveSnapshot = (reason = "") => {
    try {
      clearInterval(timerRef.current);
      const normalized = normalizeQuizStateForSnapshot(quizState);
      localStorage.setItem("quizState", JSON.stringify(normalized));
      const hist = readHistory();
      const entry = {
        quizState: normalized,
        ui: currentUIState(),
        ts: Date.now(),
        reason,
      };
      const nextHist =
        hist.length >= HISTORY_LIMIT
          ? [...hist.slice(hist.length - HISTORY_LIMIT + 1), entry]
          : [...hist, entry];
      writeHistory(nextHist);
    } catch {}
  };

  const revertSnapshot = () => {
    clearInterval(timerRef.current);
    const hist = readHistory();
    if (!hist.length) {
      alert("No previous state to revert to.");
      return;
    }
    const prev = hist[hist.length - 1];
    const newHist = hist.slice(0, hist.length - 1);
    writeHistory(newHist);

    if (!prev || !prev.quizState) {
      alert("No previous state to revert to.");
      return;
    }
    suppressResetRef.current = true;
    const restoredQuizState = {
      ...prev.quizState,
      timer: {
        ...(prev.quizState.timer || {}),
        running: false,
        paused: true,
        startedAt: null,
      },
    };
    try {
      localStorage.setItem("quizState", JSON.stringify(restoredQuizState));
    } catch {}
    setQuizState(restoredQuizState);
    applyUIState(prev.ui || {});
  };
  // --------------- End History ----------------

  // Load questions for the current round or legacy round
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

  // Initialize on first mount: normalize timer and seed history
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      const normalized = normalizeQuizStateForSnapshot(quizState);
      setQuizState(normalized);
      try {
        localStorage.setItem("quizState", JSON.stringify(normalized));
      } catch {}
      const existing = readHistory();
      if (!existing.length) {
        writeHistory([
          {
            quizState: normalized,
            ui: currentUIState(),
            ts: Date.now(),
            reason: "initial",
          },
        ]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset per-question UI (skip if restoring via revert)
  useEffect(() => {
    if (suppressResetRef.current) {
      suppressResetRef.current = false;
      return;
    }
    // Initialize timer for new question: full base time, paused (manual start)
    const baseTime = roundsMode
      ? perRoundTimers[currentRoundIndex] ?? 30
      : 30;

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
          running: false,
          paused: true,
          passMode: false,
          timeLeft: baseTime,
          startedAt: null,
        },
      };
      try {
        localStorage.setItem("quizState", JSON.stringify(next));
      } catch {}
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, started, legacyRound, currentRoundIndex]);

  // Timer tick (restart interval when startedAt changes)
  useEffect(() => {
    if (!started || !timer?.running || timer.paused || showAnswer) {
      clearInterval(timerRef.current);
      return;
    }
    clearInterval(timerRef.current);
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
        try {
          localStorage.setItem("quizState", JSON.stringify(nextState));
        } catch {}
        return nextState;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [
    started,
    timer?.running,
    timer?.paused,
    timer?.startedAt, // ensure interval re-init when switching to pass mode
    showAnswer,
    setQuizState,
  ]);

  useEffect(() => {
    setTimeUp(timer?.timeLeft === 0 && !showAnswer);
  }, [timer, showAnswer]);

  // Round-complete detector (robust) - SKIP for tiebreaker round to avoid loop UI
  useEffect(() => {
    if (!started) return;
    const qLen = Array.isArray(questions) ? questions.length : 0;
    const atEndIndex = qLen > 0 && currentQuestion >= qLen;
    const lastQAnswered =
      qLen > 0 && currentQuestion === qLen - 1 && showAnswer === true;

    if (
      (atEndIndex || lastQAnswered) &&
      !showRoundCompleteScreen &&
      quizState.round !== "finished" &&
      !tieIntro
    ) {
      // Do not show Round Complete for tiebreaker in rounds mode
      if (roundsMode && currentRound?.id === "tiebreaker") return;

      if (roundsMode) setLastCompletedRoundIndex(currentRoundIndex);
      else setLastCompletedRoundIndex(null);
      setShowRoundCompleteScreen(true);
    }
  }, [
    started,
    questions,
    currentQuestion,
    showAnswer,
    showRoundCompleteScreen,
    quizState.round,
    tieIntro,
    roundsMode,
    currentRoundIndex,
    currentRound?.id,
  ]);

  // Tie-breaker finishing: decide winners based on gains vs base, then finish (shared winners allowed)
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
      try {
        localStorage.setItem("quizState", JSON.stringify(next));
      } catch {}
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

  // Pause / Play via CircularTimer click (manual control)
  const handlePausePlay = () => {
    saveSnapshot("pause-play");
    clearInterval(timerRef.current);
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
      try {
        localStorage.setItem("quizState", JSON.stringify(nextState));
      } catch {}
      return nextState;
    });
  };

  // Restart modal controls
  const handleRestartSafe = () => setShowConfirmRestart(true);
  const handleRestartCancel = () => setShowConfirmRestart(false);

  const handleRestartConfirm = () => {
    saveSnapshot("restart-confirm");
    clearInterval(timerRef.current);
    setShowConfirmRestart(false);
    localStorage.removeItem("quizState");
    writeHistory([]); // clear history on hard restart
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
      slidesSeen: false,
      rounds: null,
      currentRoundIndex: 0,
      timerSettings: {
        perRound: [30, 30, 30, 30, 30],
        passOn: 15,
      },
    });
    const seed = {
      quizState: normalizeQuizStateForSnapshot({
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
          paused: true,
          passMode: false,
          startedAt: null,
        },
        winnerTeams: [],
        tieIntro: null,
        slidesSeen: false,
        rounds: null,
        currentRoundIndex: 0,
        timerSettings: {
          perRound: [30, 30, 30, 30, 30],
          passOn: 15,
        },
      }),
      ui: currentUIState(),
      ts: Date.now(),
      reason: "post-restart-seed",
    };
    writeHistory([seed]);
  };

  const handleGoHome = () => {
    saveSnapshot("go-home");
    clearInterval(timerRef.current);
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
      try {
        localStorage.setItem("quizState", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Password lock helpers
  const PASSWORD = "campq202530";

  const requireLockNow =
    (quizState.started && quizState.round !== "finished" && !isUnlocked);

  // On initial load or whenever started status flips to ongoing, show lock (only if not unlocked yet)
  useEffect(() => {
    if (quizState.started && quizState.round !== "finished" && !isUnlocked) {
      setLockError("");
      setShowLock(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizState.started, quizState.round]);

  const handleLockSubmit = (input) => {
    if ((input || "").trim() === PASSWORD) {
      setIsUnlocked(true);
      setShowLock(false);
      setLockError("");
    } else {
      setLockError("Incorrect password. Try again.");
    }
  };

  const handleLockCancel = () => {
    // Keep the lock open; optional behavior: allow cancel to just keep overlay
    setShowLock(true);
  };

  const handleStartQuiz = () => {
    // Enforce password on quiz start
    if (!isUnlocked) {
      setLockError("");
      setShowLock(true);
      return;
    }
    saveSnapshot("start-quiz");
    setQuizState((prev) => {
      const nextState = { ...prev, started: true };
      try {
        localStorage.setItem("quizState", JSON.stringify(nextState));
      } catch {}
      return nextState;
    });
  };

  const handleStartQuestion = () => {
    saveSnapshot("start-question");
    // Reveal the question but DO NOT start the timer automatically.
    // Initialize timer to full base time, paused.
    const baseTime = roundsMode
      ? perRoundTimers[currentRoundIndex] ?? 30
      : 30;
    setQuestionRevealed(true);
    setQuizState((prev) => {
      const next = {
        ...prev,
        timer: {
          running: false,
          paused: true,
          passMode: false,
          timeLeft: baseTime,
          startedAt: null,
        },
      };
      try {
        localStorage.setItem("quizState", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handlePass = () => {
    saveSnapshot("pass");
    clearInterval(timerRef.current);
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
        try {
          localStorage.setItem("quizState", JSON.stringify(nextState));
        } catch {}
        return nextState;
      });
    } else {
      setPassedTeams(newPassedTeams);
      setQuestionRevealed(true);
      // Auto-start pass timer (explicit)
      setQuizState((prev) => {
        const nextState = {
          ...prev,
          turn: nextTurn,
          timer: {
            running: true,
            paused: false,
            passMode: true,
            timeLeft: passOnTimer,
            startedAt: Date.now(), // ensures timer effect restarts
          },
        };
        try {
          localStorage.setItem("quizState", JSON.stringify(nextState));
        } catch {}
        return nextState;
      });
    }
  };

  const handleCorrect = () => {
    // Score: base/original team gets question.points (default 10); pass-on team gets 5
    saveSnapshot("correct");
    clearInterval(timerRef.current);
    const teamName = teamsToUse[turn];
    const basePts =
      typeof questionObj?.points === "number" ? questionObj.points : 10;
    const isPassOn = passedTeams.length > 0;
    const pts = isPassOn ? 5 : basePts;

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
          timeLeft: roundsMode ? (perRoundTimers[currentRoundIndex] ?? 30) : 30,
          startedAt: null,
        },
      };
      try {
        localStorage.setItem("quizState", JSON.stringify(nextState));
      } catch {}
      return nextState;
    });
  };

  const handleReveal = () => {
    saveSnapshot("reveal");
    clearInterval(timerRef.current);
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
      try {
        localStorage.setItem("quizState", JSON.stringify(nextState));
      } catch {}
      return nextState;
    });
  };

  const handleNext = () => {
    saveSnapshot("next-question");
    clearInterval(timerRef.current);
    setQuizState((prev) => ({
      ...prev,
      currentQuestion: (prev.currentQuestion || 0) + 1,
      turn: ((originalTurn || 0) + 1) % (teamsToUse.length || 1),
    }));
  };

  const handleOptionSelect = (idx) => {
    // Show the answer first; do NOT auto-advance; ALSO pause the timer immediately.
    if (!questionRevealed) {
      saveSnapshot("select-option-first-reveal");
      setQuestionRevealed(true);
    } else {
      saveSnapshot("select-option");
    }
    setSelectedOption(idx);
    setShowAnswer(true);
    // Pause timer when revealing via option click
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
      try {
        localStorage.setItem("quizState", JSON.stringify(nextState));
      } catch {}
      return nextState;
    });
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
    const derivedQs = deriveTieBreakerQuestions(tiedTeams.length);
    return (
      <>
        <TieBreakerIntro
          round="tie-intro"
          tiedTeams={tiedTeams}
          onStart={() => {
            saveSnapshot("start-legacy-tiebreaker");
            setQuizState((prev) => {
              const next = {
                ...prev,
                round: "tiebreaker",
                currentQuestion: 0,
                turn: 0,
                tieIntro: null,
                tiebreaker: derivedQs,
                aliveTeams: tiedTeams.length ? tiedTeams : prev.aliveTeams,
                tieBaseScores: Object.fromEntries(
                  (tiedTeams.length ? tiedTeams : prev.aliveTeams).map(
                    (t) => [t, prev.scores?.[t] || 0]
                  )
                ),
              };
              try {
                localStorage.setItem("quizState", JSON.stringify(next));
              } catch {}
              return next;
            });
          }}
        />
        {/* Password lock overlay if needed */}
        {quizState.started && quizState.round !== "finished" && showLock && !isUnlocked && (
          <PasswordLockModal
            onSubmit={handleLockSubmit}
            onCancel={handleLockCancel}
            error={lockError}
          />
        )}
      </>
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
    const derivedQs = deriveTieBreakerQuestions(tiedTeams.length);
    return (
      <>
        <TieBreakerIntro
          round="final-intro"
          tiedTeams={tiedTeams}
          onStart={() => {
            saveSnapshot("start-legacy-final");
            setQuizState((prev) => {
              const next = {
                ...prev,
                round: "final",
                currentQuestion: 0,
                turn: 0,
                tieIntro: null,
                finalTiebreaker: derivedQs,
                aliveTeams: tiedTeams.length ? tiedTeams : prev.aliveTeams,
                tieBaseScores: Object.fromEntries(
                  (tiedTeams.length ? tiedTeams : prev.aliveTeams).map(
                    (t) => [t, prev.scores?.[t] || 0]
                  )
                ),
              };
              try {
                localStorage.setItem("quizState", JSON.stringify(next));
              } catch {}
              return next;
            });
          }}
        />
        {quizState.started && quizState.round !== "finished" && showLock && !isUnlocked && (
          <PasswordLockModal
            onSubmit={handleLockSubmit}
            onCancel={handleLockCancel}
            error={lockError}
          />
        )}
      </>
    );
  }

  // Rounds-mode tie intro (after last selected round if tied)
  if (tieIntro === "rounds-tie") {
    const tiedTeams = quizState.roundsTieTeams || [];
    const derivedQs = deriveTieBreakerQuestions(tiedTeams.length);
    const tieRoundTime =
      tieData.timeLimitSeconds ??
      tieData.questions?.[0]?.timeLimitSeconds ??
      30;

    return (
      <>
        <TieBreakerIntro
          round="rounds-tie"
          tiedTeams={tiedTeams}
          onStart={() => {
            saveSnapshot("start-rounds-tiebreaker");
            setQuizState((prev) => {
              // check if tiebreaker round already exists
              const existingIndex = (prev.rounds || []).findIndex(
                (r) => r && r.id === "tiebreaker"
              );

              if (existingIndex >= 0) {
                // patch its questions to derived set
                const newRounds = [...prev.rounds];
                const existing = { ...(newRounds[existingIndex] || {}) };
                existing.questions = derivedQs;
                existing.title = existing.title || "Tie-Breaker Round";
                newRounds[existingIndex] = existing;

                const patchedPerRound = Array.isArray(
                  prev.timerSettings?.perRound
                )
                  ? [...prev.timerSettings.perRound]
                  : [];
                if (!patchedPerRound[existingIndex])
                  patchedPerRound[existingIndex] = tieRoundTime;

                const next = {
                  ...prev,
                  rounds: newRounds,
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
                try {
                  localStorage.setItem("quizState", JSON.stringify(next));
                } catch {}
                return next;
              }

              // append a new tie-breaker round with derived questions
              const newRounds = [
                ...(prev.rounds || []),
                {
                  ...(tieData || {}),
                  id: "tiebreaker",
                  title: (tieData && tieData.title) || "Tie-Breaker Round",
                  questions: derivedQs,
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
              try {
                localStorage.setItem("quizState", JSON.stringify(next));
              } catch {}
              return next;
            });
          }}
        />
        {quizState.started && quizState.round !== "finished" && showLock && !isUnlocked && (
          <PasswordLockModal
            onSubmit={handleLockSubmit}
            onCancel={handleLockCancel}
            error={lockError}
          />
        )}
      </>
    );
  }

  // Round complete screen (shows after each round reliably)
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
        <style>{injectedLayoutCSS}</style>
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
                    <span style={{ fontWeight: 700, marginRight: 10 }}>
                      {t.name} Score:
                    </span>
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

        {/* Password lock overlay if needed (quiz may be ongoing across overlays) */}
        {requireLockNow && showLock && !isUnlocked && (
          <PasswordLockModal
            onSubmit={handleLockSubmit}
            onCancel={handleLockCancel}
            error={lockError}
          />
        )}
      </div>
    );
  }

  // Continue after round-complete: advance or tie-breaker or finish
  function handleShowTieIntroAfterRoundComplete() {
    saveSnapshot("after-round-complete");
    setShowRoundCompleteScreen(false);

    if (roundsMode) {
      setQuizState((prev) => {
        const nextIndex = (prev.currentRoundIndex || 0) + 1;

        // All selected rounds finished
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
            const next = {
              ...prev,
              tieIntro: "rounds-tie",
              roundsTieTeams: tiedTeams,
            };
            try {
              localStorage.setItem("quizState", JSON.stringify(next));
            } catch {}
            return next;
          }

          // No tie -> finish and announce winners
          const winners = tiedTeams;
          const finishedState = {
            ...prev,
            round: "finished",
            currentRoundIndex: nextIndex,
            winnerTeams: winners,
            tieIntro: null,
          };
          try {
            localStorage.setItem("quizState", JSON.stringify(finishedState));
          } catch {}
          return finishedState;
        }

        // Move to next round
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
            paused: true, // keep paused until host starts
            passMode: false,
            startedAt: null,
          },
          tieIntro: null,
        };
        try {
          localStorage.setItem("quizState", JSON.stringify(next));
        } catch {}
        return next;
      });
    } else {
      // Legacy: show tie flow between non-rounds states
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
        try {
          localStorage.setItem("quizState", JSON.stringify(next));
        } catch {}
        return next;
      });
    }
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

    const quizTitle = "World Quality Day Quiz - 2025";
    const isShared = winnersToShow?.length > 1;
    const resultHeading = isShared ? "Shared Winners" : "Winner";
    const resultNames = isShared
      ? winnersToShow.join(" & ")
      : winnersToShow?.[0] || "No winner determined";

    return (
      <div className="container">
        <style>{injectedLayoutCSS}</style>
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

        {/* Password lock overlay if needed */}
        {requireLockNow && showLock && !isUnlocked && (
          <PasswordLockModal
            onSubmit={handleLockSubmit}
            onCancel={handleLockCancel}
            error={lockError}
          />
        )}
      </div>
    );
  }

  // Not started screen
  if (!started) {
    return (
      <div className="container" style={{ position: "relative" }}>
        <style>{injectedLayoutCSS}</style>
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

        {/* Password lock overlay if needed (only appears when quiz is ongoing or when Start is pressed without unlock) */}
        {requireLockNow && showLock && !isUnlocked && (
          <PasswordLockModal
            onSubmit={handleLockSubmit}
            onCancel={handleLockCancel}
            error={lockError}
          />
        )}
        {/* If user clicked Start and we showed lock instead, also show lock here (started still false). */}
        {!started && showLock && !isUnlocked && (
          <PasswordLockModal
            onSubmit={handleLockSubmit}
            onCancel={handleLockCancel}
            error={lockError}
          />
        )}

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
  const currentRoundNumberLabel = roundsMode
    ? `Round ${currentRoundIndex + 1}`
    : legacyRound.toUpperCase();

  // Prepare media (displayed below question text)
  const mediaStyle = {
    maxWidth: "100%",
    width: "100%",
    maxHeight: "55vh",
    borderRadius: 12,
    objectFit: "contain",
  };
  const questionMedia =
    isMediaUrl(questionObj?.question) &&
    renderMedia(questionObj?.question, mediaStyle, true);
  const explicitMedia =
    questionObj?.media && renderMedia(questionObj?.media, mediaStyle, true);
  const mediaBlock = explicitMedia || questionMedia;

  const totalQuestions = questions.length;
  const currentQNum = currentQuestion + 1;
  const isMultipleChoice =
    Array.isArray(questionObj?.options) && questionObj.options.length > 0;

  const optionButtonStyle = (i) => {
    const base = {
      padding: "0.8rem 1rem",
      borderRadius: 10,
      margin: "0",
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

  return (
    <div className="container" style={{ position: "relative" }}>
      <style>{injectedLayoutCSS}</style>

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
                    {i === 0 &&
                    teamObj.score === highestScore &&
                    highestScore > 0 ? (
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
          <div className={`question-box responsive-media-box qbox`}>
            {/* MAIN CONTENT AREA (scrolls inside if long) */}
            <div className="q-main">
              <div className="q-scroll">
                {/* Top: progress + question */}
                <div className="q-row">
                  <span className="question-progress">
                    {currentQNum}/{totalQuestions}
                  </span>
                  <div
                    className="question-main-text"
                    style={{ fontWeight: 800, marginTop: 4 }}
                  >
                    {questionObj?.question}
                  </div>
                </div>

                {/* Media below question (bigger, centered) */}
                {mediaBlock && (
                  <div className="q-media">
                    <div style={{ width: "100%", maxWidth: 1000 }}>
                      {mediaBlock}
                    </div>
                  </div>
                )}

                {/* Options below media */}
                {isMultipleChoice && (
                  <div className="q-row">
                    <div className="opts-grid">
                      {questionObj.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (!showAnswer) handleOptionSelect(i);
                          }}
                          disabled={showAnswer}
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
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM STATUS LINE (small, always spaced from content) */}
            <div className="q-status" aria-live="polite">
              {timeUp && !showAnswer ? (
                <div className="q-line warn">
                  Time&apos;s up! Please pass or reveal answer.
                </div>
              ) : showAnswer ? (
                <div className="q-line answer">
                  <b>Answer:</b>{" "}
                  <span>
                    {isMultipleChoice
                      ? (Array.isArray(questionObj?.options) &&
                        typeof questionObj?.answerIndex === "number"
                          ? questionObj.options[questionObj.answerIndex]
                          : "")
                      : questionObj?.answer || ""}
                  </span>
                </div>
              ) : (
                <div className="q-line" style={{ opacity: 0.0 }}>
                  &nbsp;
                </div>
              )}
            </div>
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
              // Host confirms correctness; awards based on pass/base rule
              handleCorrect();
            }}
            disabled={!questionRevealed}
          >
            Correct
          </button>
          <button className="control-btn red" onClick={handleReveal} disabled={showAnswer || !questionRevealed}>
            Reveal
          </button>
          <button className="control-btn" onClick={handleNext} disabled={!showAnswer}>
            Next Question
          </button>
        </div>

        {/* Hidden legacy answer box (answer shown in status line) */}
        {showAnswer && (
          <div className="answer-box" style={{ display: "none" }}>
            <b>Answer:</b>{" "}
            <span>
              {isMultipleChoice
                ? (Array.isArray(questionObj?.options) &&
                  typeof questionObj?.answerIndex === "number"
                    ? questionObj.options[questionObj.answerIndex]
                    : "")
                : questionObj?.answer}
            </span>
          </div>
        )}
      </div>

      {showConfetti && <ConfettiCelebration />}

      {/* Password lock overlay if needed */}
      {requireLockNow && showLock && !isUnlocked && (
        <PasswordLockModal
          onSubmit={handleLockSubmit}
          onCancel={handleLockCancel}
          error={lockError}
        />
      )}

      {showConfirmRestart && (
        <RestartModal
          onConfirm={handleRestartConfirm}
          onCancel={handleRestartCancel}
        />
      )}
    </div>
  );
}