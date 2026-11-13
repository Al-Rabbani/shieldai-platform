# Base44 safeguard source snapshot

This directory records the tested Base44 source associated with checkpoint `6af7554e9c6fd3c2b429ecec` on 13 November 2026. It is a review/recovery snapshot, not a second running application or an automatic deployment target.

Run `node tests/gds-production-hardening.mjs` with Node 24 from this directory. The contracts mock the SDK and services. Frontend build verification was performed in the actual Base44 sandbox.

See `docs/operations/production-hardening-2026-11-13.md` at the repository root for deployed/prepared distinctions, intentional legacy feature unavailability, permissions and staging release gates.
