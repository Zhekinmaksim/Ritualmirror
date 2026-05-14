import { SiteShell } from "@/components/site-shell";
import { CreateFlow } from "@/components/create-flow";

export default function CreatePage() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[96rem] px-7 py-14">
        <div className="mb-10 grid gap-8 lg:grid-cols-[0.78fr_1fr] lg:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#d6a35c]">Mirror / Register</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-white md:text-6xl">
              Write the Genesis input.
            </h1>
          </div>
          <p className="max-w-2xl text-[15px] leading-7 text-[#8a8f98]">
            Collect the fields required by the Sovereign Agent factory. Submit only after wallet funding and
            pending-job checks pass.
          </p>
        </div>
        <CreateFlow />
      </section>
    </SiteShell>
  );
}
