import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Read-only, fixed-origin diagnostic transport. Never accepts a caller-selected URL.
const ORIGIN = 'https://api.globaldigitalsecurity.io';
async function readMetadata(path: string, key: string) {
  const response = await fetch(`${ORIGIN}${path}`, {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (response.status === 404) return null;
  if (response.status === 401 || response.status === 403) throw new Error('authentication_failed');
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('invalid_upstream');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('invalid_upstream');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 65536) throw new Error('invalid_upstream');
      chunks.push(chunk.value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid_upstream');
  return data;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ success: false, error: 'POST required' }, { status: 405 });
    const user = await createClientFromRequest(req).auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ success: false, error: 'Admin role required' }, { status: 403 });
    const key = Deno.env.get('BRIDGE_API_KEY')?.trim();
    if (!key) return Response.json({ success: false, connection_status: 'credential_missing',
      error: 'Configure the existing runtime credential in server Secrets as BRIDGE_API_KEY.',
      production_ready: false, execution_mode: 'not_executed',
    }, { status: 503 });
    const diagnostic = await readMetadata('/bridge/diagnostics', key);
    if (diagnostic) {
      if (diagnostic.schema_version !== 1 || !diagnostic.registry_counts) throw new Error('invalid_upstream');
      return Response.json({ success: true, connection_status: 'authenticated_metadata',
        reported_release_sha: typeof diagnostic.release_sha === 'string' && /^[a-f0-9]{40}$/.test(diagnostic.release_sha) ? diagnostic.release_sha : null,
        declared_agents: Number.isInteger(diagnostic.registry_counts.agents) ? diagnostic.registry_counts.agents : null,
        declared_tools: Number.isInteger(diagnostic.registry_counts.tools) ? diagnostic.registry_counts.tools : null,
        production_ready: false, execution_verified: false, execution_mode: 'read_only_diagnostics',
        checked_at: new Date().toISOString(),
      });
    }
    // Older releases expose an authenticated roster but no release diagnostics.
    const roster = await readMetadata('/bridge/agents', key);
    if (!roster || !Array.isArray(roster.agents)) throw new Error('invalid_upstream');
    return Response.json({ success: true, connection_status: 'authenticated_legacy_roster',
      declared_agents: roster.agents.length, declared_tools: null, reported_release_sha: null,
      production_ready: false, execution_verified: false, execution_mode: 'read_only_diagnostics',
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    const authFailed = error instanceof Error && error.message === 'authentication_failed';
    return Response.json({ success: false, connection_status: authFailed ? 'authentication_failed' : 'unavailable',
      error: authFailed ? 'Runtime rejected the configured credential.' : 'Runtime metadata could not be verified.',
      production_ready: false, execution_verified: false,
    }, { status: 502 });
  }
});
