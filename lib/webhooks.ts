export async function fireWebhook(webhookUrl: string, event: string, payload: Record<string, unknown>) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Non-fatal — never block the main flow
  }
}
