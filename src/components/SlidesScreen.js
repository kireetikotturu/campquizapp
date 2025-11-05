import React, { useEffect, useMemo, useState, useCallback } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";

/*
  SlidesScreen (updated)
  - Full viewport slides (100vw x 100vh)
  - Single top-left Back button (no bottom Back)
  - Bottom-center Next button (transparent / subtle)
  - Title slides centered; Rules & Rounds content centered vertically but text is left-aligned for readable line-by-line layout
  - Keyboard navigation supported
  - Final Next persists slidesSeen: true and navigates to Setup (App reads slidesSeen)
*/

const Fullscreen = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  background: #000;
  z-index: 9999;
  overscroll-behavior: none;
`;

const SlideFrame = styled(motion.div)`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
  background: #fff;
`;

/* full-bleed image background */
const FullBg = styled(motion.div)`
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  will-change: transform, opacity;
  z-index: 0;
`;

/* centered overlay container */
const Content = styled(motion.div)`
  position: relative;
  z-index: 4;
  width: min(1400px, 94vw);
  max-width: 1400px;
  margin: 0 auto;
  padding: clamp(20px, 4vw, 60px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center; /* center horizontally */
  justify-content: center; /* center vertically */
  text-align: center;
  height: 100vh;
`;

/* responsive large title/subtitle */
const BigTitle = styled(motion.h1)`
  margin: 0;
  font-weight: 900;
  color: #071033;
  font-size: clamp(28px, 6.5vw, 64px);
  line-height: 1;
  letter-spacing: -0.02em;
`;

const BigSubtitle = styled(motion.h2)`
  margin: 0;
  color: #243444;
  font-weight: 700;
  font-size: clamp(16px, 2.4vw, 22px);
  opacity: 0.95;
  margin-top: 12px;
`;

/* Rules: centered container, left-aligned lines for readability */
const RulesWrapper = styled.div`
  width: min(960px, 86vw);
  margin-top: clamp(18px, 2.6vw, 28px);
  display: flex;
  align-items: center;
  justify-content: center;
`;
const RulesList = styled(motion.ol)`
  margin: 0;
  padding-left: 1.1rem;
  text-align: left; /* ensure line-by-line left alignment */
  width: 100%;
  color: #0b2540;
  font-size: clamp(16px, 1.9vw, 20px);
  line-height: 1.9;
  font-weight: 700;
  list-style-position: inside;
`;

const RuleItem = styled.li`
  margin: 0.6rem 0;
`;

/* Rounds: similar style (left-aligned items inside a centered block) */
const RoundsWrapper = styled.div`
  width: min(960px, 86vw);
  margin-top: clamp(18px, 2.6vw, 28px);
  display: flex;
  align-items: center;
  justify-content: center;
`;
const RoundsList = styled(motion.ul)`
  margin: 0;
  padding: 0;
  width: 100%;
  text-align: left; /* left-aligned lines */
  color: #0b2540;
  font-size: clamp(16px, 1.9vw, 20px);
  line-height: 1.85;
  font-weight: 700;
  list-style: none;
`;

const RoundItem = styled.li`
  padding: 0.45rem 0;
`;

/* Top-left single Back button */
const TopLeftBack = styled.button`
  position: fixed;
  top: 18px;
  left: 18px;
  z-index: 50;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(2,6,23,0.06);
  padding: 10px 12px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(2,6,23,0.06);
`;

/* Bottom-center Next button (transparent / subtle visual) */
const Controls = styled.div`
  position: fixed;
  bottom: clamp(18px, 3vh, 36px);
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: 50;
  pointer-events: none;
`;

const NextBtn = styled.button`
  pointer-events: auto;
  min-width: 160px;
  padding: 12px 22px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.18);
  background: transparent; /* transparent style as requested */
  color: ${(p) => (p.onImage ? "white" : "#071033")};
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.02em;
  box-shadow: ${(p) =>
    p.onImage ? "0 10px 30px rgba(95,44,130,0.18)" : "0 6px 18px rgba(2,6,23,0.06)"};
  transition: transform 0.12s ease, opacity 0.12s ease;
  &:active {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.56;
    cursor: not-allowed;
  }
