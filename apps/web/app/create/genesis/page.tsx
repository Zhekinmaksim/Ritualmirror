import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Lifecycle } from "@/components/lifecycle";
import { RitualWalletStatus } from "@/components/ritual-wallet-status";
import { GenesisRunner } from "@/components/genesis-runner";

export default function GenesisPage() {
  return (
    <SiteShell>
      <section className="mx-auto grid w-full max-w-[96rem] gap-10 px-7 py-14 lg:grid-cols-[0.88fr_1.12fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d6a35c]">Genesis / Sovereign job</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-white md:text-6xl">
            Submit the Genesis job.
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-7 text-[#8a8f98]">
            The call targets `SovereignAgentFactory`. It needs RitualWallet funds, lock duration, executor selection,
            and a sender with no pending async job.
          </p>
          <div className="mt-7 border border-[#d6a35c]/34 bg-[#d6a35c]/5 p-5 font-mono text-xs leading-6 text-[#d0d3d8]">
            This page now submits the local consumer contract directly. Factory-backed calldata wiring is still a
            separate contract upgrade, so callback delivery remains explicit.
          </div>
          <Link href="/create/spawn" className="mt-6 inline-flex border border-white/14 px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-white/72 hover:border-white/34">
            View launcher step
          </Link>
        </div>
        <div className="grid gap-5">
          <RitualWalletStatus />
          <Lifecycle active={2} />
          <GenesisRunner />
        </div>
      </section>
    </SiteShell>
  );
}
