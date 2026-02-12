# MomBoss WhatsApp Agent

AI-powered WhatsApp assistant for vendors on [momboss.space](https://momboss.space) — Africa's first women-focused multi-vendor marketplace.

Vendors message a WhatsApp number. An AI agent understands what they need, calls the right tools, and replies — all in one conversation.

## How It Works

```
WhatsApp Message
      |
      v
  Twilio Webhook (/api/whatsapp)
      |
      v
  GPT-4o Agent (understands intent, calls tools)
      |
      v
  WooCommerce / Dokan APIs (executes actions)
      |
      v
  TwiML Response (sends reply back to WhatsApp)
```

## What The Agent Can Do

| Area | Capabilities |
|------|-------------|
| Products | Create, list, view, update (name, price, stock, status, images) |
| Orders | List, view details, update status |
| Categories | Browse product categories |
| Store | View vendor profile and sales stats |
| Events | Create workshops, meetups, webinars |
| Advertising | Generate marketing copy for products |
| Insights | Business advice, trends, pricing tips |
| Support | Platform help and troubleshooting |
| Verification | Link WhatsApp number to vendor store |

## Agent Roles

The agent combines multiple specialist roles into one interface:

- **LARA** — Order management and delivery tracking
- **AMY** — Marketing and ad generation
- **MIRA** — Business insights and pricing advice
- **STEVE** — Tech support and troubleshooting
- **LULU** — Event creation and management
- **ZURI** — Travel deals (coming soon)

## Tech Stack

- **Runtime**: Next.js 15 (App Router) on Vercel
- **AI**: OpenAI GPT-4o with function calling
- **Messaging**: Twilio WhatsApp Business API
- **Commerce**: WordPress + WooCommerce + Dokan Pro REST APIs
- **Database**: PostgreSQL on Neon (via Prisma ORM)
- **Language**: TypeScript

## Architecture

```
app/
  api/
    whatsapp/route.ts    — Twilio webhook handler (POST/GET)
    test-chat/route.ts   — Browser-based test chat UI
    health/route.ts      — Health check endpoint
    admin/               — Dashboard API (stats, conversations)
    webhooks/            — WooCommerce and n8n webhook receivers
  lib/
    agent.ts             — AI agent engine (GPT + tool loop)
    tools.ts             — Tool definitions for function calling
    tool-executor.ts     — Maps tool calls to API actions
    wordpress.ts         — WooCommerce/Dokan REST client
    conversation.ts      — Conversation management (Prisma)
    twilio.ts            — Twilio message sending
    prisma.ts            — Database client
  dashboard/             — Admin dashboard UI
  page.tsx               — Landing page
prisma/
  schema.prisma          — Database schema
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | No | Model name (default: gpt-4o) |
| `TWILIO_ACCOUNT_SID` | For WhatsApp | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For WhatsApp | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | For WhatsApp | Twilio WhatsApp sender number |
| `WORDPRESS_URL` | For tools | WordPress site URL |
| `WOOCOMMERCE_CONSUMER_KEY` | For tools | WooCommerce REST API key |
| `WOOCOMMERCE_CONSUMER_SECRET` | For tools | WooCommerce REST API secret |

## Quick Start

```bash
# Install
npm install

# Set up database
cp .env.example .env.local
# Edit .env.local with your credentials
npx prisma db push

# Run
npm run dev
```

Then open:
- http://localhost:3000 — Landing page
- http://localhost:3000/api/test-chat — Test the AI agent in browser
- http://localhost:3000/dashboard — Admin dashboard
- http://localhost:3000/api/health — Health check

## WhatsApp Sandbox (Demo)

1. Go to [Twilio Console > WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Send the join code to the sandbox number from your phone
3. Set webhook URL to `https://your-domain.vercel.app/api/whatsapp` (POST)
4. Send a message — the AI agent replies

## Deployment

Deployed on Vercel. Push to `main` triggers auto-deploy.

```bash
git push origin main
```

Ensure all environment variables are set in Vercel project settings.

## Market

- **Platform**: momboss.space
- **Region**: Kenya
- **Currency**: KES (Kenyan Shilling)
- **Payments**: M-Pesa (primary), PayPal (international)
- **Target**: Women entrepreneurs running online stores
