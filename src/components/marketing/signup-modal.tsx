"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { signup, type AuthActionState } from "@/app/login/actions";

const initialState: AuthActionState = null;

/**
 * A real signup form in a modal — not a teaser link-out — so the moment of
 * highest intent (someone just typed their idea into the hero box) doesn't
 * get diluted by a full page navigation. Uses the exact same `signup`
 * server action as /login's signup mode; this is a second entry point to
 * the same flow, not a parallel one, so there's only ever one place
 * signup validation/error-handling logic lives.
 *
 * Deliberately no Google/GitHub/Apple buttons — this app only has
 * email/password auth wired up, and showing OAuth options that don't
 * actually work would be a worse first impression than not having them.
 */
export function SignupModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 text-zinc-950 shadow-2xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <DialogPrimitive.Title className="text-lg font-semibold">
            Create your free account
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-zinc-500">
            Sign up to start turning your idea into a blueprint.
          </DialogPrimitive.Description>

          <form action={formAction} className="mt-5 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800">Full name</span>
              <input
                type="text"
                name="full_name"
                autoComplete="name"
                className="rounded-lg border border-black/[.12] px-3 py-2 text-sm outline-none focus:border-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                autoFocus
                className="rounded-lg border border-black/[.12] px-3 py-2 text-sm outline-none focus:border-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800">Password</span>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="rounded-lg border border-black/[.12] px-3 py-2 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              {pending ? "Creating your account…" : "Create free account"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-2">
              Log in
            </Link>
          </p>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
