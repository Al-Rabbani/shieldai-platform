import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the Stripe secret key from Prime Endorsement app environment
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'STRIPE_SECRET_KEY not set in environment' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

    const webhookUrl = 'https://69e2e852c48630e3502f13b1.base44.app/api/functions/stripeWebhook';

    // Check if webhook already exists to avoid duplicates
    const existing = await stripe.webhookEndpoints.list({ limit: 100 });
    const alreadyRegistered = existing.data.find(wh => wh.url === webhookUrl);

    if (alreadyRegistered) {
      return Response.json({
        status: 'already_exists',
        message: 'Webhook endpoint already registered in Stripe',
        webhook_id: alreadyRegistered.id,
        url: alreadyRegistered.url,
        status_stripe: alreadyRegistered.status,
        enabled_events: alreadyRegistered.enabled_events,
        secret: '(hidden — retrieve from Stripe Dashboard if needed)'
      });
    }

    // Register the webhook
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'checkout.session.completed',
        'checkout.session.expired',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'payment_intent.canceled',
        'invoice.paid',
        'invoice.payment_failed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'charge.refunded',
        'charge.dispute.created',
      ],
      description: 'Prime Endorsement Authority — auto-registered webhook',
    });

    return Response.json({
      status: 'success',
      message: '✅ Stripe webhook registered successfully',
      webhook_id: webhook.id,
      url: webhook.url,
      stripe_status: webhook.status,
      enabled_events: webhook.enabled_events,
      signing_secret: webhook.secret, // whsec_... — save this!
      next_step: 'Save the signing_secret as STRIPE_WEBHOOK_SECRET in your app environment'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
