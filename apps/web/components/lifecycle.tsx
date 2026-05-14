const steps = [
  "Wallet connected",
  "RitualWallet funded",
  "Sovereign Genesis submitted",
  "Genesis callback received",
  "Persistent launcher stored",
  "Identity NFT minted",
  "Record active"
] as const;

export function Lifecycle({ active = 0 }: { active?: number }) {
  return (
    <ol className="grid border border-white/12 bg-[#0e1014]/92">
      {steps.map((step, index) => {
        const done = index < active;
        const current = index === active;
        return (
          <li key={step} className="grid grid-cols-[3rem_1fr] items-center border-b border-white/8 px-4 py-3 last:border-b-0">
            <span
              className={[
                "font-mono text-xs",
                done ? "text-mirror-mint" : current ? "text-mirror-ember" : "text-white/24"
              ].join(" ")}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={done || current ? "text-[#e7e9ed]" : "text-[#6f747d]"}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
