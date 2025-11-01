import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CircularTimer from "./CircularTimer";
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

// TieBreakerIntro: page listing tied teams and a button to start tie-breaker
function TieBreakerIntro({ round, tiedTeams, onStart }) {
  let roundLabel = "Tie-Breaker Round";
  if (round === "final-intro") roundLabel = "Final Tie-Breaker Round";
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

// Confetti (existing)
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

// Restart modal (existing)
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

function QuizScreen({ quizState, setQuizState }) {
  const {
    teams,
    scores,
    turn,
    currentQuestion,
    timer,
    started,
    round = "main",
    aliveTeams = teams,
    winnerTeams = [],
    tieIntro = null,
  } = quizState;

  const teamsToUse = round === "main" ? teams : aliveTeams;

  const [questions, setQuestions] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [passedTeams, setPassedTeams] = useState([]);
  const [originalTurn, setOriginalTurn] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [questionRevealed, setQuestionRevealed] = useState(false);
  const [showRoundCompleteScreen, setShowRoundCompleteScreen] = useState(false);
  const [showConfirmRestart, setShowConfirmRestart] = useState(false); // NEW
  const timerRef = useRef();
  const isFirstMount = useRef(true);

  // Use the trimmed arrays from quizState (set in SetupScreen) — fallback to empty arrays
  useEffect(() => {
    if (round === "main") setQuestions(quizState.questions ?? []);
    else if (round === "tiebreaker") setQuestions(quizState.tiebreaker ?? []);
    else if (round === "final")
      setQuestions(quizState.finalTiebreaker ?? []);
    else setQuestions([]);
  }, [round, quizState]);

  // Show round complete screen when we've reached the end of the trimmed questions for this round
  useEffect(() => {
    if (!started) return;
    const qLen = questions.length;
    if (
      (round === "main" || round === "tiebreaker" || round === "final") &&
      qLen > 0 &&
      currentQuestion >= qLen &&
      !showRoundCompleteScreen &&
      !quizState.tieIntro &&
      quizState.round !== "finished"
    ) {
      setShowRoundCompleteScreen(true);
    }
  }, [
    currentQuestion,
    round,
    started,
    questions,
    showRoundCompleteScreen,
    quizState.tieIntro,
    quizState.round,
  ]);

  const handleShowTieIntroAfterRoundComplete = () => {
    setShowRoundCompleteScreen(false);
    setQuizState((prev) => {
      const next = {
        ...prev,
        tieIntro:
          round === "main" ? "tie" : round === "tiebreaker" ? "final" : null,
      };
      localStorage.setItem("quizState", JSON.stringify(next));
      return next;
    });
  };

  function pausedTime(timerObj) {
    if (!timerObj) return 30;
    if (timerObj.running && timerObj.startedAt) {
      const elapsed = Math.floor((Date.now() - timerObj.startedAt) / 1000);
      return Math.max(
        0,
        (timerObj.timeLeft ?? (timerObj.passMode ? 15 : 30)) - elapsed
      );
    }
    return timerObj.timeLeft ?? (timerObj.passMode ? 15 : 30);
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
  }, []);

  useEffect(() => {
    setShowAnswer(false);
    setPassedTeams([]);
    setOriginalTurn(turn);
    setTimeUp(false);
    setQuestionRevealed(false);
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
  }, [currentQuestion, started, round]);

  useEffect(() => {
    if (!started || !questionRevealed) return;
    setQuizState((prev) => {
      const next = {
        ...prev,
        timer: {
          running: true,
          paused: false,
          passMode: passedTeams.length !== 0,
          timeLeft: passedTeams.length !== 0 ? 15 : 30,
          startedAt: Date.now(),
        },
      };
      localStorage.setItem("quizState", JSON.stringify(next));
      return next;
    });
  }, [questionRevealed, started]);

  useEffect(() => {
    if (!started || !timer?.running || timer.paused || showAnswer) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setQuizState((prevState) => {
        let tl = prevState.timer.timeLeft - 1;
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

  // roundFinished uses the actual trimmed questions length
  const roundFinished = started && currentQuestion >= questions.length;

  useEffect(() => {
    if (!roundFinished) return;
    if (quizState.round === "finished") return;
    if (quizState.tieIntro) return;
    const scoringTeams =
      quizState.aliveTeams && quizState.aliveTeams.length
        ? quizState.aliveTeams
        : quizState.teams;
    const questionLen = questions.length;
    if (currentQuestion < questionLen) return;
    const aliveScores = scoringTeams.map((team) => scores[team] || 0);
    const maxScore = Math.max(...aliveScores);
    const tiedTeams = scoringTeams.filter(
      (team) => (scores[team] || 0) === maxScore
    );
    if (tiedTeams.length > 1) {
      if (round === "main") {
        // handled by round complete + tie intro flow
      } else if (round === "tiebreaker") {
        // handled by round complete + tie intro flow
      } else {
        const next = {
          ...quizState,
          round: "finished",
          winnerTeams: tiedTeams,
          tieIntro: null,
        };
        localStorage.setItem("quizState", JSON.stringify(next));
        setQuizState(next);
      }
    } else {
      const next = {
        ...quizState,
        round: "finished",
        winnerTeams: tiedTeams,
        tieIntro: null,
      };
      localStorage.setItem("quizState", JSON.stringify(next));
      setQuizState(next);
    }
  }, [roundFinished]);

  const leaderboard = useMemo(() => {
    const arr = teamsToUse.map((team) => ({
      name: team,
      score: scores[team] || 0,
      origIdx: teamsToUse.indexOf(team),
    }));
    arr.sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.origIdx - b.origIdx
    );
    return arr;
  }, [teamsToUse, scores]);
  const highestScore = leaderboard.length > 0 ? leaderboard[0].score : 0;

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

  // --- NEW: Safe restart with confirmation modal
  const handleRestartSafe = () => setShowConfirmRestart(true);
  const handleRestartCancel = () => setShowConfirmRestart(false);
  const handleRestartConfirm = () => {
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
    });
  };

  const handleGoHome = () => {
    // Navigate to Setup screen — keep team names but reset quiz progress
    setQuizState((prev) => {
      const next = {
        ...prev,
        started: false,
        currentQuestion: 0,
        turn: 0,
        round: "main",
        timer: {
          running: false,
          timeLeft: 30,
          paused: false,
          passMode: false,
          startedAt: null,
        },
        aliveTeams: prev.teams || [],
        scores: prev.scores || Object.fromEntries((prev.teams || []).map(t => [t, 0])),
        winnerTeams: [],
        tieIntro: null,
      };
      localStorage.setItem("quizState", JSON.stringify(next));
      return next;
    });
  };

  const handleStartQuiz = () => {
    setQuizState((prev) => {
      const nextState = {
        ...prev,
        started: true,
      };
      localStorage.setItem("quizState", JSON.stringify(nextState));
      return nextState;
    });
  };

  const handleStartQuestion = () => {
    setQuestionRevealed(true);
  };

  const handlePass = () => {
    const totalTeams = teamsToUse.length;
    let nextTurn = turn;
    let attempts = 0;
    let newPassedTeams = [...passedTeams, turn];
    while (attempts < totalTeams) {
      nextTurn = (nextTurn + 1) % totalTeams;
      if (nextTurn !== originalTurn && !newPassedTeams.includes(nextTurn)) break;
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
            timeLeft: 15,
            startedAt: Date.now(),
          },
        };
        localStorage.setItem("quizState", JSON.stringify(nextState));
        return nextState;
      });
    }
  };

  const handleCorrect = () => {
    const teamName = teamsToUse[turn];
    setQuizState((prev) => {
      const newScores = {
        ...prev.scores,
        [teamName]: (prev.scores[teamName] || 0) + 10,
      };
      const nextTurn = (originalTurn + 1) % teamsToUse.length;
      const nextState = {
        ...prev,
        scores: newScores,
        currentQuestion: prev.currentQuestion + 1,
        turn: nextTurn,
        timer: {
          running: false,
          paused: true,
          passMode: false,
          timeLeft: 30,
          startedAt: null,
        },
      };
      localStorage.setItem("quizState", JSON.stringify(nextState));
      return nextState;
    });
  };

  const handleReveal = () => {
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
  };

  const handleNext = () => {
    setQuizState((prev) => ({
      ...prev,
      currentQuestion: prev.currentQuestion + 1,
      turn: (originalTurn + 1) % teamsToUse.length,
    }));
  };

  const startTieBreakerRound = () => {
    const scoringTeams = quizState.aliveTeams && quizState.aliveTeams.length
      ? quizState.aliveTeams
      : quizState.teams;
    const scoresObj = quizState.scores;
    const maxScore = Math.max(...scoringTeams.map((team) => scoresObj[team] || 0));
    const tiedTeams = scoringTeams.filter((team) => (scoresObj[team] || 0) === maxScore);

    setQuizState((prev) => {
      const next = {
        ...prev,
        round: "tiebreaker",
        currentQuestion: 0,
        scores: Object.fromEntries(tiedTeams.map((t) => [t, 0])),
        aliveTeams: tiedTeams,
        turn: 0,
        timer: {
          running: false,
          timeLeft: 30,
          paused: false,
          passMode: false,
          startedAt: null,
        },
        tieIntro: null,
      };
      localStorage.setItem("quizState", JSON.stringify(next));
      return next;
    });
  };
  const startFinalTieBreakerRound = () => {
    const scoringTeams = quizState.aliveTeams && quizState.aliveTeams.length
      ? quizState.aliveTeams
      : quizState.teams;
    const scoresObj = quizState.scores;
    const maxScore = Math.max(...scoringTeams.map((team) => scoresObj[team] || 0));
    const tiedTeams = scoringTeams.filter((team) => (scoresObj[team] || 0) === maxScore);

    setQuizState((prev) => {
      const next = {
        ...prev,
        round: "final",
        currentQuestion: 0,
        scores: Object.fromEntries(tiedTeams.map((t) => [t, 0])),
        aliveTeams: tiedTeams,
        turn: 0,
        timer: {
          running: false,
          timeLeft: 30,
          paused: false,
          passMode: false,
          startedAt: null,
        },
        tieIntro: null,
      };
      localStorage.setItem("quizState", JSON.stringify(next));
      return next;
    });
  };

  const timerDanger =
    (timer?.timeLeft ?? 0) / (timer?.passMode ? 15 : 30) <= 0.2;

  const questionObj = questions[currentQuestion];
  const quizFinished = round === "finished";

  const [showConfetti, setShowConfetti] = useState(false);
  useEffect(() => {
    if (quizFinished) {
      setShowConfetti(true);
    } else {
      setShowConfetti(false);
    }
  }, [quizFinished]);

  if (quizState.tieIntro === "tie") {
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
        onStart={startTieBreakerRound}
      />
    );
  }
  if (quizState.tieIntro === "final") {
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
        onStart={startFinalTieBreakerRound}
      />
    );
  }

  if (showRoundCompleteScreen) {
    let roundCompleteTitle = "Main Round Complete!";
    if (round === "tiebreaker") roundCompleteTitle = "Tie-Breaker Round Complete!";
    if (round === "final") roundCompleteTitle = "Final Round Complete!";
    return (
      <div className="container">
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
              <CircularTimer value={0} max={30} paused={true} onClick={() => {}} style={{ opacity: 0 }} />
            </div>
          </div>
          <div className="leaderboard-container">
            <h2 className="leaderboard-title">Leaderboard</h2>
            <ul className="team-list">
              {leaderboard.map((teamObj) => (
                <li className="team-item" key={teamObj.name}>
                  <span>{teamObj.name}</span>
                  <span>
                    {teamObj.score}
                    {teamObj.score === highestScore && highestScore > 0 ? (
                      <span className="trophy" title="Top Team">
                        🏆
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="right-panel">
          <div className="round-complete-card">
            <div className="round-complete-title">{roundCompleteTitle}</div>
            <div className="round-complete-msg">
              The round has ended!
              <br />
              Click below to see Results.
            </div>
            <button
              className="round-complete-next-btn"
              onClick={handleShowTieIntroAfterRoundComplete}
            >
              Next
            </button>
          </div>
        </div>
        {showConfirmRestart && (
          <RestartModal onConfirm={handleRestartConfirm} onCancel={handleRestartCancel} />
        )}
      </div>
    );
  }

  if (quizFinished) {
    // === NEW: Winner display in LEFT panel (centered) + Home button in right panel ===
    return (
      <div className="container">
        {showConfetti && <ConfettiCelebration />}
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
              <CircularTimer value={0} max={30} paused={true} onClick={() => {}} style={{ opacity: 0 }} />
            </div>
          </div>

          {/* winner-display replaces the usual leaderboard on the finished screen */}
          <div className="leaderboard-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "220px" }}>
            <div className="winner-display" role="status" aria-live="polite">
              <div className="winner-shine" />
              <div className="trophy-pop" aria-hidden="true">🏆</div>
              <div className="winner-text" style={{ zIndex: 2 }}>
                {winnerTeams?.length > 1
                  ? `🎉 Shared Victory: ${winnerTeams.join(" & ")}!`
                  : `🏆 ${winnerTeams[0]} Wins!`}
              </div>

              {/* Confetti float (CSS-based floating particles) */}
              <div className="confetti-float" aria-hidden="true">
                {Array.from({ length: 25 }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      "--color": [
                        "#ffe066",
                        "#43e97b",
                        "#f85032",
                        "#5f2c82",
                        "#49a09d",
                      ][Math.floor(Math.random() * 5)],
                      left: `${Math.random() * 100}%`,
                      // random start
                      animationDelay: `${Math.random() * 2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="right-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h2 className="right-title">Quiz Finished</h2>

          {/* Right panel results summary + actions */}
          {winnerTeams?.length > 1 ? (
            <div
              style={{
                margin: "1.5rem 0",
                textAlign: "center",
                color: "#e73827",
                fontSize: "1.2rem",
                fontWeight: 800,
                animation: "popFadeIn 1.5s",
              }}
            >
              Shared Victory 🎉
              <br />
              Teams: {winnerTeams.join(", ")}
            </div>
          ) : (
            <div
              style={{
                margin: "1.5rem 0",
                textAlign: "center",
                color: "#43ad36",
                fontSize: "1.4rem",
                fontWeight: 900,
                animation: "popFadeIn 1.5s",
              }}
            >
              Winner: {winnerTeams[0]} 🏆
            </div>
          )}

          {/* Action buttons: Home (go to Setup), or Restart */}
          <div style={{ display: "flex", gap: "0.9rem", marginTop: "1.2rem" }}>
            <button
              className="round-complete-next-btn"
              onClick={handleGoHome}
              title="Go to Setup"
            >
              Home
            </button>

            <button
              className="round-complete-next-btn"
              onClick={() => {
                // Keep behavior of restarting the quiz entirely (clear localStorage)
                handleRestartConfirm();
              }}
              style={{ background: "linear-gradient(90deg,#5f2c82 0%, #49a09d 100%)", color: "#fff" }}
            >
              Restart
            </button>
          </div>
        </div>

        {showConfirmRestart && (
          <RestartModal onConfirm={handleRestartConfirm} onCancel={handleRestartCancel} />
        )}
      </div>
    );
  }

  if (!started) {
    return (
      <div className="container" style={{ position: "relative" }}>
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
              <CircularTimer value={0} max={30} paused={true} onClick={() => {}} style={{ opacity: 0 }} />
            </div>
          </div>
          <div className="leaderboard-container">
            <h2 className="leaderboard-title">Leaderboard</h2>
            <ul className="team-list">
              <AnimatePresence>
                {leaderboard.map((teamObj) => (
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
                    className="team-item"
                    style={{
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
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
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
          <RestartModal onConfirm={handleRestartConfirm} onCancel={handleRestartCancel} />
        )}
      </div>
    );
  }

  // --- Quiz Running Screen ---
  let roundTitle = "Quiz";
  if (round === "tiebreaker") roundTitle = "Tie-Breaker Round";
  if (round === "final") roundTitle = "Final Tie-Breaker Round";

  const questionMedia =
    isMediaUrl(questionObj?.question) &&
    renderMedia(questionObj?.question, {}, true);
  const explicitMedia =
    questionObj?.media && renderMedia(questionObj.media, {}, true);

  return (
    <div className="container" style={{ position: "relative" }}>
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
            {questionRevealed ? (
              <CircularTimer
                value={timer?.timeLeft ?? 0}
                max={timer?.passMode ? 15 : 30}
                paused={timer?.paused || false}
                onClick={handlePausePlay}
              />
            ) : (
              <CircularTimer value={0} max={30} paused={true} onClick={() => {}} style={{ opacity: 0 }} />
            )}
          </div>
        </div>
        <div className="leaderboard-container">
          <h2 className="leaderboard-title">Leaderboard</h2>
          <ul className="team-list">
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
                  className={`team-item${teamsToUse[turn] === teamObj.name ? " highlight" : ""}`}
                  style={{
                    minHeight: "3.6em",
                    fontWeight: "650",
                    fontSize: "1.16rem",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: "650", color: "#5F2F83" }}>{teamObj.name}</span>
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
        <div className="quiz-header-row">
          <h2
            className="right-title"
            style={{
              marginBottom: 0,
              textAlign: "left",
              flex: 1,
              fontSize: "1.45rem",
              minHeight: "2.1em",
              display: "flex",
              alignItems: "center",
            }}
          >
            {roundTitle}{" "}
            {teamsToUse[turn] && (
              <span style={{ fontWeight: 400, fontSize: "1.09em", marginLeft: 12 }}>
                - Question for {teamsToUse[turn]}
              </span>
            )}
          </h2>
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
            <span style={{ width: "100%", marginBottom: "6px", textAlign: "center" }}>
              {questionObj?.question}
            </span>
            {questionMedia}
            {explicitMedia}
            {timeUp && !showAnswer && (
              <div className="timeup-msg">Time's up! Please pass or reveal answer.</div>
            )}
          </div>
        )}
        <div className="button-row">
          <button className="control-btn" onClick={handlePass} disabled={showAnswer || !questionRevealed}>
            Pass
          </button>
          <button className="control-btn green" onClick={handleCorrect} disabled={showAnswer || !questionRevealed}>
            Correct
          </button>
          <button className="control-btn red" onClick={handleReveal} disabled={showAnswer || !questionRevealed}>
            Reveal
          </button>
          <button className="control-btn" onClick={handleNext} disabled={!showAnswer}>
            Next Question
          </button>
        </div>
        {showAnswer && (
          <div className="answer-box" style={{ width: "100%", textAlign: "center" }}>
            <b>Answer:</b>{" "}
            <span>
              {questionObj?.answer}
              {!isMediaUrl(questionObj?.question) &&
                isMediaUrl(questionObj?.answer) &&
                renderMedia(questionObj?.answer, { maxHeight: 140 })}
            </span>
          </div>
        )}
      </div>
      {showConfetti && <ConfettiCelebration />}
      {showConfirmRestart && (
        <RestartModal onConfirm={handleRestartConfirm} onCancel={handleRestartCancel} />
      )}
    </div>
  );
}

export default QuizScreen;
