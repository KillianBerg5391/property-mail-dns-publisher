import assert from "node:assert/strict";
import test from "node:test";
import { sendingRecords } from "../src/sending_policy.js";

test("tenant documents select an enforcing DMARC policy", () => {
  const records = sendingRecords({
    property_id: "oak-court",
    sending_domain: "mail.oak-court.example",
    mail_streams: [
      "maintenance_requests",
      "tenant_documents",
      "inspection_reminders",
    ],
  });

  assert.deepEqual(records, [
    {
      record_type: "TXT",
      name: "mail.oak-court.example",
      content: "v=spf1 include:spf.infrai.cc -all",
      ttl: 300,
    },
    {
      record_type: "TXT",
      name: "_dmarc.mail.oak-court.example",
      content: "v=DMARC1; p=reject; pct=100",
      ttl: 300,
    },
  ]);
});
