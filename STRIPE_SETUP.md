# Stripe Setup Guide

## 1. Create Products and Prices in Stripe

Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products) (Test Mode) and create:

### Pro Plan
- **Product name**: Zentra Pro
- **Price**: $4.99/month (recurring)
- Copy the `price_id` (starts with `price_...`)

### Family Plan
- **Product name**: Zentra Familia
- **Price**: $7.99/month (recurring)
- Copy the `price_id` (starts with `price_...`)

## 2. Create Webhook Endpoint

Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks) and create:

- **Endpoint URL**: `https://zentra-api-c20o.onrender.com/api/webhooks/stripe`
- **Events to listen for**:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Copy the `whsec_...` signing secret

## 3. Configure Environment Variables

### Backend (Render)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICES=price_XXXXX=pro,price_YYYYY=family
```

### Frontend (Vercel)
```
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_XXXXX
NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID=price_YYYYY
```

## 4. Test the Flow

1. Create a test user in Zentra
2. Go to `/pricing` or `/dashboard/settings/billing`
3. Click "Suscribirse" on Pro or Familia
4. Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
5. Verify subscription is created in Stripe Dashboard
6. Verify webhook fires and subscription is updated in DB

## 5. Go Live

1. Switch Stripe to Live mode
2. Create Live products/prices (new price IDs)
3. Create Live webhook endpoint
4. Update all environment variables with live keys
5. Set `NODE_ENV=production` on Render