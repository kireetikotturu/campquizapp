import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";

const Wrapper = styled.div`
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(120deg, #f5f7fa 0%, #c3cfe2 100%);
  box-sizing: border-box;
`;

const Card = styled(motion.div)`
  width: 920px;
  max-width: 96%;
  min-height: 80vh; /* Occupy >= 80% of the screen height */
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(31, 41, 55, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const Progress = styled.div`
  position: relative;
  height: 6px;
  width: 100%;
  background: #f1f5f9;
`;
const ProgressFill = styled(motion.div)`
  position: absolute;
  height: 100%;
  left: 0;
  top: 0;
  background: linear-gradient(90deg, #5f2c82 0%, #49a09d 100%);
  border-radius: 0 6px 6px 0;
`;

const SlideArea = styled.div`
  flex: 1;
  padding: 2rem 2.2rem 1.6rem;
  display: grid;
  grid-auto-rows: minmax(0, 1fr);
  align-items: center;
  justify-items: center;
  text-align: center;
  gap: 0.8rem;
`;

const Footer = styled.div`
  padding: 1.1rem 2.2rem 1.4rem;
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  border-top: 1px solid #eef2f7;
`;

const LeftFooter = styled.div`
  display: flex;
  gap: 0.6rem;
  align-items: center;
`;

const RightFooter = styled.div`
  display: flex;
  gap: 0.6rem;
  align-items: center;
`;

const NextButton = styled.button`
  background: linear-gradient(90deg, #5f2c82, #49a09d);
  color: #ffffff;
  border: none;
  padding: 0.85rem 1.6rem;
  border-radius: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(95, 44, 130, 0.2);
  transition: transform 0.12s ease;
  &:active {
    transform: translateY(1px);
  }
`;

const BackButton = styled.button`
  background: #ffffff;
  color: #5f2c82;
  border: 1px solid #e6e6ea;
  padding: 0.72rem 1.2rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, transform 0.12s ease;
  &:hover {
    background: #fafafa;
  }
  &:active {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const BgImage = styled(motion.div)`
  width: 100%;
  height: clamp(420px, 60vh, 720px); /* big visual and responsive */
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(16, 24, 40, 0.12);
`;

const Title = styled(motion.h1)`
  font-size: clamp(2rem, 2.6rem, 6vw);
  margin: 0 0 0.6rem 0;
  color: #222037;
  font-weight: 900;
  letter-spacing: 0.01em;
`;

const SubTitle = styled(motion.h3)`
  margin: 0;
  color: #46516a;
  font-weight: 600;
  font-size: 1.25rem;
`;

const RulesList = styled(motion.ol)`
  text-align: left;
  width: min(760px, 95%);
  margin: 1.1rem auto 0;
  padding-left: 1.4rem;
  color: #1f2937;
  line-height: 1.7;
  font-size: 1.06rem;
`;

const RuleItem = styled(motion.li)`
  margin: 0.25rem 0;
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  strong {
    color: #0f172a;
  }
`;

const RoundsList = styled(motion.ul)`
  list-style: none;
  padding: 0;
  margin: 1.1rem 0 0;
  width: min(760px, 95%);
  text-align: left;
  color: #1f2937;
  line-height: 1.7;
  font-size: 1.06rem;
`;

const RoundItem = styled(motion.li)`
  padding: 0.55rem 0;
  font-weight: 600;
  color: #2b2b2b;
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
`;

const TopInlineBack = styled(BackButton)`
  position: absolute;
  top: 0.75rem;
  left: 0.9rem;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  font-size: 0.92rem;
`;

const DotBar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;
const Dot = styled.button`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 0;
  background: ${(p) => (p.active ? "#5f2c82" : "#d1d5db")};
  transform: ${(p) => (p.active ? "scale(1.2)" : "scale(1)")};
  transition: transform 0.15s, background 0.15s;
  cursor: pointer;
`;

// animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

const slideVariants = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  in: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] } },
  out: { opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.25 } },
};

const textStagger = {
  hidden: { opacity: 0, y: 8 },
  enter: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.36, ease: [0.2, 0.8, 0.2, 1] },
  }),
  exit: { opacity: 0, y: -6, transition: { duration: 0.22 } },
};

