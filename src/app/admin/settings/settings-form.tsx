"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSiteSettings, type SiteSettingsInput } from "./actions";

export function SettingsForm({ initial }: { initial: SiteSettingsInput }) {
  const [isPending, startTransition] = useTransition();
  const [appName, setAppName] = useState(initial.app_name);
  const [heroTitle, setHeroTitle] = useState(initial.hero_title);
  const [heroSubtitle, setHeroSubtitle] = useState(initial.hero_subtitle);
  const [heroDescription, setHeroDescription] = useState(
    initial.hero_description
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

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
