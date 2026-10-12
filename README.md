# Universal Trading Bot — starter project

A separate website + Node.js backend starter for:
- Deriv synthetic-market tick data and last-digit statistics.
- Research notes for Over/Under and Matches/Differs.
- Planned MT5/XAUUSD analysis and execution integration.
- Android-friendly web dashboard.

## Important limits
This version is a **starter**, not a finished profitable trading system. It reads public Deriv tick data after an app ID is configured. It does not place Deriv contracts or MT5 orders. The MT5 status endpoint is only a protected bridge heartbeat. Live execution requires broker-specific implementation, authentication, contract validation, hard risk limits, and demo testing.

Past digit frequencies do not establish a predictive advantage. No strategy guarantees profits.

## Run locally
Requires Node.js 20 or newer.

1. Copy `.env.example` to `.env`.
2. Add your Deriv app ID to `DERIV_APP_ID` (keep `.env` private).
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Deploy online
A Node.js hosting service such as Render can run the backend. GitHub Pages alone is static hosting and cannot keep this backend running.

1. Upload this project to a **new private GitHub repository** if possible.
2. On the host, create a new Web Service from that repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add `DERIV_APP_ID` in the host's private Environment settings.
6. Deploy and open the provided HTTPS URL.

Never commit `.env`, API tokens, account passwords, or bridge secrets.

## Deriv app ID
Create/register an app in your Deriv developer account and use the app ID in the server environment. Consult the official docs: https://developers.deriv.com/

## Next development steps
1. Validate current supported symbols against the account and Deriv API.
2. Implement authorized Deriv contract proposal/buy/sell flow with explicit consent and limits.
3. Add persistence, authentication, and secure per-user settings.
4. Build and test an MT5 Expert Advisor bridge for XAUUSD.
5. Add demo mode, daily loss limit, trade-count limit, logs, and emergency stop before live trading.
