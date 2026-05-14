import { SiteShell } from "@/components/site-shell";
import { MirrorCard } from "@/components/mirror-card";
import { MirrorStatusPanel } from "@/components/mirror-status-panel";

export default async function MirrorPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return (
    <SiteShell>
      <section className="mx-auto grid w-full max-w-[96rem] gap-10 px-7 py-14 lg:grid-cols-[1fr_0.72fr]">
        <MirrorCard status="Public record" />
        <MirrorStatusPanel address={address} />
      </section>
    </SiteShell>
  );
}