`;

/* motion variants */
const frameVariants = {
  initial: { opacity: 0, scale: 0.998 },
  enter: { opacity: 1, scale: 1, transition: { duration: 0.28, ease: [0.2,0.8,0.2,1] } },
  exit: { opacity: 0, scale: 0.998, transition: { duration: 0.2 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.36 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.22 } },
};

export default function SlidesScreen({ quizState, setQuizState }) {
  const [index, setIndex] = useState(0);

  const slides = useMemo(
    () => [
      {
        id: 1,
        type: "image",
        image:
          "https://res.cloudinary.com/dlz2pxovx/image/upload/v1762132911/Screenshot_2025-11-02_214252_xe8dem.png",
      },
      {
        id: 2,
        type: "title",
        title: "World Quality Day",
        subtitle: "Quiz - 2025",
      },
      {
        id: 3,
        type: "rules",
        title: "QUIZ RULES",
        rules: [
          "No use of phones or external help during questions.",
          "Answer only when it’s your team’s turn unless pass-on is active.",
          "For pass-on rounds, timing is shorter during pass attempts.",
          "Host’s decision is final on answers and scoring.",
        ],
      },
      {
        id: 4,
        type: "rounds",
        title: "Rounds",
        rounds: [
          "1. Science and Technology (Multiple Choice - No Pass-on)",
          "2. Current Affairs (Pass-On-Round)",
          "3. General Knowledge (Pass-On-Round)",
          "4. Movies & Entertainment (Pass-On-Round)",
          "5. Sports and Awards (Pass-On-Round)",
        ],
      },
    ],
    []
  );

  // start at first slide when mounted
  useEffect(() => setIndex(0), []);

  // keyboard navigation
  const onKey = useCallback(
    (e) => {
      if (["ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
        if (index < slides.length - 1) setIndex((i) => i + 1);
        else {
          const next = { ...quizState, slidesSeen: true, started: false };
          try {
            localStorage.setItem("quizState", JSON.stringify(next));
          } catch {}
          setQuizState(next);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (index > 0) setIndex((i) => i - 1);
      } else if (e.key === "Enter") {
        if (index < slides.length - 1) setIndex((i) => i + 1);
        else {
          const next = { ...quizState, slidesSeen: true, started: false };
          try {
            localStorage.setItem("quizState", JSON.stringify(next));
          } catch {}
          setQuizState(next);
        }
      }
    },
    [index, slides.length, quizState, setQuizState]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const handleNext = () => {
    if (index < slides.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    const next = { ...quizState, slidesSeen: true, started: false };
    try {
      localStorage.setItem("quizState", JSON.stringify(next));
    } catch {}
    setQuizState(next);
  };

  const handleBack = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  const cur = slides[index];
  const onImage = cur.type === "image";

  return (
    <Fullscreen>
      <SlideFrame variants={frameVariants} initial="initial" animate="enter" exit="exit" aria-label="Slides - full screen">
        <AnimatePresence mode="wait">
          {onImage && (
            <FullBg
              key={`bg-${cur.id}`}
              style={{ backgroundImage: `url(${cur.image})` }}
              initial={{ opacity: 0.02, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.995 }}
              transition={{ duration: 0.6 }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        <TopLeftBack onClick={handleBack} disabled={index === 0} aria-label="Back">
          ← Back
        </TopLeftBack>

        <Content variants={fadeUp} initial="initial" animate="animate" exit="exit" aria-live="polite">
          <AnimatePresence mode="wait">
            {cur.type === "title" && (
              <motion.div key={cur.id} initial="initial" animate="animate" exit="exit" variants={fadeUp}>
                <BigTitle>{cur.title}</BigTitle>
                <BigSubtitle>{cur.subtitle}</BigSubtitle>
              </motion.div>
            )}

            {cur.type === "rules" && (
              <motion.div key={cur.id} initial="initial" animate="animate" exit="exit" variants={fadeUp}>
                <BigTitle>{cur.title}</BigTitle>
                <RulesWrapper>
                  <RulesList initial="initial" animate="animate" exit="exit">
                    {cur.rules.map((r, i) => (
                      <RuleItem key={i}>
                        {r}
                      </RuleItem>
                    ))}
                  </RulesList>
                </RulesWrapper>
              </motion.div>
            )}

            {cur.type === "rounds" && (
              <motion.div key={cur.id} initial="initial" animate="animate" exit="exit" variants={fadeUp}>
                <BigTitle>{cur.title}</BigTitle>
                <RoundsWrapper>
                  <RoundsList initial="initial" animate="animate" exit="exit">
                    {cur.rounds.map((r, i) => (
                      <RoundItem key={i}>{r}</RoundItem>
                    ))}
                  </RoundsList>
                </RoundsWrapper>
              </motion.div>
            )}

            {cur.type === "image" && (
              <motion.div key={cur.id} initial="initial" animate="animate" exit="exit" variants={fadeUp} aria-hidden>
                {/* intentionally no overlay text to keep image full-bleed; caption could be added here if needed */}
              </motion.div>
            )}
          </AnimatePresence>
        </Content>

        <Controls>
          <NextBtn onClick={handleNext} onImage={onImage} aria-label={index === slides.length - 1 ? "Proceed to Setup" : "Next"}>
            {index === slides.length - 1 ? "Proceed to Setup" : "Next"}
          </NextBtn>
        </Controls>
      </SlideFrame>
    </Fullscreen>
  );
}