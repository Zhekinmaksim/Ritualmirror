import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ApertureStage } from "@/components/aperture-stage";
import { LandingSoundControl } from "@/components/landing-sound-control";
import { SiteHeader } from "@/components/site-header";

const primitives = [
  {
    id: "01",
    title: "Genesis job",
    tag: "Sovereign Agent",
    body: "Submit owner context to the factory. The job returns profile JSON and an initial workspace seed."
  },
  {
    id: "02",
    title: "Persistent launcher",
    tag: "DA-backed runtime",
    body: "Store the launcher address and DA refs. The runtime can be checked, restarted, and indexed."
  },
  {
    id: "03",
    title: "Token anchor",
    tag: "ERC721 record",
    body: "Bind owner, profile hash, metadata URI, Genesis job, and launcher to one public token."
  }
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0d10] text-[#e7e9ed]">
      <section className="relative isolate min-h-[100svh] overflow-hidden border-b border-white/10 bg-[#07080a]">
        <div className="pointer-events-none absolute inset-0 z-0">
          <ApertureStage />
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.58)_100%)]" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_18%_83%,rgba(7,8,10,0.88),rgba(7,8,10,0.38)_18rem,transparent_32rem)]" />

        <SiteHeader />

        <div className="relative z-20 mx-auto grid min-h-[calc(100svh-96px)] w-full max-w-[96rem] content-end px-7 pb-8 pt-20 md:px-10 md:pb-12">
          <div className="max-w-3xl">
            <p className="font-mono text-[13px] uppercase tracking-[0.28em] text-[#d6a35c]">
              Ritual Chain · Registry
            </p>
            <h1 className="mt-7 max-w-4xl text-[clamp(3.4rem,5.4vw,6.5rem)] font-semibold leading-[0.97] tracking-[-0.035em] text-[#e7e9ed]">
              Registry records <span className="block text-[#d6a35c]">for agent runtimes.</span>
            </h1>
            <p className="mt-7 max-w-[38rem] text-[17px] font-medium leading-8 text-[#8a8f98] md:text-xl md:leading-9">
              Register an owner, submit Genesis, store the launcher and metadata, then mint the token anchor.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 md:mt-0">
            <LandingSoundControl />
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#5b6068]">
              Ritual Chain · 1979
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-20 md:px-7 lg:grid-cols-[0.76fr_1.24fr]">
        <div>
          <p className="font-mono text-[11px] uppercase text-[#8a8f98]">Operational flow</p>
          <h2 className="mt-5 max-w-xl text-4xl font-medium leading-tight text-[#e7e9ed] md:text-5xl">
            Each state is explicit.
          </h2>
        </div>
        <div className="grid border border-white/10 md:grid-cols-3">
          {primitives.map((item) => (
            <article key={item.id} className="flex min-h-[250px] flex-col border-b border-white/10 p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
              <p className="font-mono text-[11px] uppercase text-[#d6a35c]">{item.id} / {item.tag}</p>
              <h3 className="mt-8 text-2xl font-medium text-[#e7e9ed]">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-[#8a8f98]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 md:px-7">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase text-[#d6a35c]">Start with the registry</p>
            <h2 className="mt-5 max-w-3xl text-4xl font-medium leading-tight md:text-6xl">
              Register first. Spawn only after the job resolves.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-[#e7e9ed] px-5 py-3 text-sm font-medium text-[#0b0d10] hover:bg-[#d6a35c]"
            >
              Register <ArrowRight size={16} />
            </Link>
            <Link href="/gallery" className="border border-white/16 px-5 py-3 text-sm font-medium text-[#e7e9ed] hover:border-[#8a8f98]">
              View records
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
