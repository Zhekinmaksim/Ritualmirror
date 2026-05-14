import { SiteShell } from "@/components/site-shell";
import { Lifecycle } from "@/components/lifecycle";
import { MirrorCard } from "@/components/mirror-card";
import { SpawnRunner } from "@/components/spawn-runner";

export default function SpawnPage() {
  return (
    <SiteShell>
      <section className="mx-auto grid w-full max-w-[96rem] gap-10 px-7 py-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d6a35c]">Spawn / Persistent launcher</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-white md:text-6xl">
              Store the launcher address.
            </h1>
          </div>
          <MirrorCard status="Launcher not stored" />
          <div className="border border-white/12 bg-[#0e1014]/92 p-5 text-[15px] leading-7 text-[#8a8f98]">
            Spawn uses a DA workspace generated from `SOUL.md`, `IDENTITY.md`, `MEMORY.md`, and `TOOLS.md`.
            The first target is `DA_PROVIDER=hf`.
          </div>
          <SpawnRunner />
        </div>
        <Lifecycle active={4} />
      </section>
    </SiteShell>
  );
}
