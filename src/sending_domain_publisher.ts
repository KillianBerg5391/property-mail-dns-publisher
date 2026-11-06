import { createHash } from "node:crypto";
import { InfraiClient } from "./infrai_client.js";
import { sendingRecords, type PublishRequest } from "./sending_policy.js";

type Zone = { zone_id: string };
type Verification = { verification: { status: string } };
type DkimRotation = { [key: string]: unknown };

export type PublicationResult = {
  property_id: string;
  sending_domain: string;
  zone_id: string;
  records_published: number;
  verification_status: string;
  dkim_rotated: boolean;
};

function operationKey(propertyId: string, action: string): string {
  return createHash("sha256").update(`${propertyId}:${action}`).digest("hex");
}

export async function publishSendingDomain(
  client: InfraiClient,
  input: PublishRequest,
): Promise<PublicationResult> {
  const zone = await client.request<Zone>({
    method: "POST",
    path: "/v1/dns/domain/add",
    body: { domain: input.sending_domain },
    idempotencyKey: operationKey(input.property_id, "domain-add"),
  });

  const records = sendingRecords(input);
  await Promise.all(records.map((record) => client.request({
    method: "PUT",
    path: "/v1/dns/record/upsert",
    body: { zone_id: zone.zone_id, ...record },
    idempotencyKey: operationKey(input.property_id, `${record.name}:${record.content}`),
  })));

  const verification = await client.request<Verification>({
    method: "POST",
    path: "/v1/email/domain/verify",
    body: { domain: input.sending_domain },
    idempotencyKey: operationKey(input.property_id, "email-domain-verify"),
  });
  await client.request<DkimRotation>({
    method: "POST",
    path: `/v1/email/domain/rotate_dkim/${encodeURIComponent(input.sending_domain)}`,
    idempotencyKey: operationKey(input.property_id, "rotate-dkim"),
  });

  return {
    property_id: input.property_id,
    sending_domain: input.sending_domain,
    zone_id: zone.zone_id,
    records_published: records.length,
    verification_status: verification.verification.status,
    dkim_rotated: true,
  };
}
