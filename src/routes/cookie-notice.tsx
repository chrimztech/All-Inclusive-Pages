import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageIntro, Panel, SiteShell } from "@/components/eoz/SiteShell";
import { SettingToggle } from "@/components/eoz/PortalKit";

const STORAGE_KEY = "eoz-cookie-preferences";

function loadStoredPreferences(): { preferences: boolean; performance: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { preferences: true, performance: false };
    return JSON.parse(raw);
  } catch {
    return { preferences: true, performance: false };
  }
}

export const Route = createFileRoute("/cookie-notice")({
  head: () => ({
    meta: [
      { title: "Cookie Notice - Echo Opportunities Zambia" },
      { name: "description", content: "How EOZ uses essential and optional browser storage." },
    ],
  }),
  component: CookieNotice,
});

function CookieNotice() {
  const stored = loadStoredPreferences();
  const [preferences, setPreferences] = useState(stored.preferences);
  const [performance, setPerformance] = useState(stored.performance);
  const [saved, setSaved] = useState(false);

  return (
    <SiteShell>
      <PageIntro
        eyebrow="Legal & privacy"
        title="Cookie notice"
        lead="A plain-language explanation of the browser storage used to keep EOZ secure, remember preferences and understand service performance."
      />
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          {[
            [
              "Essential storage",
              "Used for sign-in security, session continuity, fraud prevention and remembering your consent choice. These controls cannot be switched off while using account features.",
            ],
            [
              "Preference storage",
              "Remembers choices such as filters, alert settings and accessibility preferences on this device.",
            ],
            [
              "Performance measurement",
              "Helps EOZ understand page reliability and aggregated usage. It must not contain CV contents, passwords or payment secrets.",
            ],
            [
              "Your choices",
              "You can change optional preferences at any time. Clearing your browser storage may sign you out and reset saved device preferences.",
            ],
          ].map(([title, text]) => (
            <Panel key={title}>
              <h2 className="font-display text-2xl">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </Panel>
          ))}
        </div>
        <Panel className="h-fit lg:col-span-4">
          <div className="label-mono mb-4">Cookie preferences</div>
          <SettingToggle
            title="Essential"
            description="Required for security and core account features."
            locked
          />
          <SettingToggle
            title="Preferences"
            description="Remember filters and display choices on this device."
            initial={preferences}
            onChange={(value) => {
              setPreferences(value);
              setSaved(false);
            }}
          />
          <SettingToggle
            title="Performance"
            description="Allow privacy-respecting, aggregated measurement."
            initial={performance}
            onChange={(value) => {
              setPerformance(value);
              setSaved(false);
            }}
          />
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ preferences, performance }));
              } catch {
                // Storage may be unavailable (private browsing); preference still applies for this session.
              }
              setSaved(true);
            }}
            className="accent-gradient mt-5 w-full rounded-md px-4 py-2 text-sm font-medium text-ink"
          >
            Save preferences
          </button>
          {saved ? <p className="mt-3 text-xs text-emerald-400">Preferences saved on this device.</p> : null}
        </Panel>
      </section>
    </SiteShell>
  );
}
