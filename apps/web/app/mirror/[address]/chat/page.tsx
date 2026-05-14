import { SiteShell } from "@/components/site-shell";
import { MirrorConsole } from "@/components/mirror-console";

export default async function MirrorChatPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[96rem] px-7 py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d6a35c]">Console / Launcher</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-white md:text-6xl">
          Launcher console.
        </h1>
        <p className="mt-3 break-all font-mono text-sm text-white/54">{address}</p>
        <MirrorConsole address={address} />
      </section>
    </SiteShell>
  );
}
