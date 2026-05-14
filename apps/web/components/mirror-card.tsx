import type { MirrorProfile } from "@ritual-mirror/ritual";

type MirrorCardProps = {
  profile?: Partial<MirrorProfile>;
  status?: string;
};

export function MirrorCard({ profile, status = "Genesis pending" }: MirrorCardProps) {
  const strengths = profile?.strengths ?? ["Profile hash", "DA refs", "Launcher address"];
  const primitiveFit = profile?.ritualPrimitiveFit ?? ["Sovereign Agent", "Persistent Agent", "Scheduler"];

  return (
    <section className="relative overflow-hidden border border-white/12 bg-[#0e1014]/92 p-6">
      <img
        src="/brand/ritual-mirror-mark-dark.svg"
        alt=""
        className="pointer-events-none absolute right-[-5rem] top-[-5rem] h-56 opacity-[0.07]"
        width={224}
        height={224}
      />
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-start gap-4">
          <img
            src="/brand/ritual-mirror-mark-dark.svg"
            alt=""
            className="mt-0.5 h-14 w-14 border border-white/8"
            width={56}
            height={56}
          />
          <div className="relative z-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6a35c]">{status}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-white">{profile?.mirrorName ?? "Unregistered Record"}</h2>
          <p className="mt-2 text-sm text-[#8a8f98]">{profile?.archetype ?? "Factory-backed registry entry"}</p>
          </div>
        </div>
        <div className="border border-white/12 px-3 py-2 font-mono text-xs text-[#8a8f98]">chain 1979</div>
      </div>
      <p className="relative z-10 mt-6 max-w-2xl text-[15px] leading-7 text-[#a7abb3]">
        {profile?.mission ?? "Register owner context, submit Genesis, store launcher refs, and mint the token anchor."}
      </p>
      <div className="relative z-10 mt-6 grid gap-6 border-t border-white/10 pt-5 md:grid-cols-2">
        <div>
          <p className="font-mono text-xs uppercase text-white/36">Record fields</p>
          <ul className="mt-3 space-y-2 font-mono text-xs text-white/66">
            {strengths.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-xs uppercase text-white/36">Ritual calls</p>
          <ul className="mt-3 space-y-2 font-mono text-xs text-white/66">
            {primitiveFit.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
