/**
 * A write that fails must say so.
 *
 * MEASURED 25 Nov 2026: seven routed sites ended a write with `.catch(() => {})` and then updated local state anyway,
 * so the screen showed the change and the database never had it. Three wrote to IncidentTask, which this platform does
 * not serve at all - the adapter throws, the catch ate it, and the list showed a task that does not exist.
 */
export const WRITE_FAILED_EVENT = "gds:write-failed";

export function reportWriteFailure(what, error) {
  const message = (error && error.message) || String(error || "the platform refused the write");
  const detail = { what, message, at: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WRITE_FAILED_EVENT, { detail }));
  }
  console.error(`[write failed] ${what}: ${message}`);
  return detail;
}

export async function attemptWrite(what, run) {
  try {
    return await run();
  } catch (error) {
    reportWriteFailure(what, error);
    return null;
  }
}
