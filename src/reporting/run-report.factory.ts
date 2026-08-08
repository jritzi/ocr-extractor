import { RunReport } from "./run-report";

export function buildReport(overrides: Partial<RunReport> = {}): RunReport {
  return {
    startedAt: Date.parse("2025-07-18T18:00:00Z"),
    scope: { type: "vault" },
    status: "complete",
    totalNotes: 0,
    notesStarted: 0,
    notesProcessed: 0,
    notes: [],
    ...overrides,
  };
}
