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
        console.error('Webhook Signature Error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email = session.customer_details?.email;
        const plan = session.metadata?.plan || 'professional';

        console.log(`[Stripe] Subscription completed: ${email} - ${plan}`);

        if (email) {
            try {
                const resend = new Resend(process.env.RESEND_API_KEY);
                
                await resend.emails.send({
                    from: 'SocialPulses <noreply@socialpulses.io>',
                    to: email,
                    subject: 'Welcome to SocialPulses! 🎉',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #ec4899;">Welcome to SocialPulses!</h1>
                        <p>Your <strong>${plan}</strong> subscription is now active.</p>
                        <p>Get started by connecting your social media accounts at:</p>
                        <p><a href="https://app.socialpulses.io" style="color: #ec4899;">app.socialpulses.io</a></p>
                        <p>Questions? Reply to this email anytime.</p>
                        <p>— The SocialPulses Team</p>
                        </div>
                    `
                });

                console.log(`[Email] Welcome email sent to ${email}`);
            } catch (emailError) {
                console.error(`[Email] Failed to send to ${email}:`, emailError.message);
                // Don't fail the webhook - Stripe will retry
            }
        }
    }

    res.json({ received: true });
}
