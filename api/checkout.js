const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Simple in-memory rate limiter (for Vercel serverless, resets per cold start)
// For production, use @upstash/ratelimit with Redis
const requestLog = new Map();
const RATE_LIMIT = 10; // requests per window
const WINDOW_MS = 60000; // 1 minute

function rateLimit(ip) {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    
    // Clean old entries
    for (const [key, [timestamp]] of requestLog) {
        if (timestamp < windowStart) requestLog.delete(key);
    }
    
    const count = requestLog.get(ip) || [now, 0];
    if (count[1] >= RATE_LIMIT) {
        return false; // Rate limited
    }
    requestLog.set(ip, [now, count[1] + 1]);
    return true;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || 'unknown';
    if (!rateLimit(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { email, plan = 'professional' } = req.body;

    // Email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    // Plan allowlist - prevents invalid plan keys
    const plans = {
        starter: { name: 'SocialPulses Starter', amount: 1900, interval: 'month' },
        professional: { name: 'SocialPulses Professional', amount: 4900, interval: 'month' },
        business: { name: 'SocialPulses Business', amount: 9900, interval: 'month' },
        enterprise: { name: 'SocialPulses Enterprise', amount: 19900, interval: 'month' },
    };

    const selectedPlan = plans[plan] || null;
    if (!selectedPlan) {
        return res.status(400).json({ error: 'Invalid plan selected' });
    }

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
            success_url: `${req.headers.origin}/?success=true&plan=${plan}`,
            cancel_url: `${req.headers.origin}/?canceled=true`,
            metadata: { email, plan, business: 'socialpulses' },
            customer_email: email,
        });

        res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
