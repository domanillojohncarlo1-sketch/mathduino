'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Timer,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react'
import {
  BONUS_PER_CORRECT,
  QUIZ_LENGTH,
  QUIZ_TIME,
  generateQuiz,
  type QuizQuestion,
} from '@/lib/mathduino'
import { cn } from '@/lib/utils'

interface QuizPanelProps {
  /** Called once when a finished quiz hands back the number of correct answers. */
  onFinish: (correct: number) => void
}

type Phase = 'idle' | 'active' | 'done'

export default function QuizPanel({ onFinish }: QuizPanelProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME)

  const scoreRef = useRef(0)
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef({ phase, questions, idx, selected })
  const onFinishRef = useRef(onFinish)

  // Keep the latest quiz state & callback accessible from stable timers.
  useEffect(() => {
    stateRef.current = { phase, questions, idx, selected }
    onFinishRef.current = onFinish
  })

  useEffect(
    () => () => {
      if (advanceRef.current) clearTimeout(advanceRef.current)
    },
    []
  )

  const start = () => {
    scoreRef.current = 0
    setScore(0)
    setQuestions(generateQuiz())
    setIdx(0)
    setSelected(null)
    setTimeLeft(QUIZ_TIME)
    setPhase('active')
  }

  /** Lock in an answer (-1 = timed out). Stable across renders. */
  const choose = useCallback((choice: number) => {
    const { phase: ph, questions: qs, idx: i, selected: sel } = stateRef.current
    if (sel !== null || ph !== 'active') return
    setSelected(choice)
    const q = qs[i]
    if (q && choice === q.answerIndex) {
      scoreRef.current += 1
      setScore(scoreRef.current)
    }
    if (advanceRef.current) clearTimeout(advanceRef.current)
    advanceRef.current = setTimeout(() => {
      if (i + 1 >= qs.length) {
        setPhase('done')
        onFinishRef.current(scoreRef.current)
      } else {
        setIdx(i + 1)
        setSelected(null)
        setTimeLeft(QUIZ_TIME)
      }
    }, 1200)
  }, [])

  // Per-question countdown + auto-lock when the timer expires.
  useEffect(() => {
    if (phase !== 'active' || selected !== null) return
    const tick = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000)
    const lock = setTimeout(() => choose(-1), timeLeft * 1000)
    return () => {
      clearInterval(tick)
      clearTimeout(lock)
    }
  }, [phase, selected, choose])

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center sm:py-10">
        <span className="grid size-14 place-items-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
          <BookOpen className="size-7" aria-hidden />
        </span>
        <div>
          <h3 className="text-lg font-bold text-slate-100">Sharpen your math skills</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-400">
            Five timed questions — addition, subtraction, multiplication and division. Every
            correct answer earns a <span className="font-semibold text-emerald-300">+{BONUS_PER_CORRECT} bonus point</span> on your machine balance.
          </p>
        </div>
        <Button
          size="lg"
          onClick={start}
          className="mt-1 bg-emerald-500 font-bold tracking-wider text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.55)]"
        >
          <Zap className="size-4" aria-hidden />
          START PRACTICE QUIZ (5 Qs)
        </Button>
        <p className="font-mono text-[10px] tracking-[0.25em] text-slate-600">
          {QUIZ_TIME}S PER QUESTION
        </p>
      </div>
    )
  }

  if (phase === 'done') {
    const bonus = score * BONUS_PER_CORRECT
    const message =
      score === QUIZ_LENGTH
        ? 'Perfect score — outstanding!'
        : score >= 4
          ? 'Excellent work, keep it up!'
          : score >= 3
            ? 'Good job — keep practicing!'
            : 'Keep practicing, you will improve!'
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center sm:py-10">
        <span className="grid size-14 place-items-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
          <Trophy className="size-7" aria-hidden />
        </span>
        <div>
          <p className="font-mono text-5xl font-black text-emerald-300 md-text-glow">
            {score}
            <span className="text-2xl text-slate-500">/{QUIZ_LENGTH}</span>
          </p>
          <p className="mt-2 text-sm text-slate-300">{message}</p>
          <Badge
            variant="outline"
            className={cn(
              'mt-3 font-mono',
              bonus > 0
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 text-slate-400'
            )}
          >
            {bonus > 0 ? `+${bonus} BONUS PTS ADDED` : 'NO BONUS THIS ROUND'}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={start}
          className="mt-1 border-emerald-500/50 bg-transparent font-bold tracking-wider text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
        >
          <RotateCcw className="size-4" aria-hidden />
          PRACTICE AGAIN
        </Button>
      </div>
    )
  }

  const q = questions[idx]

  return (
    <div className="space-y-5">
      {/* Header: progress + timer */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 font-mono tracking-[0.2em] text-emerald-300"
          >
            Q {idx + 1} / {QUIZ_LENGTH}
          </Badge>
          <div
            className={cn(
              'flex items-center gap-1.5 font-mono text-xs font-bold',
              timeLeft <= 6 ? 'text-amber-300' : 'text-slate-400'
            )}
            aria-live="polite"
          >
            <Timer className="size-3.5" aria-hidden />
            {String(timeLeft).padStart(2, '0')}s
          </div>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-label="Time remaining"
          aria-valuemin={0}
          aria-valuemax={QUIZ_TIME}
          aria-valuenow={timeLeft}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000 ease-linear',
              timeLeft <= 6 ? 'bg-amber-400' : 'bg-emerald-400'
            )}
            style={{ width: `${(timeLeft / QUIZ_TIME) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="space-y-5"
        >
          <p className="text-center font-mono text-3xl font-black tracking-wider text-slate-100 sm:text-4xl">
            {q.prompt}
          </p>

          <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Answer choices">
            {q.options.map((opt, i) => {
              const revealed = selected !== null
              const isCorrect = i === q.answerIndex
              const isChosen = i === selected
              return (
                <button
                  key={`${idx}-${i}`}
                  type="button"
                  onClick={() => choose(i)}
                  disabled={revealed}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left font-mono text-xl font-bold transition-all',
                    !revealed &&
                      'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-200 hover:shadow-[0_0_18px_rgba(16,185,129,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60',
                    revealed &&
                      isCorrect &&
                      'border-emerald-500/70 bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
                    revealed && !isCorrect && isChosen && 'border-red-500/60 bg-red-500/10 text-red-300',
                    revealed && !isCorrect && !isChosen && 'border-slate-800 bg-slate-900/40 text-slate-600 opacity-60'
                  )}
                  aria-pressed={revealed ? isChosen : undefined}
                >
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-lg border font-mono text-sm',
                      revealed && isCorrect
                        ? 'border-emerald-500/60 text-emerald-300'
                        : revealed && isChosen
                          ? 'border-red-500/60 text-red-300'
                          : 'border-slate-700 text-slate-400'
                    )}
                    aria-hidden
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                  {revealed && isCorrect && <CheckCircle2 className="ml-auto size-5 shrink-0" aria-hidden />}
                  {revealed && !isCorrect && isChosen && <XCircle className="ml-auto size-5 shrink-0" aria-hidden />}
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Score dots */}
      <div className="flex items-center justify-center gap-2" aria-label="Question progress">
        {questions.map((_, i) => (
          <span
            key={i}
            className={cn(
              'size-2 rounded-full transition-colors',
              i < idx ? 'bg-emerald-400' : i === idx ? 'bg-emerald-400/50' : 'bg-slate-700'
            )}
          />
        ))}
      </div>
    </div>
  )
}
