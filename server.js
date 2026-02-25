const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());
app.use(express.static('public'));

// Stripe webhook endpoint
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;
    const website = session.metadata?.website;

    if (customerEmail && website) {
      // Send audit report email
      await resend.emails.send({
        from: 'AuditIQs <noreply@auditiqs.com>',
        to: customerEmail,
        subject: 'Your SEO Audit Report - AuditIQs',
        html: `
          <h1>Your SEO Audit is Ready!</h1>
          <p>Thank you for your purchase. We're analyzing <strong>${website}</strong>.</p>
          <p>Your comprehensive SEO audit report will be delivered within 24 hours.</p>
          <p>Best regards,<br>The AuditIQs Team</p>
        `
      });
    }
  }

  res.json({received: true});
});

// Payment intent endpoint
app.post('/create-payment-intent', async (req, res) => {
  const { website, email } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 9900, // $99.00
      currency: 'usd',
      metadata: { website, email },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AuditIQs running on port ${PORT}`));
