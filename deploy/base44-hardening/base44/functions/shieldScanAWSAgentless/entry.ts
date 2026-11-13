import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { action, role_arn, regions, cloud_account_id } = await req.json();

    // Get setup instructions
    if (action === 'get_setup_instructions') {
      const cloudFormationUrl = 'https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/create/review?templateURL=https://shieldai-cloudformation.s3.amazonaws.com/readonly-role.yaml';
      
      return Response.json({
        success: true,
        execution_verified: false,
        connection_status: 'unverified',
        provenance: 'setup_instructions_only',
        instructions: {
          step1: {
            title: 'Deploy IAM Role',
            description: 'Click "Deploy to AWS" to create the ShieldAI read-only role in your AWS account.',
            cloudformation_url: cloudFormationUrl,
            template_download: '/api/templates/shieldai-iam-role.yaml',
          },
          step2: {
            title: 'Enter Role ARN',
            description: 'Once deployed, copy the Role ARN and paste it below.',
            arn_pattern: 'arn:aws:iam::\\d{12}:role/.+',
            example_arn: 'arn:aws:iam::123456789012:role/ShieldAIReadOnlyScanner',
          },
          step3: {
            title: 'Select Regions & Scan',
            description: 'Choose which AWS regions to scan, then start the agentless scan.',
            available_regions: ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'],
          },
        },
      });
    }

    if (['validate_role', 'scan'].includes(action)) return Response.json({
      success: false, status: 'unavailable', code: 'VERIFIED_AWS_CONNECTOR_REQUIRED',
      error: 'AWS STS and the governed read-only scanner are not connected.',
      role_assumed: false, scan_executed: false, persisted: false,
    }, { status: 503 });
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return Response.json({ error: 'AWS connector request failed' }, { status: 503 });
  }
});
