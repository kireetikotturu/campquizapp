import React, { useEffect, useMemo, useState } from "react";
import round1Data from "../data/round1.json";
import round2Data from "../data/round2.json";
import round3Data from "../data/round3.json";
import round4Data from "../data/round4.json";
import round5Data from "../data/round5.json";
import "./SetupScreen.css";

const DEFAULT_NUM_TEAMS = 5;
const DEFAULT_TEAM_NAMES = ["Team A", "Team B", "Team C", "Team D", "Team E"];
const MIN_TEAMS = 2;
const MAX_TEAMS = 10;
const MIN_SECONDS = 5;
const MAX_SECONDS = 600;

// Defaults requested:
// - per-round base time: 30s for all rounds
// - pass-on time: 5s default
// - pass-on enabled: Round 1 = false by default; others = true
// - teams: 5 by default
export default function SetupScreen({ quizState, setQuizState }) {
  const availableRounds = [
    { id: "r1", title: round1Data.title || "Round 1", data: round1Data },
    { id: "r2", title: round2Data.title || "Round 2", data: round2Data },
    { id: "r3", title: round3Data.title || "Round 3", data: round3Data },
    { id: "r4", title: round4Data.title || "Round 4", data: round4Data },
    { id: "r5", title: round5Data.title || "Round 5", data: round5Data },
  ];

  // Number of teams (string so user can edit freely)
  const initialNum = quizState?.teams?.length ?? DEFAULT_NUM_TEAMS;
  const [numTeamsStr, setNumTeamsStr] = useState(String(initialNum));
  const [numTeams, setNumTeams] = useState(initialNum);
  const [numTeamsError, setNumTeamsError] = useState("");

  // Team names
  const initialNames = quizState?.teams?.length
    ? quizState.teams
    : DEFAULT_TEAM_NAMES.slice(0, initialNum);
  const [teamNames, setTeamNames] = useState(initialNames);

  // Selected rounds order (default all selected)
  const initialSelected = quizState?.rounds?.length
    ? quizState.rounds.map((r) => r.id || r.title || "")
    : availableRounds.map((r) => r.id);
  const [selectedOrder, setSelectedOrder] = useState(initialSelected);

  // Per-round settings (timeStr/time/passOn/passTimeStr/passTime/error)
  const defaultPerRound = availableRounds.reduce((acc, r, i) => {
    const prevPerRound = quizState?.timerSettings?.perRound;
    const prevMap = quizState?.timerSettings?.perRoundMap;
    const baseTime =
      (prevPerRound && typeof prevPerRound[i] === "number"
        ? prevPerRound[i]
        : 30);
    const fallbackPassTime =
      (prevMap && typeof prevMap?.[r.id]?.passTime === "number"
        ? prevMap?.[r.id]?.passTime
        : (typeof quizState?.timerSettings?.passOn === "number"
            ? quizState.timerSettings.passOn
            : 5));
    acc[r.id] = {
      timeStr: String(baseTime),
      time: baseTime,
      passOn:
        typeof prevMap?.[r.id]?.passOn === "boolean"
          ? prevMap[r.id].passOn
          : r.id !== "r1", // default: all except round1 are pass-on
      passTimeStr: String(fallbackPassTime),
      passTime: fallbackPassTime,
      error: "",
    };
    return acc;
  }, {});
  const [perRoundSettings, setPerRoundSettings] = useState(
    quizState?.timerSettings?.perRoundMap || defaultPerRound
  );

  // Keep teamNames length in sync with parsed numTeams
  useEffect(() => {
    setTeamNames((prev) => {
      if (prev.length === numTeams) return prev;
      if (prev.length > numTeams) return prev.slice(0, numTeams);
      const startIdx = prev.length;
      const added = Array.from(
        { length: numTeams - prev.length },
        (_, i) => `Team ${String.fromCharCode(65 + startIdx + i)}`
      );
      return [...prev, ...added];
    });
  }, [numTeams]);

  // Sync parsed numTeams while typing
  useEffect(() => {
    const n = Number(numTeamsStr);
    if (Number.isInteger(n) && n >= MIN_TEAMS && n <= MAX_TEAMS) {
      setNumTeams(n);
      setNumTeamsError("");
    }
  }, [numTeamsStr]);

  const clampNumber = (value, min, max, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback ?? min;
    return Math.max(min, Math.min(max, Math.round(n)));
  };

  const onNumTeamsInput = (val) => {
    setNumTeamsStr(val.replace(/[^\d]/g, ""));
    setNumTeamsError("");
  };

  const applyNumTeamsBlur = () => {
    const trimmed = numTeamsStr.trim();
    if (trimmed === "") {
      setNumTeamsStr(String(DEFAULT_NUM_TEAMS));
      setNumTeams(DEFAULT_NUM_TEAMS);
      setNumTeamsError("Empty input — reset to default");
      return;
    }
    const v = Number(trimmed);
    if (!Number.isInteger(v) || v < MIN_TEAMS || v > MAX_TEAMS) {
      const clamped = Math.max(
        MIN_TEAMS,
        Math.min(MAX_TEAMS, Math.round(v) || DEFAULT_NUM_TEAMS)
      );
      setNumTeamsStr(String(clamped));
      setNumTeams(clamped);
      setNumTeamsError(
        `Value must be integer between ${MIN_TEAMS} and ${MAX_TEAMS}. Reset to ${clamped}.`
      );
      return;
    }
    setNumTeams(v);
    setNumTeamsError("");
  };

  const changeNumTeams = (delta) => {
    const parsed = Number(numTeamsStr) || numTeams;
    const next = Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, parsed + delta));
    setNumTeamsStr(String(next));
    setNumTeams(next);
    setNumTeamsError("");
  };

  const onChangeTeamName = (index, value) => {
    setTeamNames((prev) => prev.map((t, i) => (i === index ? value : t)));
  };

  // Per-round handlers
  const onPerRoundTimeChange = (roundId, value) => {
    setPerRoundSettings((prev) => ({
      ...prev,
      [roundId]: {
        ...(prev[roundId] || {}),
        timeStr: value.replace(/[^\d]/g, ""),
        error: "",
      },
    }));
  };
  const onPerRoundTimeBlur = (roundId) => {
    const e = perRoundSettings[roundId] || {};
    const trimmed = String(e.timeStr ?? "").trim();
    if (trimmed === "") {
      setPerRoundSettings((prev) => ({
        ...prev,
        [roundId]: {
          ...(prev[roundId] || {}),
          timeStr: "30",
          time: 30,
          error: "Empty — reset to 30s",
        },
      }));
      return;
    }
    const v = Number(trimmed);
    if (!Number.isFinite(v) || v < MIN_SECONDS || v > MAX_SECONDS) {
      const clamped = Math.max(
        MIN_SECONDS,
        Math.min(MAX_SECONDS, Math.round(v) || 30)
      );
      setPerRoundSettings((prev) => ({
        ...prev,
        [roundId]: {
          ...(prev[roundId] || {}),
          timeStr: String(clamped),
          time: clamped,
          error: `Must be ${MIN_SECONDS}-${MAX_SECONDS}. Reset to ${clamped}s.`,
        },
      }));
      return;
    }
    setPerRoundSettings((prev) => ({
      ...prev,
      [roundId]: {
        ...(prev[roundId] || {}),
        timeStr: String(Math.round(v)),
        time: Math.round(v),
        error: "",
      },
    }));
  };
  const changePerRoundTimeBy = (roundId, delta) => {
    const entry = perRoundSettings[roundId] || {};
    const base = Number(entry.timeStr) || entry.time || 30;
    const next = Math.max(
      MIN_SECONDS,
      Math.min(MAX_SECONDS, Math.round(base + delta))
    );
    setPerRoundSettings((prev) => ({
      ...prev,
      [roundId]: {
        ...(prev[roundId] || {}),
        timeStr: String(next),
        time: next,
        error: "",
      },
    }));
  };

  const onPerRoundPassTimeChange = (roundId, value) => {
    setPerRoundSettings((prev) => ({
      ...prev,
      [roundId]: {
        ...(prev[roundId] || {}),
        passTimeStr: value.replace(/[^\d]/g, ""),
        error: "",
      },
    }));
  };
  const onPerRoundPassTimeBlur = (roundId) => {
    const entry = perRoundSettings[roundId] || {};
    const trimmed = String(entry.passTimeStr ?? "").trim();
    if (trimmed === "") {
      setPerRoundSettings((prev) => ({
        ...prev,
        [roundId]: {
          ...(prev[roundId] || {}),
          passTimeStr: "5",
          passTime: 5,
          error: "Empty — reset to 5s",
        },
      }));
      return;
    }
    const v = Number(trimmed);
    if (!Number.isFinite(v) || v < MIN_SECONDS || v > MAX_SECONDS) {
      const clamped = Math.max(
        MIN_SECONDS,
        Math.min(MAX_SECONDS, Math.round(v) || 5)
      );
      setPerRoundSettings((prev) => ({
        ...prev,
        [roundId]: {
          ...(prev[roundId] || {}),
          passTimeStr: String(clamped),
          passTime: clamped,
          error: `Pass-time must be ${MIN_SECONDS}-${MAX_SECONDS}. Reset to ${clamped}s.`,
        },
      }));
      return;
    }
    setPerRoundSettings((prev) => ({
      ...prev,
      [roundId]: {
        ...(prev[roundId] || {}),
        passTimeStr: String(Math.round(v)),
        passTime: Math.round(v),
        error: "",
      },
    }));
  };
  const changePerRoundPassTimeBy = (roundId, delta) => {
    const entry = perRoundSettings[roundId] || {};
    const base = Number(entry.passTimeStr) || entry.passTime || 5;
    const next = Math.max(
      MIN_SECONDS,
      Math.min(MAX_SECONDS, Math.round(base + delta))
    );
    setPerRoundSettings((prev) => ({
      ...prev,
      [roundId]: {
        ...(prev[roundId] || {}),
        passTimeStr: String(next),
        passTime: next,
        error: "",
      },
    }));
  };

  const togglePassOn = (roundId) => {
    setPerRoundSettings((prev) => ({
      ...prev,
      [roundId]: {
        ...(prev[roundId] || {}),
        passOn: !((prev[roundId] || {}).passOn),
      },
    }));
  };

  const toggleRound = (roundId) => {
    setSelectedOrder((prev) =>
      prev.includes(roundId)
        ? prev.filter((id) => id !== roundId)
        : [...prev, roundId]
    );
  };

  const moveRound = (roundId, dir) => {
    setSelectedOrder((prev) => {
      const idx = prev.indexOf(roundId);
      if (idx === -1) return prev;
      const newIdx = dir === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(newIdx, 0, item);
      return copy;
    });
  };

  const trimQuestionsForTeams = (roundObj, teamsCount) => {
    const arr = Array.isArray(roundObj.questions) ? roundObj.questions : [];
    const usableCount = Math.floor(arr.length / teamsCount) * teamsCount;
    return { ...roundObj, questions: arr.slice(0, usableCount) };
  };

  const applyAllBlurs = () => {
    const trimmed = numTeamsStr.trim();
    if (trimmed === "") {
      setNumTeamsStr(String(DEFAULT_NUM_TEAMS));
      setNumTeams(DEFAULT_NUM_TEAMS);
      setNumTeamsError("Empty input — reset to default");
    } else {
      const v = Number(trimmed);
      if (!Number.isInteger(v) || v < MIN_TEAMS || v > MAX_TEAMS) {
        const clamped = Math.max(
          MIN_TEAMS,
          Math.min(MAX_TEAMS, Math.round(v) || DEFAULT_NUM_TEAMS)
        );
        setNumTeamsStr(String(clamped));
        setNumTeams(clamped);
        setNumTeamsError(
          `Value must be integer between ${MIN_TEAMS} and ${MAX_TEAMS}. Reset to ${clamped}.`
        );
      } else {
        setNumTeams(v);
        setNumTeamsError("");
      }
    }

    for (const id of Object.keys(perRoundSettings)) {
      const e = perRoundSettings[id] || {};
      const tTrim = String(e.timeStr ?? "").trim();
      if (tTrim === "") {
        setPerRoundSettings((prev) => ({
          ...prev,
          [id]: {
            ...(prev[id] || {}),
            timeStr: "30",
            time: 30,
            error: "Empty — reset to 30s",
          },
        }));
      } else {
        const tv = Number(tTrim);
        if (!Number.isFinite(tv) || tv < MIN_SECONDS || tv > MAX_SECONDS) {
          const clamped = Math.max(
            MIN_SECONDS,
            Math.min(MAX_SECONDS, Math.round(tv) || 30)
          );
          setPerRoundSettings((prev) => ({
            ...prev,
            [id]: {
              ...(prev[id] || {}),
              timeStr: String(clamped),
              time: clamped,
              error: `Must be ${MIN_SECONDS}-${MAX_SECONDS}. Reset to ${clamped}s.`,
            },
          }));
        } else {
          setPerRoundSettings((prev) => ({
            ...prev,
            [id]: {
              ...(prev[id] || {}),
              timeStr: String(Math.round(tv)),
              time: Math.round(tv),
              error: "",
            },
          }));
        }
      }

      const pTrim = String(e.passTimeStr ?? "").trim();
      if (pTrim === "") {
        setPerRoundSettings((prev) => ({
          ...prev,
          [id]: {
            ...(prev[id] || {}),
            passTimeStr: "5",
            passTime: 5,
            error: "Empty — reset to 5s",
          },
        }));
      } else {
        const pv = Number(pTrim);
        if (!Number.isFinite(pv) || pv < MIN_SECONDS || pv > MAX_SECONDS) {
          const clamped = Math.max(
            MIN_SECONDS,
            Math.min(MAX_SECONDS, Math.round(pv) || 5)
          );
          setPerRoundSettings((prev) => ({
            ...prev,
            [id]: {
              ...(prev[id] || {}),
              passTimeStr: String(clamped),
              passTime: clamped,
              error: `Pass-time must be ${MIN_SECONDS}-${MAX_SECONDS}. Reset to ${clamped}s.`,
            },
          }));
        } else {
          setPerRoundSettings((prev) => ({
            ...prev,
            [id]: {
              ...(prev[id] || {}),
              passTimeStr: String(Math.round(pv)),
              passTime: Math.round(pv),
              error: "",
            },
          }));
        }
      }
    }
  };

  const isSetupValid = useMemo(() => {
    const roundsToCheck =
      selectedOrder && selectedOrder.length > 0
        ? selectedOrder
        : availableRounds.map((r) => r.id);
    if (!roundsToCheck || roundsToCheck.length === 0) return false;

    const parsedTeams = Number(numTeamsStr);
    if (
      !Number.isInteger(parsedTeams) ||
      parsedTeams < MIN_TEAMS ||
      parsedTeams > MAX_TEAMS
    )
      return false;

    if (teamNames.length < parsedTeams) return false;
    for (let i = 0; i < parsedTeams; i++) {
      if (!teamNames[i] || teamNames[i].trim().length === 0) return false;
    }

    for (const id of roundsToCheck) {
      const e = perRoundSettings[id];
      if (!e) continue;
      const t = Number(e.timeStr);
      const p = Number(e.passTimeStr);
      if (!Number.isFinite(t) || t < MIN_SECONDS || t > MAX_SECONDS)
        return false;
      if (!Number.isFinite(p) || p < MIN_SECONDS || p > MAX_SECONDS)
        return false;
    }

    return true;
  }, [selectedOrder, numTeamsStr, teamNames, perRoundSettings]);

  const handleStart = () => {
    applyAllBlurs();

    if (!isSetupValid) {
      alert("Please fix the highlighted fields (warnings shown).");
      return;
    }

    const parsedNumTeams = Number(numTeamsStr);

    const roundsToUse =
      selectedOrder && selectedOrder.length > 0
        ? selectedOrder
        : availableRounds.map((r) => r.id);

    const roundsArray = roundsToUse
      .map((idOrTitle) => {
        let base = availableRounds.find((r) => r.id === idOrTitle);
        if (!base) {
          base = availableRounds.find(
            (r) =>
              r.title === idOrTitle ||
              (r.title &&
                String(r.title).toLowerCase() ===
                  String(idOrTitle).toLowerCase())
          );
        }
        if (!base) return null;
        const settings = perRoundSettings[base.id] || {};
        const rcopy = {
          ...base.data,
          id: base.id,
          title: base.data?.title || base.title,
          pass_on:
            typeof settings.passOn !== "undefined"
              ? settings.passOn
              : base.data?.pass_on ?? false,
        };
        return trimQuestionsForTeams(rcopy, parsedNumTeams);
      })
      .filter(Boolean);

    const finalRounds =
      roundsArray.length > 0
        ? roundsArray
        : availableRounds.map((b) =>
            trimQuestionsForTeams(
              { ...b.data, id: b.id, title: b.data?.title || b.title },
              parsedNumTeams
            )
          );

    const perRoundArr = finalRounds.map(
      (r) =>
        clampNumber(
          perRoundSettings[r.id]?.timeStr ??
            perRoundSettings[r.id]?.time ??
            30,
          MIN_SECONDS,
          MAX_SECONDS,
          30
        )
    );

    const perRoundMap = {};
    finalRounds.forEach((r) => {
      const entry = perRoundSettings[r.id] || {};
      const time = clampNumber(
        entry.timeStr ?? entry.time ?? 30,
        MIN_SECONDS,
        MAX_SECONDS,
        30
      );
      const passOn = !!entry.passOn;
      const passTime = clampNumber(
        entry.passTimeStr ?? entry.passTime ?? 5,
        MIN_SECONDS,
        MAX_SECONDS,
        5
      );
      perRoundMap[r.id] = {
        timeStr: String(time),
        time,
        passOn,
        passTimeStr: String(passTime),
        passTime,
        error: "",
      };
    });

    // Keep a legacy global passOn seconds value (not used when perRoundMap provides passTime)
    const passOnVal = 5;

    const scoresInit = Object.fromEntries(
      teamNames
        .slice(0, parsedNumTeams)
        .map((t) => [t.trim(), (quizState?.scores?.[t.trim()] ?? 0)])
    );

    const initialTimer = {
      running: false,
      paused: true,
      passMode: false,
      timeLeft: perRoundArr[0] ?? 30,
      startedAt: null,
    };

    const next = {
      ...quizState,
      teams: teamNames.slice(0, parsedNumTeams).map((t) => t.trim()),
      aliveTeams: teamNames.slice(0, parsedNumTeams).map((t) => t.trim()),
      started: true, // start immediately
      currentQuestion: 0,
      currentRoundIndex: 0,
      rounds: finalRounds,
      scores: scoresInit,
      turn: 0,
      timer: initialTimer,
      timerSettings: { perRound: perRoundArr, passOn: passOnVal, perRoundMap },
      winnerTeams: [],
      tieIntro: null,
    };

    localStorage.setItem("quizState", JSON.stringify(next));
    setQuizState(next);
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h1 className="setup-title">Quiz Setup</h1>

        <div className="row">
          <div className="col">
            <label className="label">Number of Teams</label>
            <div className="number-control">
              <button
                className="num-btn"
                onClick={() => changeNumTeams(-1)}
                aria-label="Decrease teams"
              >
                −
              </button>
              <input
                className={`number-input ${numTeamsError ? "input-error" : ""}`}
                type="text"
                inputMode="numeric"
                value={numTeamsStr}
                onChange={(e) => onNumTeamsInput(e.target.value)}
                onBlur={applyNumTeamsBlur}
                aria-label="Number of teams"
              />
              <button
                className="num-btn"
                onClick={() => changeNumTeams(1)}
                aria-label="Increase teams"
              >
                +
              </button>
            </div>
            {numTeamsError ? (
              <div className="field-warning">⚠️ {numTeamsError}</div>
            ) : (
              <div className="help">
                Teams must be between {MIN_TEAMS} and {MAX_TEAMS}.
              </div>
            )}
          </div>

          <div className="col">
            <label className="label">Pass-time / Round settings</label>
            <div className="help">
              Each round below has editable time and pass-time. You can type or
              use +/- buttons. Default: Round 1 pass-on = false; others true.
              Pass time default = 5s.
            </div>
          </div>
        </div>

        <div className="section">
          <label className="subheading">Team Names</label>
          <div className="team-grid">
            {Array.from({ length: numTeams }).map((_, i) => (
              <div key={i} className="team-item">
                <label className="label tiny">
                  Team {String.fromCharCode(65 + i)}
                </label>
                <input
                  className="text-input"
                  value={teamNames[i] || ""}
                  onChange={(e) => onChangeTeamName(i, e.target.value)}
                  placeholder={`Team ${String.fromCharCode(65 + i)} name`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <label className="subheading">Available Rounds — select & reorder</label>
          <p className="help">
            Check rounds to include. Use ↑/↓ to reorder selected rounds. Edit
            time/pass-time by typing or using +/-.
          </p>

          <ul className="round-list">
            {availableRounds.map((r) => {
              const checked = selectedOrder.includes(r.id);
              const entry = perRoundSettings[r.id] || {};
              return (
                <li key={r.id} className="round-row">
                  <div className="round-left">
                    <label className="round-checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRound(r.id)}
                      />
                    </label>
                    <div className="round-info">
                      <div className="round-title">{r.title}</div>
                      <div className="round-desc">{r.data.description || ""}</div>
                    </div>
                  </div>

                  <div className="round-controls">
                    <div className="inline-field">
                      <label className="tiny">Time (s)</label>
                      <div className="small-number-control">
                        <button
                          className="small-num-btn"
                          onClick={() => changePerRoundTimeBy(r.id, -5)}
                        >
                          -
                        </button>
                        <input
                          className={`small-number ${
                            entry?.error ? "input-error" : ""
                          }`}
                          type="text"
                          inputMode="numeric"
                          value={entry?.timeStr ?? "30"}
                          onChange={(e) =>
                            onPerRoundTimeChange(r.id, e.target.value)
                          }
                          onBlur={() => onPerRoundTimeBlur(r.id)}
                        />
                        <button
                          className="small-num-btn"
                          onClick={() => changePerRoundTimeBy(r.id, +5)}
                        >
                          +
                        </button>
                      </div>
                      {entry?.error ? (
                        <div className="field-warning">⚠️ {entry.error}</div>
                      ) : null}
                    </div>

                    <div className="inline-field">
                      <label className="tiny">Pass-on</label>
                      <input
                        type="checkbox"
                        checked={!!entry?.passOn}
                        onChange={() => togglePassOn(r.id)}
                      />
                    </div>

                    <div className="inline-field">
                      <label className="tiny">Pass Time (s)</label>
                      <div className="small-number-control">
                        <button
                          className="small-num-btn"
                          onClick={() => changePerRoundPassTimeBy(r.id, -1)}
                        >
                          -
                        </button>
                        <input
                          className={`small-number ${
                            entry?.error ? "input-error" : ""
                          }`}
                          type="text"
                          inputMode="numeric"
                          value={entry?.passTimeStr ?? "5"}
                          onChange={(e) =>
                            onPerRoundPassTimeChange(r.id, e.target.value)
                          }
                          onBlur={() => onPerRoundPassTimeBlur(r.id)}
                        />
                        <button
                          className="small-num-btn"
                          onClick={() => changePerRoundPassTimeBy(r.id, +1)}
                        >
                          +
                        </button>
                      </div>
                      {entry?.error ? (
                        <div className="field-warning">⚠️ {entry.error}</div>
                      ) : null}
                    </div>

                    <div className="reorder">
                      <button
                        className="icon-btn"
                        onClick={() => moveRound(r.id, "up")}
                        aria-label={`Move ${r.title} up`}
                      >
                        ↑
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => moveRound(r.id, "down")}
                        aria-label={`Move ${r.title} down`}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="actions">
          <button className="start-btn" onClick={handleStart} disabled={!isSetupValid}>
            Save & Start Setup
          </button>
        </div>
      </div>
    </div>
  );
}