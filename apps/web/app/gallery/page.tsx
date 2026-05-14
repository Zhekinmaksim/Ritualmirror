import { SiteShell } from "@/components/site-shell";
import { MirrorCard } from "@/components/mirror-card";

export default function GalleryPage() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[96rem] px-7 py-14">
        <div className="max-w-4xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d6a35c]">Gallery / Records</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-white md:text-6xl">
            Registry records.
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-7 text-[#8a8f98]">
            Records appear here after the indexer reads the Ritual testnet deployment.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <MirrorCard status="No indexed record" />
          <MirrorCard status="No indexed record" />
        </div>
      </section>
    </SiteShell>
  );
}
