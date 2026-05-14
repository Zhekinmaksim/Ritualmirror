"use client";

import { useEffect, useState } from "react";
import type { MirrorStatusResponse } from "@ritual-mirror/ritual";

type ChatResponse =
  | { status: "online"; answer: string; provenance: string }
  | { status: "offline"; reason: string };

export function MirrorConsole({ address }: { address: string }) {
  const [status, setStatus] = useState<MirrorStatusResponse | undefined>();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ChatResponse | undefined>();
  const [pending, setPending] = useState(false);
  const [statusError, setStatusError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/mirror/${address}/status`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Status request failed.");
        if (!cancelled) {
          setStatus(body as MirrorStatusResponse);
          setStatusError(undefined);
        }
      } catch (error) {
        if (!cancelled) setStatusError(error instanceof Error ? error.message : "Status request failed.");
      }
    };
    void load();
    const interval = window.setInterval(load, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [address]);

  const send = async () => {
    if (!question.trim()) return;
    setPending(true);
    try {
      const response = await fetch(`/api/mirror/${address}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question })
      });
      const body = (await response.json()) as ChatResponse & { error?: string };
      setAnswer("reason" in body ? { status: "offline", reason: body.reason ?? body.error ?? "Relay is offline." } : body);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <div className="mt-8 max-w-4xl border border-[#d6a35c]/34 bg-[#d6a35c]/5 p-5 font-mono text-xs leading-6 text-[#d0d3d8]">
        {statusError
          ? statusError
          : status
            ? status.chatAvailable
              ? "Relay is online."
              : status.agent.launcher
                ? "Launcher is stored, but relay transport is still offline."
                : "Relay is offline until the launcher address is stored."
            : "Polling worker status..."}
      </div>
      {status?.diagnostics?.length ? (
        <div className="mt-4 max-w-4xl font-mono text-xs leading-6 text-white/48">
          {status.diagnostics.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      ) : null}
      <form
        className="mt-6 flex max-w-4xl gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          className="min-h-12 flex-1 border border-white/12 bg-black/25 px-4 text-white outline-none focus:border-[#d6a35c]/60"
          placeholder="Enter operator message"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button className="bg-[#e7e9ed] px-5 text-sm font-medium text-[#0b0d10] hover:bg-[#d6a35c] disabled:opacity-50" type="submit" disabled={pending}>
          {pending ? "Sending" : "Send"}
        </button>
      </form>
      {answer ? (
        <div className="mt-6 max-w-4xl border border-white/12 bg-[#0e1014]/92 p-5 font-mono text-xs leading-6 text-white/68">
          {"answer" in answer ? answer.answer : answer.reason}
        </div>
      ) : null}
    </>
  );
}
