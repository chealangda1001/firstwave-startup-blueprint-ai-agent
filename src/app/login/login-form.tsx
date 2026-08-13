"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, signup, type AuthActionState } from "./actions";

const initialState: AuthActionState = null;

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const searchParams = useSearchParams();
  const infoMessage = searchParams.get("message");

  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    initialState
  );

  const isLogin = mode === "login";
  const state = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;
  const action = isLogin ? loginAction : signupAction;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.12] dark:bg-zinc-950">
      <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
        {isLogin ? "Log in" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {isLogin
          ? "Welcome back — pick up where you left off."
          : "Start turning your idea into a structured blueprint."}
      </p>

      {infoMessage && (
        <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {infoMessage}
        </p>
      )}

      <form action={action} className="mt-6 flex flex-col gap-4">
        {!isLogin && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              Full name
            </span>
            <input
              type="text"
              name="full_name"
              autoComplete="name"
              className="rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-950 dark:border-white/[.15] dark:focus:border-zinc-50"
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-950 dark:border-white/[.15] dark:focus:border-zinc-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Password
          </span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-950 dark:border-white/[.15] dark:focus:border-zinc-50"
          />
        </label>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {pending ? "Please wait…" : isLogin ? "Log in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(isLogin ? "signup" : "login")}
        className="mt-6 text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        {isLogin
          ? "New here? Create an account"
          : "Already have an account? Log in"}
      </button>

      <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-500">
        <Link href="/" className="underline underline-offset-2">
          ← Back home
        </Link>
      </p>
    </div>
  );
}
