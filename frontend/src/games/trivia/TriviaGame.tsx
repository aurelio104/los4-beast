import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, CircleCheck, CircleX, Sparkles, Zap } from 'lucide-react';
import { api } from '../../lib/api';
import type { TriviaQuestion } from '../../types';
import { playClickSound, playLoseSound, playWinSound } from '../../lib/sounds';
import { haptic } from '../../lib/haptics';

const WIN_BP = 100;
const LOSE_BP = 10;
const PASS_AT = 2;
const TIP_KEY = 'reto_trivia_tip_seen';
const LETTERS = ['A', 'B', 'C', 'D'] as const;

const FALLBACK: TriviaQuestion[] = [
  { q: '¿Quién llega más tarde siempre?', options: ['El del grupo', 'Nadie', 'Todos'], correct: 0 },
  { q: '¿Mejor comida para el reto?', options: ['Burger', 'Pizza', 'Arepas'], correct: 0 },
  { q: '¿Traicionarías por 150 BP?', options: ['Obvio', 'Nunca', 'Depende'], correct: 0 },
  { q: '¿Reto ideal en grupo?', options: ['Comida', 'Verdad o reto', 'Deporte'], correct: 0 },
];

export type TriviaGameProps = {
  onFinish: (passed: boolean) => void;
  onBack: () => void;
};

type Phase = 'play' | 'reveal' | 'result' | 'done';

export default function TriviaGame({ onFinish, onBack }: TriviaGameProps) {
  const [questions, setQuestions] = useState<TriviaQuestion[]>(FALLBACK);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  const [passed, setPassed] = useState<boolean | null>(null);
  const [showTip, setShowTip] = useState(() => {
    try {
      return sessionStorage.getItem(TIP_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const scoreRef = useRef(0);
  const settledRef = useRef(false);
  const advanceTimer = useRef(0);

  useEffect(() => {
    api.triviaQuestions().then((r) => {
      if (r.success && r.questions?.length) setQuestions(r.questions);
    });
    return () => window.clearTimeout(advanceTimer.current);
  }, []);

  const dismissTip = () => {
    setShowTip(false);
    try {
      sessionStorage.setItem(TIP_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const settle = (ok: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setPassed(ok);
    setPhase('result');
    if (ok) {
      playWinSound();
      haptic('success');
    } else {
      playLoseSound();
      haptic('error');
    }
    window.setTimeout(() => {
      setPhase('done');
      onFinish(ok);
    }, 2400);
  };

  const answer = (i: number) => {
    if (phase !== 'play' || picked != null) return;
    dismissTip();
    const q = questions[idx];
    if (!q) return;

    const correct = i === q.correct;
    setPicked(i);
    setPhase('reveal');
    playClickSound();

    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      haptic('success');
    } else {
      haptic('error');
    }

    advanceTimer.current = window.setTimeout(() => {
      const next = idx + 1;
      if (next >= questions.length) {
        settle(scoreRef.current >= PASS_AT);
        return;
      }
      setIdx(next);
      setPicked(null);
      setPhase('play');
    }, 1100);
  };

  const q = questions[idx];
  if (!q) return null;

  const total = questions.length;
  const progress = (idx + (phase === 'reveal' || phase === 'result' || phase === 'done' ? 1 : 0)) / total;
  const locked = phase !== 'play';

  return (
    <div
      className={[
        'game-trivia',
        `game-trivia--${phase}`,
        passed === true ? 'is-win' : '',
        passed === false ? 'is-lose' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="game-trivia__aura" aria-hidden />

      <p className="game-trivia__eyebrow">Trivia Reto</p>
      <p className="game-trivia__title">¿Cuánto sabes?</p>

      <AnimatePresence>
        {showTip && (phase === 'play' || phase === 'reveal') && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="game-trivia__tip"
          >
            <Brain size={16} className="text-reto-gold shrink-0" />
            <span>
              Acerta al menos {PASS_AT} de {total} para llevarte +{WIN_BP} BP.
            </span>
            <button type="button" onClick={dismissTip} className="game-trivia__tip-ok">
              Ok
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="game-trivia__stakes">
        <div className="game-trivia__stake game-trivia__stake--win">
          <Zap size={13} />
          <span>≥{PASS_AT} aciertos</span>
          <strong>+{WIN_BP}</strong>
        </div>
        <div className="game-trivia__stake">
          <span>Menos de {PASS_AT}</span>
          <strong>+{LOSE_BP}</strong>
        </div>
      </div>

      <div className="game-trivia__hud">
        <div className="game-trivia__progress" aria-hidden>
          <div className="game-trivia__progress-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
        <div className="game-trivia__meta">
          <span className="game-trivia__meta-q">
            Pregunta {Math.min(idx + 1, total)}/{total}
          </span>
          <span className="game-trivia__meta-score">
            <Sparkles size={12} />
            {score} acierto{score === 1 ? '' : 's'}
          </span>
        </div>
        <div className="game-trivia__dots" aria-hidden>
          {questions.map((_, i) => (
            <span
              key={i}
              className={`game-trivia__dot ${i < idx ? 'is-done' : ''} ${i === idx ? 'is-current' : ''}`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {(phase === 'play' || phase === 'reveal') && (
          <motion.div
            key={idx}
            className="game-trivia__card"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.28 }}
          >
            <p className="game-trivia__question">{q.q}</p>

            <div className="game-trivia__options" role="group" aria-label="Opciones">
              {q.options.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = i === q.correct;
                const showCorrect = phase === 'reveal' && isCorrect;
                const showWrong = phase === 'reveal' && isPicked && !isCorrect;

                return (
                  <motion.button
                    key={`${idx}-${opt}`}
                    type="button"
                    whileTap={locked ? undefined : { scale: 0.98 }}
                    disabled={locked}
                    onClick={() => answer(i)}
                    className={[
                      'game-trivia__option',
                      showCorrect ? 'is-correct' : '',
                      showWrong ? 'is-wrong' : '',
                      phase === 'reveal' && !isCorrect && !isPicked ? 'is-dim' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="game-trivia__letter">{LETTERS[i] ?? i + 1}</span>
                    <span className="game-trivia__option-text">{opt}</span>
                    {showCorrect && <CircleCheck size={18} className="game-trivia__option-icon" />}
                    {showWrong && <CircleX size={18} className="game-trivia__option-icon" />}
                  </motion.button>
                );
              })}
            </div>

            {phase === 'reveal' && (
              <p className={`game-trivia__feedback ${picked === q.correct ? 'is-ok' : 'is-bad'}`}>
                {picked === q.correct ? '¡Correcto!' : 'Fallaste'}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === 'result' || phase === 'done') && passed != null && (
          <motion.div
            className={`game-trivia__result ${passed ? 'is-win' : 'is-lose'}`}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="game-trivia__result-icon">
              {passed ? <CircleCheck size={22} /> : <CircleX size={22} />}
            </div>
            <div className="game-trivia__result-body">
              <p className="game-trivia__result-title">
                {passed ? '¡Trivia superada!' : 'Casi… no alcanzó'}
              </p>
              <p className="game-trivia__result-meta">
                {score}/{total} aciertos · +{passed ? WIN_BP : LOSE_BP} BP
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={onBack}
        className="game-trivia__exit"
        disabled={phase === 'result' || phase === 'done' || phase === 'reveal'}
      >
        Salir
      </button>
    </div>
  );
}
