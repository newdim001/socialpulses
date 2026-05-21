"""Billing and subscription routes."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User, Client, Subscription, SubscriptionTier, SubscriptionStatus, PLANS
from schemas import SubscriptionInfo, CountryPricingOut
import stripe, os, json, logging, datetime
logger = logging.getLogger("billing_routes")
router = APIRouter(prefix="/api/billing", tags=["Billing"])

@router.get("/stripe/config")
def stripe_config_route(country_code: str = None, db=Depends(get_db)):
    """Return Stripe config with optional country-based pricing."""
    return get_stripe_config(country_code=country_code, db=db)


def _get_country_pricing_data(country_code: str = None, db=None):
    """Get pricing for a specific country, or all country pricing."""
    if db:
        rows = db.query(CountryPricing).all()
        result = {}
        for r in rows:
            if r.country_code not in result:
                result[r.country_code] = {"country_code": r.country_code, "country_name": r.country_name, "tiers": {}}
            result[r.country_code]["tiers"][r.tier] = {
                "price": r.price,
                "currency": r.currency,
                "stripe_price_id": r.stripe_price_id,
            }
        return result

    # Static fallback using COUNTRY_PRICE_MAP
    result = {}
    for cc, prices in COUNTRY_PRICE_MAP.items():
        country_name = cc  # will be enriched from DB
        result[cc] = {"country_code": cc, "country_name": country_name, "tiers": {}}
        for tier, price in prices.items():
            result[cc]["tiers"][tier] = {"price": price, "currency": "USD", "stripe_price_id": None}
    return result


def get_stripe_config(country_code: str = None, db=None):
    """Return Stripe publishable key, plan list, payment links, and country pricing."""
    plans = PLANS_LIST
    if country_code and country_code in COUNTRY_PRICE_MAP:
        cp = COUNTRY_PRICE_MAP[country_code]
        plans = []
        for p in PLANS_LIST:
            tid = p["id"]
            if tid in cp:
                p = dict(p)
                p["price"] = cp[tid]
            plans.append(p)

    country_pricing = None
    if db:
        country_pricing = _get_country_pricing_data(country_code, db)

    return {
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "plans": plans,
        "payment_links": {
            "starter": "https://buy.stripe.com/00w6oHfm3aT9fPXfAr6AM00",
            "professional": "https://buy.stripe.com/dRm9ATddV4uLbzHgEv6AM01",
            "business": "https://buy.stripe.com/bJeeVdgq7aT9eLT0Fx6AM02",
        },
        "country_pricing": country_pricing,
    }

# ── Stripe Checkout Session ──
@router.post("/stripe/create-checkout-session")
def create_checkout_session(req: CheckoutSessionRequest, user=Depends(get_current_user), db=Depends(get_db)):
    """Create a Stripe checkout session for the current user."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(500, "Stripe not configured")
    if not req.price_id:
        raise HTTPException(400, "price_id is required")
    
    try:
        session = create_checkout_session_for_user(
            user, req.price_id, f"{STORE_URL}/settings/billing", f"{STORE_URL}/settings/billing?canceled=true", db
        )
        return CheckoutSessionResponse(url=session.url, session_id=session.id)
    except Exception as e:
        logger.error(f"Checkout session error: {e}")
        raise HTTPException(500, f"Failed to create checkout session")


