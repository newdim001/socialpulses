const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, plan = 'professional' } = req.body;

  const plans = {
    starter: { name: 'SocialPulses Starter', amount: 1900, interval: 'month' },
    professional: { name: 'SocialPulses Professional', amount: 4900, interval: 'month' },
    business: { name: 'SocialPulses Business', amount: 9900, interval: 'month' },
    enterprise: { name: 'SocialPulses Enterprise', amount: 19900, interval: 'month' },
  };

  const selectedPlan = plans[plan] || plans.professional;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: selectedPlan.name,
            description: `Social media automation - ${selectedPlan.interval}ly subscription`,
          },
          unit_amount: selectedPlan.amount,
          recurring: { interval: selectedPlan.interval },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/?success=true`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      metadata: { email, plan, business: 'socialpulses' },
      customer_email: email,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
