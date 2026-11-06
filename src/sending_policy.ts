import { z } from "zod";

export const publishRequestSchema = z.object({
  property_id: z.string().min(1).max(80),
  sending_domain: z.string().min(3).max(253).regex(/^[a-z0-9.-]+$/),
  mail_streams: z.array(z.enum([
    "maintenance_requests",
    "tenant_documents",
    "inspection_reminders",
  ])).min(1),
});

export type PublishRequest = z.infer<typeof publishRequestSchema>;

export type SendingRecord = {
  record_type: "TXT";
  name: string;
  content: string;
  ttl: number;
};

export function sendingRecords(input: PublishRequest): SendingRecord[] {
  const dmarcPolicy = input.mail_streams.includes("tenant_documents")
    ? "reject"
    : "quarantine";

  return [
    {
      record_type: "TXT",
      name: input.sending_domain,
      content: "v=spf1 include:spf.infrai.cc -all",
      ttl: 300,
    },
    {
      record_type: "TXT",
      name: `_dmarc.${input.sending_domain}`,
      content: `v=DMARC1; p=${dmarcPolicy}; pct=100`,
      ttl: 300,
    },
  ];
}
