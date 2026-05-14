import { SiteHeader } from "./site-header";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#07080a] text-[#e7e9ed]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(214,163,92,0.08),transparent_24rem)]" />
      <img
        src="/brand/ritual-mirror-mark-dark.svg"
        alt=""
        className="pointer-events-none fixed right-[-11rem] top-[7rem] h-[34rem] opacity-[0.08]"
        width={540}
        height={540}
      />
      <SiteHeader />
      <main className="relative z-10">{children}</main>
    </div>
  );
}
