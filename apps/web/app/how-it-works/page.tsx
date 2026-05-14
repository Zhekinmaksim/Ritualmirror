import { SiteShell } from "@/components/site-shell";

const rows = [
  ["Genesis", "SovereignAgentFactory returns the first profile document."],
  ["Persistence", "Store launcher address and DA refs after spawn."],
  ["Token", "Token metadata references owner, profile hash, job id, and launcher."],
  ["Schedule", "Enable scheduled updates after the base lifecycle works."]
] as const;

export default function HowItWorksPage() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[96rem] px-7 py-14">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1fr] lg:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d6a35c]">Docs / Protocol</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-white md:text-6xl">
              Lifecycle states.
            </h1>
          </div>
          <p className="max-w-2xl text-[15px] leading-7 text-[#8a8f98]">
            The record moves through four states: Genesis result, launcher storage, token mint, and scheduled updates.
          </p>
        </div>
        <div className="mt-10 grid border border-white/10 md:grid-cols-2">
          {rows.map(([title, body]) => (
            <div key={title} className="border-b border-white/10 bg-[#0e1014]/92 p-6 last:border-b-0 md:border-r md:last:border-r-0 md:[&:nth-child(2n)]:border-r-0">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">{title}</h2>
              <p className="mt-4 text-[15px] leading-7 text-[#8a8f98]">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
