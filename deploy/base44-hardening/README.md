# Base44 safeguard source snapshot

Latest additional containment checkpoint: `6af7751dbb61280d498f3db2`, commit
`1413cbebb68517953589af957d686beaa99a00c7`. Hardening contracts now total 28;
diagnostic transport adds eight. Ten existing AgentOS contracts run separately
inside the actual Base44 app, for 46 there. See the current project assessment
under `docs/operations/` for behavior changes and remaining gates.

This directory records the tested Base44 source associated with checkpoints `6af7554e9c6fd3c2b429ecec` and `6af75a3c1bc2c9d3c1bad699` on 13 November 2026. It is a review/recovery snapshot, not a second running application or an automatic deployment target.

Run `node tests/gds-production-hardening.mjs` and `node tests/gds-runtime-diagnostics.mjs` with Node 24 from this directory. The contracts mock the SDK and services. Frontend build verification was performed in the actual Base44 sandbox.

See `docs/operations/production-hardening-2026-11-13.md` at the repository root for deployed/prepared distinctions, intentional legacy feature unavailability, permissions and staging release gates.
