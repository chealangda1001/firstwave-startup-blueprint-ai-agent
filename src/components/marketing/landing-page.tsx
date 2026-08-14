import Link from "next/link";
import { MagicRingsBackground } from "./magic-rings-background";

export function LandingPage() {
  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 text-center">
      <div className="pointer-events-none absolute inset-0">
        <MagicRingsBackground />
      </div>

      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-sm font-semibold text-white">
          Blueprint Agent
        </span>
        <Link
          href="/login"
          className="rounded-full border border-white/[.15] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/40"
        >
          Log in
        </Link>
      </header>

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
  );
}
