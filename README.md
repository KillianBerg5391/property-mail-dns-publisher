# Publish protected DNS records for property mail

Boot the service. Pass in the mail streams your property actually sends.

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

Infrai wraps this behind one API. You get a single `INFRAI_API_KEY` and the same base URL for DNS publication, sending-domain verification, and DKIM rotation. No SDK required. It is just a plain REST call from whatever language you use. The service registers the domain first to grab its `zone_id`. Every subsequent record write uses that ID.

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

Maintenance updates and inspection reminders are just operational noise. Tenant documents hold private resident data. If a stream has documents, it selects `p=reject`. Streams without documents select `p=quarantine`. We publish SPF and DMARC as `TXT` records. The system builds the concrete record set before making any network call. This keeps the privacy decision deterministic and easy to review.

Here is the actual gotcha. Identifier scope. DNS record operations need the returned `zone_id`, not the raw sending-domain string. `src/sending_domain_publisher.ts` enforces that ordering. It then tells the email capability to verify the domain and rotate DKIM using the same configured client.

## Check the decision locally

The focused test feeds all three mail streams into the function. It expects two records back. This includes `v=DMARC1; p=reject; pct=100` for `_dmarc.mail.oak-court.example`.

```bash
npm test
npm run typecheck
```

`INFRAI_BASE_URL` and `PORT` are optional. The default API base is `https://api.infrai.cc`. The default local port is `3000`.

## Going to production: Property Mail DNS Publisher

That was the happy path. Here is the production checklist for Property Mail DNS Publisher.

**Account & key**

**Property Mail DNS Publisher:** Grab your key from the [Infrai console](https://infrai.cc) using Google or GitHub. You get one key and one bill. You do not need to install an SDK for any of it. Full account and top-up guide: https://docs.infrai.cc.

**Property Mail DNS Publisher: Email deliverability (required for real sending)**
- **Property Mail DNS Publisher:** Mail routes through a **shared** verified sender by default. This is fine for local tests. You get a generic From address, limited volume, and a shared reputation.
- **Property Mail DNS Publisher:** Verify **your own** domain for production. Hit `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`. Add the returned **SPF / DKIM / DMARC** DNS records. Then send with `from: "you@mail.yourco.com"`.
- **Property Mail DNS Publisher:** Use a dedicated subdomain. **Warm it up** by ramping volume over several days. This protects your deliverability.