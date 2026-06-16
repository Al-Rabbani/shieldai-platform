# ShieldAI EDR Agent — Complete Architecture
## Date: June 16, 2026

## THE REAL ANSWER: How CrowdStrike does it vs how we will do it

### CrowdStrike Falcon Architecture
- Windows: Kernel driver (csagent.sys) + ETW (Event Tracing for Windows)
- Linux: Kernel module (falcon-sensor) hooking into syscalls
- Mac: macOS Endpoint Security Framework (ESF)
- They have KERNEL-LEVEL tamper protection → hardest to replicate without signing
- Their moat: the kernel driver is the biggest legal/technical barrier

### What WE can build (legally, correctly, and with real telemetry):

#### Tier 1 — ShieldAI Rustinel-powered EDR (TODAY)
- Integrate Rustinel (Apache 2.0) as our detection engine
- Windows: ETW telemetry → process, network, file, registry, DNS, PowerShell
- Linux: eBPF (kernel 5.8+ BTF) → process, network, file, DNS
- Mac: ESF + /dev/bpf → process, file, network, DNS (experimental)
- Detection: Sigma rules + YARA signatures + IOC matching
- Output: ECS NDJSON → ingested by ShieldAI backend

#### Tier 2 — ShieldAI osquery-powered Visibility (TODAY+)
- osquery runs on all platforms, exposes OS as SQL
- We build a Fleet Management server that osquery agents enroll into
- SQL queries get us: processes, network connections, users, files, hashes, browser extensions, crontabs, launchd, services, kernel modules, USB devices
- Schedule queries → results stream to ShieldAI backend
- This is exactly what Uptycs does ($500M valuation)

#### Tier 3 — ShieldAI eBPF Agent (CUSTOM, 6 months)
- Write our own Rust/Go eBPF agent using libbpf-rs or cilium/ebpf
- Attach to: execve, open, connect, accept, clone, kill syscalls
- Capture: full process tree, network flows, file operations, user logins
- Stream events to ShieldAI via gRPC/HTTP2
- This is what Tetragon (Cilium), Falco, and Sysdig do

#### What we CANNOT do short-term:
- True kernel-mode driver on Windows (requires EV code signing cert, WHQL)
- Pre-execution blocking (needs kernel callbacks - PROCESS_CREATION callbacks)
- Anti-tamper (needs kernel protection)
- Memory scanning at kernel level

## The Real Competitive Strategy:
CrowdStrike sells EDR as a standalone product to protect endpoints.
WE integrate endpoint telemetry into our multi-pillar security graph.
The DIFFERENTIATOR: we correlate endpoint events with code vulnerabilities + cloud misconfigs.
"The process that got hacked was running vulnerable log4j we already knew about from SAST"
→ That correlation is worth more than pure EDR.

## Implementation Plan:
1. ShieldAI Desktop Agent = Rustinel binary + custom config reporting to ShieldAI
2. Install script: one-liner curl → installs, enrolls with org API key, starts as service
3. Backend: receives telemetry via shieldEDRIngest.ts function
4. Frontend: /edr page showing enrolled devices, process trees, alerts
5. Correlation engine: cross-reference EDR alerts with existing SAST/SCA findings
