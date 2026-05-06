export function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const anyErr = err as any;
    const message =
      anyErr?.message ??
      anyErr?.error ??
      anyErr?.response?.data?.message ??
      anyErr?.response?.data?.error ??
      anyErr?.response?.statusText;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "An unexpected error occurred.";
}

