MT5 bridge status
=================

The website/backend starter does not yet execute MT5 orders. To connect MT5 safely, an Expert Advisor must be developed and installed in a Windows MT5 terminal or compatible VPS.

The backend exposes POST /api/mt5/status. It requires:
- Set MT5_BRIDGE_SECRET as a private environment variable on the server.
- The EA must send header: x-bridge-secret: <secret>
- JSON body: {"message":"MT5 EA heartbeat"}

Do not hard-code the secret in a public repository. Do not enable real-order execution until the EA has been tested on a demo account and risk checks are implemented.
