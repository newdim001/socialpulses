const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;
    const plan = session.metadata?.plan || 'professional';

    console.log(`New subscription: ${email} - ${plan}`);

    if (email) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'SocialPulses <noreply@socialpulses.io>',
        to: email,
        subject: 'Welcome to SocialPulses!',
        html: `
          <h1>Welcome to SocialPulses!</h1>
          <p>Your <strong>${plan}</strong> subscription is now active.</p>
          <p>Get started at <a href="https://app.socialpulses.io">app.socialpulses.io</a></p>
          <p>— The SocialPulses Team</p>
        `
      });

      console.log(`Welcome email sent to ${email}`);
    }
  }

  res.json({ received: true });
}
