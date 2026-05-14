export type VerifyRequired = {
  status: "VERIFY_REQUIRED";
  note: string;
};

export const ritualAgentIntegration = {
  sovereignGenesis: {
    status: "VERIFY_REQUIRED",
    note: "Install/read Ritual dApp skills and verify Sovereign Agent factory ABI, launcher address, callback encoding, and fee wallet requirements."
  },
  persistentAgent: {
    status: "VERIFY_REQUIRED",
    note: "Verify Persistent Agent factory-backed harness flow, DA provider requirements, launcher lifecycle, and chat relay interface."
  },
  scheduler: {
    status: "VERIFY_REQUIRED",
    note: "Verify Scheduler contract address, schedule registration ABI, and callback/event model."
  }
} satisfies Record<string, VerifyRequired>;
