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
  justify-content: center;
  min-height: 100vh;
  padding: 2rem 1rem;
  background: linear-gradient(120deg, #f5f7fa, #e0eafc 100%);
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  margin-bottom: 2rem;
  background: linear-gradient(90deg, #5f2c82 0%, #49a09d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;

  @media (max-width: 600px) {
    font-size: 1.9rem;
    margin-bottom: 1.5rem;
  }
`;

const Label = styled.label`
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 0.6rem;
  text-align: center;

  @media (max-width: 600px) {
    font-size: 1rem;
  }
`;

const TeamInput = styled.input`
  padding: 0.8rem 1rem;
  font-size: 1.05rem;
  border-radius: 10px;
  border: 1px solid #b2bec3;
  margin-bottom: 1rem;
  width: 260px;
  max-width: 90%;
  transition: box-shadow 0.2s, transform 0.15s;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px #49a09d33;
    transform: scale(1.02);
  }

  @media (max-width: 600px) {
    width: 90%;
    font-size: 1rem;
    padding: 0.7rem 0.9rem;
  }
`;

const Button = styled.button`
  padding: 0.9rem 2.3rem;
  border: none;
  background: linear-gradient(90deg, #5f2c82, #49a09d);
  color: #fff;
  border-radius: 10px;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 1.8rem;
  box-shadow: 0 3px 10px rgba(79, 209, 197, 0.25);
  transition: background 0.25s, transform 0.15s, box-shadow 0.15s;

  &:hover {
    background: linear-gradient(90deg, #49a09d, #5f2c82);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(79, 209, 197, 0.35);
  }

  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 600px) {
    width: 90%;
    font-size: 1.05rem;
    padding: 0.8rem 0;
  }
`;

const DEFAULT_NUM_TEAMS = 5;
const DEFAULT_TEAM_NAMES = ["Team A", "Team B", "Team C", "Team D", "Team E"];

function SetupScreen({ quizState, setQuizState }) {
  const [numTeams, setNumTeams] = useState(
    quizState.teams?.length || DEFAULT_NUM_TEAMS
  );
  const [teamNames, setTeamNames] = useState(
    quizState.teams?.length
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

      <Label>Number of Teams (2–10):</Label>
      <TeamInput
        type="number"
        min={2}
        max={10}
        value={numTeams}
        onChange={handleNumTeamsChange}
      />

      <div style={{ margin: "1rem 0", width: "100%", textAlign: "center" }}>
        {Array.from({ length: numTeams }, (_, i) => (
          <TeamInput
            key={i}
            type="text"
            value={teamNames[i] || ""}
            placeholder={`Team ${String.fromCharCode(65 + i)} Name`}
            onChange={(e) => handleTeamNameChange(i, e.target.value)}
          />
        ))}
      </div>

      {canStart && <Button onClick={handleStartQuiz}>Start Quiz</Button>}
    </Container>
  );
}

export default SetupScreen;
