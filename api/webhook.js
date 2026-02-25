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

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;
    const website = session.metadata?.website;
    
    console.log(`💰 Order received: ${email} - ${website}`);

    // Send confirmation and start audit
    if (email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Send immediate confirmation
      await resend.emails.send({
        from: 'orders@auditiqs.com',
        to: email,
        subject: 'Order Confirmed - Your SEO Audit',
        html: `
          <h1>Thank You!</h1>
          <p>Your SEO audit for <strong>${website}</strong> is being processed.</p>
          <p>You'll receive your detailed report within the next few minutes.</p>
          <p>Questions? Reply to this email.</p>
        `
      });
      
      console.log(`✅ Confirmation sent to ${email}`);
    }
  }

  res.json({ received: true });
}