export default function SlidesScreen({ quizState, setQuizState }) {
  const [index, setIndex] = useState(0);

  // Define your four slides (kept as your implementation; rules are shown nicely)
  const slides = useMemo(
    () => [
      {
        id: 1,
        type: "image",
        image:
          "https://res.cloudinary.com/dlz2pxovx/image/upload/v1762132911/Screenshot_2025-11-02_214252_xe8dem.png",
        caption: "",
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
          // You can replace these with your real rules; UI will adapt
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
          "2. Current Affairs (Pass-on round)",
          "3. General Knowledge (Logos, Captions, Images, etc.)",
          "4. Movies & Entertainment",
          "5. Sports and Awards",
        ],
      },
    ],
    []
  );

  // Always start from slide 0 when this screen mounts
  useEffect(() => {
    setIndex(0);
  }, []);

  // Preload first slide image for smoothness
  useEffect(() => {
    const first = slides[0];
    if (first?.type === "image" && first.image) {
      const img = new Image();
      img.src = first.image;
    }
  }, [slides]);

  const persist = (next) => {
    try {
      localStorage.setItem("quizState", JSON.stringify(next));
    } catch {}
  };

  const onNext = () => {
    if (index < slides.length - 1) {
      setIndex((i) => i + 1);
    } else {
      // Last slide -> mark slidesSeen and ensure we go to Setup (App routes to Setup when started=false)
      setQuizState((prev) => {
        const next = {
          ...prev,
          slidesSeen: true,
          started: false, // ensure SetupScreen shows next
        };
        persist(next);
        return next;
      });
    }
  };

  const onBack = () => setIndex((i) => Math.max(0, i - 1));

  const cur = slides[index];
  const progress = ((index + 1) / slides.length) * 100;

  return (
    <Wrapper>
      <Card
        key="slides-card-root"
        initial="hidden"
        animate="enter"
        exit="exit"
        variants={containerVariants}
        aria-label="Intro slides"
      >
        <Progress aria-hidden="true">
          <ProgressFill
            style={{ width: `${progress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </Progress>

        {/* Inline back only for content-heavy slides (e.g., rules), optional */}
        {index > 0 && cur.type === "rules" && (
          <TopInlineBack onClick={onBack} aria-label="Go back to previous slide">
            ← Back
          </TopInlineBack>
        )}

        <SlideArea>
          <AnimatePresence mode="wait">
            {cur.type === "image" ? (
              <motion.div
                key="image-slide"
                variants={slideVariants}
                initial="initial"
                animate="in"
                exit="out"
                style={{ width: "100%" }}
              >
                <BgImage
                  role="img"
                  aria-label="Intro slide image"
                  style={{ backgroundImage: `url(${cur.image})` }}
                  initial={{ scale: 0.985, opacity: 0.9 }}
                  animate={{ scale: 1, opacity: 1, transition: { duration: 0.4 } }}
                  exit={{ scale: 0.99, opacity: 0.9, transition: { duration: 0.25 } }}
                />
              </motion.div>
            ) : cur.type === "title" ? (
              <motion.div
                key="title-slide"
                initial="initial"
                animate="in"
                exit="out"
                variants={slideVariants}
                style={{ width: "100%" }}
              >
                <Title variants={textStagger} custom={0}>
                  {cur.title}
                </Title>
                <SubTitle variants={textStagger} custom={1} style={{ marginTop: 12 }}>
                  {cur.subtitle}
                </SubTitle>
              </motion.div>
            ) : cur.type === "rules" ? (
              <motion.div
                key="rules-slide"
                variants={slideVariants}
                initial="initial"
                animate="in"
                exit="out"
                style={{ width: "100%" }}
              >
                <Title variants={textStagger} custom={0}>
                  {cur.title}
                </Title>
                <RulesList initial="hidden" animate="enter" exit="exit" style={{ marginTop: 14 }}>
                  {cur.rules.map((r, i) => (
                    <RuleItem key={i} variants={textStagger} custom={i + 1}>
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          width: 22,
                          height: 22,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 999,
                          background: "#eef2ff",
                          color: "#5f2c82",
                          fontWeight: 800,
                          fontSize: 12,
                          marginTop: 2,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span>{r}</span>
                    </RuleItem>
                  ))}
                </RulesList>
              </motion.div>
            ) : (
              <motion.div
                key="rounds-slide"
                variants={slideVariants}
                initial="initial"
                animate="in"
                exit="out"
                style={{ width: "100%" }}
              >
                <Title variants={textStagger} custom={0}>
                  {cur.title}
                </Title>
                <RoundsList initial="hidden" animate="enter" exit="exit" style={{ marginTop: 14 }}>
                  {cur.rounds.map((r, i) => (
                    <RoundItem key={i} variants={textStagger} custom={i + 1}>
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          width: 10,
                          height: 10,
                          marginTop: 8,
                          borderRadius: 999,
                          background: "#49a09d",
                          boxShadow: "0 0 0 3px #e6fffb",
                          flexShrink: 0,
                        }}
                      />
                      <span>{r}</span>
                    </RoundItem>
                  ))}
                </RoundsList>
              </motion.div>
            )}
          </AnimatePresence>
        </SlideArea>

        <Footer>
          <LeftFooter>
            <DotBar aria-label="Slide indicators">
              {slides.map((s, i) => (
                <Dot
                  key={s.id}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  active={i === index}
                  onClick={() => setIndex(i)}
                />
              ))}
            </DotBar>
          </LeftFooter>

          <RightFooter>
            <BackButton onClick={onBack} disabled={index === 0} aria-label="Previous slide">
              Back
            </BackButton>
            <NextButton onClick={onNext} aria-label="Next slide">
              {index === slides.length - 1 ? "Proceed to Setup" : "Next"}
            </NextButton>
          </RightFooter>
        </Footer>
      </Card>
    </Wrapper>
  );
}