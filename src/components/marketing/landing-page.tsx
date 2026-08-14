import Link from "next/link";
import { MagicRingsBackground } from "./magic-rings-background";
import { HeroChatbox } from "./hero-chatbox";
import { getSiteSettings } from "@/lib/site-settings";

export async function LandingPage() {
  const { app_name, hero_title, hero_subtitle, hero_description } =
    await getSiteSettings();

  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 text-center">
      <div className="pointer-events-none absolute inset-0">
        <MagicRingsBackground />
      </div>

      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-sm font-semibold text-white">{app_name}</span>
        <Link
          href="/login"
          className="rounded-full border border-white/[.15] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/40"
        >
          Log in
        </Link>
      </header>

      <div className="relative flex max-w-2xl flex-col items-center gap-6">
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {hero_title}
        </h1>
        <div className="flex max-w-xl flex-col gap-2">
          <p className="text-balance text-base font-medium text-zinc-300 sm:text-lg">
            {hero_subtitle}
          </p>
          <p className="text-balance text-sm text-zinc-500 sm:text-base">
            {hero_description}
          </p>
        </div>
        <div className="mt-2 w-full max-w-lg">
          <HeroChatbox appName={app_name} />
        </div>
      </div>
    </section>
  );
}
