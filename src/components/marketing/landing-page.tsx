import Link from "next/link";
import { MagicRingsBackground } from "./magic-rings-background";

const STEPS = [
  {
    title: "The problem",
    body: "Describe one real person with this problem today — not a persona, a specific person. The agent pushes back until it's concrete.",
  },
  {
    title: "The users",
    body: "Who else has this problem, and how big is that group really? No hand-waved market-size claims.",
  },
  {
    title: "The business model",
    body: "How the product actually makes money, mapped onto a Lean Canvas or Business Model Canvas — whichever fits where you are.",
  },
];

export function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Blueprint Agent
        </span>
        <Link
          href="/login"
          className="rounded-full border border-black/[.12] px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-950/40 dark:border-white/[.15] dark:text-zinc-200 dark:hover:border-zinc-50/40"
        >
          Log in
        </Link>
      </header>

      <section className="relative flex flex-col items-center overflow-hidden bg-zinc-950 px-6 py-24 text-center sm:py-32">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[600px] w-[600px] max-w-full">
            <MagicRingsBackground />
          </div>
        </div>

        <div className="relative flex max-w-2xl flex-col items-center gap-6">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Turn a raw idea into a structured product blueprint
          </h1>
          <p className="max-w-xl text-balance text-base text-zinc-400 sm:text-lg">
            A 20–30 minute conversation with an AI agent that pushes back on
            vague answers, then hands you a 9-section blueprint — problem,
            users, business model, and more — ready to share with engineering,
            marketing, and finance.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/[.2] px-6 py-3 text-sm font-medium text-white transition-colors hover:border-white/40"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-20 sm:py-24">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            Three core areas, one question at a time
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No blank-page forms — the agent asks, you answer, it pushes back
            when an answer is too vague.
          </p>
        </div>

        <ol className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-950"
            >
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-black/[.06] px-6 py-8 text-center text-xs text-zinc-500 dark:border-white/[.08] dark:text-zinc-500">
        Blueprint Agent — FirstWave
      </footer>
    </div>
  );
}
