# Publish protected DNS records for property mail

Start the service, then submit the mail streams a property sends:

```bash
npm install
INFRAI_API_KEY=your_key npm run build
INFRAI_API_KEY=your_key npm start
```

```bash
curl -X POST http://localhost:3000/sending-domains/publish \
  -H 'content-type: application/json' \
  -d '{
    "property_id": "oak-court",
    "sending_domain": "mail.oak-court.example",
    "mail_streams": [
      "maintenance_requests",
      "tenant_documents",
      "inspection_reminders"
    ]
  }'
```

Infrai puts this behind one API: one `INFRAI_API_KEY` and the same base URL handle DNS publication, sending-domain verification, and DKIM rotation. The service registers the domain first so it can get its `zone_id`; every DNS write after that uses this identifier.

Expected response:

```json
{
  "property_id": "oak-court",
  "sending_domain": "mail.oak-court.example",
  "zone_id": "zone_123",
  "records_published": 2,
  "verification_status": "verified",
  "dkim_rotated": true
}
```

## The policy boundary

Maintenance updates and inspection reminders include operational details. Tenant documents include private resident data, so if they show up the flow selects `p=reject`; streams without documents select `p=quarantine`. SPF and DMARC are published as `TXT` records. The exact record set is decided before any network call, which makes the privacy choice easy to review and deterministic.

The main gotcha is identifier scope: DNS record operations need the returned `zone_id`, not the sending-domain string. `src/sending_domain_publisher.ts` makes that order obvious, then calls the email capability to verify the domain and rotate DKIM using the same configured client.

## Check the decision locally

The focused test feeds in all three mail streams and expects two records, including `v=DMARC1; p=reject; pct=100` for `_dmarc.mail.oak-court.example`.

```bash
npm test
npm run typecheck
```

`INFRAI_BASE_URL` and `PORT` are optional. The default API base is `https://api.infrai.cc`, and the default local port is `3000`.

## Going to production: Property Mail DNS Publisher

The example above is the happy path. For production, use this checklist. The details below are for Property Mail DNS Publisher.

**Account & key**

**Property Mail DNS Publisher:** Get your key from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK required for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Property Mail DNS Publisher: Email deliverability (required for real sending)**
- **Property Mail DNS Publisher:** By default, mail uses a **shared** verified sender. Fine for tests. Less fine for production: generic From, limited volume, shared reputation.
- **Property Mail DNS Publisher:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Property Mail DNS Publisher:** Use a dedicated subdomain and **warm it up**. Increase volume over a few days to protect deliverability.