import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiClient, InfraiError } from "./infrai_client.js";
import { publishSendingDomain } from "./sending_domain_publisher.js";
import { publishRequestSchema } from "./sending_policy.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");

const client = new InfraiClient(apiKey, process.env.INFRAI_BASE_URL);
const port = Number(process.env.PORT ?? 3000);

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/sending-domains/publish") {
    response.writeHead(404).end();
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = publishRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await publishSendingDomain(client, input);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(result));
  } catch (error) {
    const status = error instanceof ZodError
      ? 400
      : error instanceof InfraiError && error.status < 500
        ? error.status
        : 502;
    const message = error instanceof Error ? error.message : "Request failed";
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: message }));
  }
}).listen(port, () => {
  console.log(`Property mail DNS service listening on http://localhost:${port}`);
});
