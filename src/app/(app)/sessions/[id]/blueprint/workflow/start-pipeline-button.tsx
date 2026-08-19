"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startMarketingPipelineAction } from "./actions";

export function StartPipelineButton({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        await startMarketingPipelineAction(sessionId);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not start the pipeline.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
    >
      {isPending ? "Starting…" : "Start Marketing Pipeline"}
    </button>
  );
}
