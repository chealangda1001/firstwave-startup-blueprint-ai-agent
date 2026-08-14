"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AGENT_MODEL_OPTIONS,
  AGENT_EFFORT_OPTIONS,
  type AgentEffort,
} from "@/lib/agent-config";
import { updateSiteSettings, type SiteSettingsInput } from "./actions";

const EFFORT_LABEL: Record<AgentEffort, string> = {
  low: "Low — fastest, least thorough",
  medium: "Medium — balanced",
  high: "High — slowest, most thorough",
};

export function SettingsForm({ initial }: { initial: SiteSettingsInput }) {
  const [isPending, startTransition] = useTransition();
  const [appName, setAppName] = useState(initial.app_name);
  const [heroTitle, setHeroTitle] = useState(initial.hero_title);
  const [heroSubtitle, setHeroSubtitle] = useState(initial.hero_subtitle);
  const [heroDescription, setHeroDescription] = useState(
    initial.hero_description
  );
  const [agentModel, setAgentModel] = useState(initial.agent_model);
  const [agentEffort, setAgentEffort] = useState(initial.agent_effort);
  const [artifactModel, setArtifactModel] = useState(initial.artifact_model);
  const [artifactEffort, setArtifactEffort] = useState(
    initial.artifact_effort
  );
  const [thinkingEnabled, setThinkingEnabled] = useState(
    initial.agent_thinking_enabled
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateSiteSettings({
          app_name: appName,
          hero_title: heroTitle,
          hero_subtitle: heroSubtitle,
          hero_description: heroDescription,
          agent_model: agentModel,
          agent_effort: agentEffort,
          artifact_model: artifactModel,
          artifact_effort: artifactEffort,
          agent_thinking_enabled: thinkingEnabled,
        });
        toast.success("Settings saved.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-xl flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="app-name">App name</Label>
        <Input
          id="app-name"
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          required
        />
        <p className="text-xs text-slate-500">
          Shown in the browser tab, the homepage, and the app header —
          everywhere the product name appears to founders.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hero-title">Hero title</Label>
        <Input
          id="hero-title"
          value={heroTitle}
          onChange={(e) => setHeroTitle(e.target.value)}
          required
        />
        <p className="text-xs text-slate-500">
          The big headline on the homepage.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hero-subtitle">Hero subtitle</Label>
        <Textarea
          id="hero-subtitle"
          rows={2}
          value={heroSubtitle}
          onChange={(e) => setHeroSubtitle(e.target.value)}
        />
        <p className="text-xs text-slate-500">
          The short line right under the headline.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hero-description">Hero description</Label>
        <Textarea
          id="hero-description"
          rows={3}
          value={heroDescription}
          onChange={(e) => setHeroDescription(e.target.value)}
        />
        <p className="text-xs text-slate-500">
          The longer supporting text below the subtitle.
        </p>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-200 pt-5">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Blueprint agent
          </p>
          <p className="text-xs text-slate-500">
            Takes effect on the very next message — no deploy needed.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Conversation model</Label>
            <Select value={agentModel} onValueChange={(v) => v && setAgentModel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_MODEL_OPTIONS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Blueprint synthesis model</Label>
            <Select
              value={artifactModel}
              onValueChange={(v) => v && setArtifactModel(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_MODEL_OPTIONS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          Separate on purpose: the conversation model runs on every
          founder-facing question, so Sonnet&rsquo;s speed matters there.
          The synthesis model runs once, at the very end, against a much
          larger structured-output schema — <strong>Sonnet 5 has been
          observed rejecting that schema outright</strong> (&ldquo;the
          compiled grammar is too large&rdquo;), so this defaults to Opus.
          Only switch it to a lighter model after confirming that model
          can actually complete a real blueprint.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Conversation effort</Label>
            <Select value={agentEffort} onValueChange={(v) => v && setAgentEffort(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_EFFORT_OPTIONS.map((effort) => (
                  <SelectItem key={effort} value={effort}>
                    {EFFORT_LABEL[effort]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Blueprint synthesis effort</Label>
            <Select
              value={artifactEffort}
              onValueChange={(v) => v && setArtifactEffort(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_EFFORT_OPTIONS.map((effort) => (
                  <SelectItem key={effort} value={effort}>
                    {EFFORT_LABEL[effort]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          Conversation effort applies to every founder-facing question —
          keep it low or medium for latency. Synthesis only runs once per
          session at the very end, so a slower high-effort pass there
          rarely costs a founder any noticeable wait.
        </p>

        <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
          <div>
            <Label htmlFor="thinking-toggle" className="text-sm">
              Extended thinking (conversation only)
            </Label>
            <p className="text-xs text-slate-500">
              Adds real latency to every turn — leave off unless a specific
              model is visibly struggling with follow-up quality.
            </p>
          </div>
          <Switch
            id="thinking-toggle"
            checked={thinkingEnabled}
            onCheckedChange={setThinkingEnabled}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
