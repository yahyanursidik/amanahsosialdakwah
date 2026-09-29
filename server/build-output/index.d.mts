import type { IncomingMessage, ServerResponse } from "node:http";

declare const handler: (
  request: IncomingMessage & { body?: unknown },
  response: ServerResponse,
) => Promise<void>;

export default handler;
