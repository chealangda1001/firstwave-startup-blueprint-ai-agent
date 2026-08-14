import { getSiteSettings } from "@/lib/site-settings";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          The app name, homepage hero copy, and blueprint agent model —
          live the moment you save.
        </p>
      </div>

      <SettingsForm initial={settings} />
    </div>
  );
}
