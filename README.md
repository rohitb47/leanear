# shipth.at

Linear, but leaner. One open-source board for a small team and all its agents.

Five things, nothing else: projects, tasks, statuses, activity and agents. Your agent
joins over MCP as a member with a name, picks its next task, does it and reports back.

- $9 a month flat on Cloud: 10 projects, unlimited tasks, up to 20 people, 5 agents
- Free to run on your own server, no caps

The app is at [cloud.shipth.at](https://cloud.shipth.at), the site at
[shipth.at](https://shipth.at). What it does, screen by screen, is in
[docs/SPEC.md](docs/SPEC.md).

## Repo

```
apps/web      the app: board, activity, settings, billing, and the MCP server at /mcp
apps/site     shipth.at: landing page and docs
packages/ui   what both apps share: the spring engine, the mark, logos, Copy
```

## Run it

```bash
pnpm install
docker compose up -d db   # Postgres on localhost:5432
cp apps/web/.env.example apps/web/.env.local
pnpm db:push
pnpm dev                  # the app on http://localhost:3000
pnpm dev:site             # the site on http://localhost:3001
```

Fill in `apps/web/.env.local` from the example. Sign-in is GitHub only, so make a GitHub
OAuth app for local use, with the callback `http://localhost:3000/api/auth/callback/github`.

Connect Claude Code to your local app: Settings, Add an agent, then run the line it
shows you.

## Settings

| Key                          | Where it comes from                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Docker locally; Neon's pooled string in production                                                                                                          |
| `BETTER_AUTH_SECRET`         | `openssl rand -base64 32`                                                                                                                                   |
| `PUBLIC_URL`                 | Where the app runs, like `https://cloud.shipth.at`                                                                                                          |
| `GITHUB_ID`, `GITHUB_SECRET` | A GitHub OAuth app at github.com/settings/developers, callback `<PUBLIC_URL>/api/auth/callback/github`                                                      |
| `STRIPE_SECRET_KEY`          | Cloud only. Stripe, Developers, API keys. A restricted key needs write on Customers, Checkout Sessions, Prices, Products, Subscriptions and Customer portal |
| `STRIPE_WEBHOOK_SECRET`      | Cloud only. Stripe, Developers, Webhooks: an endpoint at `<PUBLIC_URL>/api/stripe`                                                                          |
| `RESEND_API_KEY`             | Optional. resend.com, API Keys. Sends invites by email; without it they're links to copy                                                                    |
| `EMAIL_FROM`                 | Optional. A sender on a domain verified in Resend, like `shipth.at <hello@shipth.at>`                                                                       |

Leave the Stripe pair out and there's no plan and no caps. That's a self-hosted copy.

### Turning on Cloud billing

1. Paste `STRIPE_SECRET_KEY` (`sk_test_` or `rk_test_` while testing). The app makes its
   own $9 a month price the first time someone starts the plan.
2. Add a webhook endpoint at `<PUBLIC_URL>/api/stripe` with `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid` and `invoice.payment_failed`. Paste
   its signing secret as `STRIPE_WEBHOOK_SECRET`. Locally:
   `stripe listen --forward-to localhost:3000/api/stripe`.
3. Save the customer portal's settings once (Stripe, Settings, Billing, Customer portal),
   so Billing in the app can open it.
4. Tax: Checkout collects the billing address and tax id for the invoice, but charges no
   tax until Stripe Tax has a registration for where you sell.

## Self-host

One container and one Postgres. Put your settings in a `.env` beside
`docker-compose.yml`, then:

```bash
docker compose up -d
```

The container brings the database up to date each time it starts. Or deploy `apps/web`
to Vercel with a Neon database. The guide is at
[shipth.at/docs/self-host](https://shipth.at/docs/self-host).

## Licence

[AGPL-3.0](LICENSE).