# ── Stripe Billing Portal ──
@router.post("/stripe/create-portal-session")
def create_billing_portal(user=Depends(get_current_user), db=Depends(get_db)):
    """Create a Stripe billing portal session for managing subscription."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(500, "Stripe not configured")
    
    sub = get_client_subscription(user.client_id, db)
    if not sub.stripe_customer_id:
        raise HTTPException(400, "No Stripe customer found. Subscribe first.")
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=sub.stripe_customer_id,
            return_url=f"{STORE_URL}/settings/billing",
        )
        return BillingPortalResponse(url=session.url)
    except Exception as e:
        logger.error(f"Billing portal error: {e}")
        raise HTTPException(500, f"Failed to create portal session")


# ── Stripe Webhook ──
@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, db=Depends(get_db)):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    
    if not STRIPE_WEBHOOK_SECRET:
        logger.warning("Stripe webhook secret not configured")
        raise HTTPException(400, "Webhook secret not configured")


    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.error(f"Webhook signature verification failed: {e}")
        raise HTTPException(400, f"Invalid signature")
    
    event_type = event.get("type")
    data = event.get("data", {}).get("object", {})
    
    logger.info(f"Stripe webhook received: {event_type}")
    
    # Handle checkout.session.completed
    if event_type == "checkout.session.completed":
        client_id = data.get("metadata", {}).get("client_id")
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        
        if client_id and subscription_id:
            sub = db.query(Subscription).filter(Subscription.client_id == client_id).first()
            if sub:
                sub.stripe_subscription_id = subscription_id
                sub.stripe_customer_id = customer_id
                
                # Get subscription details from Stripe
                try:
                    stripe_sub = stripe.Subscription.retrieve(subscription_id)
                    sub.stripe_price_id = stripe_sub.get("items", {}).get("data", [{}])[0].get("price", {}).get("id") if stripe_sub.get("items", {}).get("data") else None
                    sub.current_period_start = datetime.datetime.fromtimestamp(stripe_sub.get("current_period_start", 0), tz=datetime.timezone.utc) if stripe_sub.get("current_period_start") else None
                    sub.current_period_end = datetime.datetime.fromtimestamp(stripe_sub.get("current_period_end", 0), tz=datetime.timezone.utc) if stripe_sub.get("current_period_end") else None
                    sub.trial_end = None  # Trial converted to paid
                    sub.status = SubscriptionStatus.active
                    
                    # Determine tier from price
                    price_id = sub.stripe_price_id
                    for tier_name, plan_data in PLANS.items():
                        if plan_data.get("stripe_price_id") == price_id:
                            sub.tier = SubscriptionTier(tier_name)
                            break
                    
                    db.commit()
                    logger.info(f"Subscription activated for client {client_id}: {sub.tier.value}")
                except Exception as e:
                    logger.error(f"Failed to retrieve subscription details: {e}")
    
    # Handle invoice events
    elif event_type == "invoice.paid":
        subscription_id = data.get("subscription")
        customer_id = data.get("customer")
        invoice_url = data.get("hosted_invoice_url")
        invoice_pdf = data.get("invoice_pdf")
        amount_paid = data.get("amount_paid", 0)
        currency = data.get("currency", "usd")
        
        if subscription_id:
            sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == subscription_id).first()
            if sub:
                # Log payment - store in subscription metadata
                logger.info(f"Payment received for client {sub.client_id}: {amount_paid/100} {currency}")
                sub.status = SubscriptionStatus.active
                
                # Update period from Stripe
                try:
                    stripe_sub = stripe.Subscription.retrieve(subscription_id)
                    sub.current_period_start = datetime.datetime.fromtimestamp(stripe_sub.get("current_period_start", 0), tz=datetime.timezone.utc) if stripe_sub.get("current_period_start") else None
                    sub.current_period_end = datetime.datetime.fromtimestamp(stripe_sub.get("current_period_end", 0), tz=datetime.timezone.utc) if stripe_sub.get("current_period_end") else None
                except:
                    pass
                
                db.commit()
    
    elif event_type == "invoice.payment_failed":
        subscription_id = data.get("subscription")
        if subscription_id:
            sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == subscription_id).first()
            if sub:
                sub.status = SubscriptionStatus.past_due
                db.commit()
                logger.warning(f"Payment failed for client {sub.client_id}")
    
    elif event_type == "customer.subscription.updated":
        subscription_id = data.get("id")
        status = data.get("status")
        cancel_at_period_end = data.get("cancel_at_period_end", False)
        
        if subscription_id:
            sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == subscription_id).first()
            if sub:
                if status == "canceled" or status == "unpaid":
                    sub.status = SubscriptionStatus.canceled
                    sub.canceled_at = datetime.datetime.utcnow()
                elif cancel_at_period_end:
                    sub.status = SubscriptionStatus.active  # Still active until period ends
                else:
                    sub.status = SubscriptionStatus.active
                
                # Update period
                current_period_start = data.get("current_period_start")
                current_period_end = data.get("current_period_end")
                if current_period_start:
                    sub.current_period_start = datetime.datetime.fromtimestamp(current_period_start, tz=datetime.timezone.utc)
                if current_period_end:
                    sub.current_period_end = datetime.datetime.fromtimestamp(current_period_end, tz=datetime.timezone.utc)
                
                db.commit()
    
    elif event_type == "customer.subscription.deleted":
        subscription_id = data.get("id")
        if subscription_id:
            sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == subscription_id).first()
            if sub:
                sub.status = SubscriptionStatus.canceled
                sub.canceled_at = datetime.datetime.utcnow()
                db.commit()
    
    return {"received": True}


# ── Subscription Info ──
@router.get("/subscription")
def get_my_subscription(user=Depends(get_current_user), db=Depends(get_db)):
    """Get current user's subscription info."""
    info = get_subscription_info(user, db)
    return info


