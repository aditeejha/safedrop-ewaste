// Structured logs for CloudWatch metric filters. Never pass names, emails, phone numbers, codes or tokens.
// Lambda copies stdout lines as-is, so each line stays pure JSON that metric filters can read.
export function log(event: string, fields: Record<string, unknown> = {}) {
  process.stdout.write(`${JSON.stringify({ event, ...fields })}\n`)
}
