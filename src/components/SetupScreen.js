import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import questionsData from "../data/questions.json";
import tiebreakerData from "../data/tiebreaker.json";
import finalTiebreakerData from "../data/finaltiebreaker.json";

const Container = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  justify-content: center;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin-bottom: 2rem;
  background: linear-gradient(90deg, #5f2c82 0%, #49a09d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const TeamInput = styled.input`
  padding: 0.7rem 1rem;
  font-size: 1.1rem;
  border-radius: 8px;
  border: 1px solid #b2bec3;
  margin-bottom: 1rem;
  width: 250px;
  transition: box-shadow 0.2s;
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px #49a09d33;
  }
`;

const Button = styled.button`
  padding: 0.8rem 2rem;
  border: none;
  background: linear-gradient(90deg, #5f2c82, #49a09d);
  color: #fff;
  border-radius: 8px;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1.5rem;
  transition: background 0.2s;
  &:hover {
    background: linear-gradient(90deg, #49a09d, #5f2c82);
  }
`;

const DEFAULT_NUM_TEAMS = 5;
const DEFAULT_TEAM_NAMES = ["Team A", "Team B", "Team C", "Team D", "Team E"];

function SetupScreen({ quizState, setQuizState }) {
  const [numTeams, setNumTeams] = useState(
    quizState.teams && quizState.teams.length
      ? quizState.teams.length
      : DEFAULT_NUM_TEAMS
  );
  const [teamNames, setTeamNames] = useState(
    quizState.teams && quizState.teams.length
      ? quizState.teams
      : DEFAULT_TEAM_NAMES.slice(0, DEFAULT_NUM_TEAMS)
  );

  const handleNumTeamsChange = (e) => {
    const value = Math.max(2, Math.min(10, Number(e.target.value)));
    setNumTeams(value);
    setTeamNames((prev) =>
      prev.length > value
        ? prev.slice(0, value)
        : [
            ...prev,
            ...Array(value - prev.length)
              .fill("")
              .map((_, i) => `Team ${String.fromCharCode(65 + prev.length + i)}`),
          ]
    );
  };

  const handleTeamNameChange = (i, val) => {
    setTeamNames((prev) => prev.map((name, idx) => (idx === i ? val : name)));
  };

  const canStart = teamNames.every((name) => name.trim().length > 0);

  const trimQuestions = (arr, numTeams) => {
    const usableCount = Math.floor(arr.length / numTeams) * numTeams;
    return arr.slice(0, usableCount);
  };

  const handleStartQuiz = () => {
    const teamsArr = teamNames.map((name) => name.trim());

    const mainQuestions = trimQuestions(questionsData, numTeams);
    const tieQuestions = trimQuestions(tiebreakerData, numTeams);
    const finalTieQuestions = trimQuestions(finalTiebreakerData, numTeams);

    setQuizState({
      ...quizState,
      teams: teamsArr,
      aliveTeams: teamsArr,
      started: true,
      scores: Object.fromEntries(teamsArr.map((name) => [name, 0])),
      currentQuestion: 0,
      turn: 0,
      round: "main",
      timer: { running: false, timeLeft: 30, paused: false },
      winnerTeams: [],
      questions: mainQuestions,
      tiebreaker: tieQuestions,
      finalTiebreaker: finalTieQuestions,
    });
  };

  return (
    <Container
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Title>Office Live Quiz Setup</Title>
      <label>
        <b>Number of Teams (2–10):</b>
        <TeamInput
          type="number"
          min={2}
          max={10}
          value={numTeams}
          onChange={handleNumTeamsChange}
        />
      </label>
      <div style={{ margin: "1rem 0", width: "100%" }}>
        {Array.from({ length: numTeams }, (_, i) => (
          <TeamInput
            key={i}
            type="text"
            value={teamNames[i] || ""}
            placeholder={`Team ${String.fromCharCode(65 + i)} Name`}
            onChange={(e) => handleTeamNameChange(i, e.target.value)}
            style={{ display: "block", margin: "0 auto 1rem auto" }}
          />
        ))}
      </div>
      {canStart && <Button onClick={handleStartQuiz}>Start Quiz</Button>}
    </Container>
  );
}

export default SetupScreen;