# ── Subscription Check (for feature gating) ──
@router.get("/subscription/check")
def check_subscription(user=Depends(get_current_user), db=Depends(get_db)):
    """Check if user has valid subscription access."""
    result = check_subscription_access(user, db)
    info = get_subscription_info(user, db) if result.get("has_access") else result
    return {"has_access": result.get("has_access"), "reason": result.get("reason"), "subscription": info}


# ── Payment History / Invoice List ──
@router.get("/subscription/features")
def get_subscription_features(user=Depends(get_current_user), db=Depends(get_db)):
    """Return available features based on subscription tier."""
    sub = db.query(Subscription).filter(Subscription.client_id == user.client_id).first()
    tier = sub.tier.value if sub else "free"
    features = {
        "free": {"max_accounts": 5, "max_users": 1, "ai_assistant": True, "analytics": True, "scheduling": True, "kanban": True, "rss_feeds": False, "saved_replies": False, "premium_analytics": False, "api_access": False},
        "starter": {"max_accounts": 15, "max_users": 1, "ai_assistant": True, "analytics": True, "scheduling": True, "kanban": True, "rss_feeds": True, "saved_replies": True, "premium_analytics": False, "api_access": False},
        "professional": {"max_accounts": 25, "max_users": 3, "ai_assistant": True, "analytics": True, "scheduling": True, "kanban": True, "rss_feeds": True, "saved_replies": True, "premium_analytics": True, "api_access": True},
        "business": {"max_accounts": 50, "max_users": 10, "ai_assistant": True, "analytics": True, "scheduling": True, "kanban": True, "rss_feeds": True, "saved_replies": True, "premium_analytics": True, "api_access": True},
        "enterprise": {"max_accounts": 999, "max_users": 999, "ai_assistant": True, "analytics": True, "scheduling": True, "kanban": True, "rss_feeds": True, "saved_replies": True, "premium_analytics": True, "api_access": True},
    }
    return features.get(tier, features["free"])

@router.get("/subscription/invoices")
def list_invoices(user=Depends(get_current_user), db=Depends(get_db)):
    """Fetch invoice history from Stripe for the current user."""
    if not STRIPE_SECRET_KEY:
        return []
    
    sub = get_client_subscription(user.client_id, db)
    if not sub.stripe_customer_id:
        return []
    
    try:
        invoices = stripe.Invoice.list(customer=sub.stripe_customer_id, limit=12)
        result = []
        for inv in invoices.get("data", []):
            result.append({
                "id": inv.id,
                "amount_paid": inv.amount_paid / 100,
                "currency": inv.currency.upper(),
                "status": inv.status,
                "created": datetime.datetime.fromtimestamp(inv.created, tz=datetime.timezone.utc).isoformat() if inv.created else None,
                "pdf_url": inv.invoice_pdf or inv.hosted_invoice_url,
                "number": inv.number,
            })
        return result
    except Exception as e:
        logger.error(f"Failed to fetch invoices: {e}")
        return []


# ── Posting Streak (Dashboard Widget) ──