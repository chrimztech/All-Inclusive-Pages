import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageIntro, Panel, Chip } from "@/components/eoz/SiteShell";
import { CANDIDATE_NAV, DashNav } from "@/components/eoz/DashNav";

export const Route = createFileRoute("/candidate/documents")({
  head: () => ({ meta: [{ title: "Documents — EOZ Candidate Portal" }] }),
  component: Documents,
});

function Documents() {
  return (
    <SiteShell>
      <PageIntro eyebrow="( 04.4 ) — Documents" title="Your application toolkit." lead="Keep reusable documents ready for your own applications. EOZ never forwards them to employers." />
      <DashNav items={CANDIDATE_NAV} />
      <section className="grid gap-6 pb-14 lg:grid-cols-12">
        <Panel className="lg:col-span-8">
          <div className="flex items-center justify-between"><div><div className="label-mono">Saved documents</div><h2 className="mt-1 font-display text-2xl">Private by default</h2></div><button className="accent-gradient rounded-md px-3 py-2 text-xs font-medium text-ink">Upload document</button></div>
          <div className="mt-5 divide-y divide-line">
            {[['CV_Chanda_Mwansa_2026.pdf','CV · 1.2 MB · updated 12 Aug 2026','Ready'],['Cover_Letter_Data_Analyst.docx','Cover letter · 48 KB · updated 08 Aug 2026','Draft'],['BSc_Transcript.pdf','Supporting document · 830 KB · updated 02 Jul 2026','Ready']].map(([name, meta, state]) => <div key={name} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0"><div><div className="text-sm">{name}</div><div className="text-xs text-muted">{meta}</div></div><div className="flex items-center gap-3"><Chip tone={state === 'Ready' ? 'emerald' : 'muted'}>{state}</Chip><button className="text-xs text-muted hover:text-fg">Download</button></div></div>)}
          </div>
        </Panel>
        <Panel className="lg:col-span-4"><div className="label-mono">Upload rules</div><ul className="mt-3 space-y-3 text-sm text-muted"><li>PDF, DOC or DOCX only</li><li>Maximum file size: 5 MB</li><li>Use clear filenames without passwords</li><li>Delete old versions when no longer needed</li></ul></Panel>
      </section>
    </SiteShell>
  );
}
