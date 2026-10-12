require("dotenv").config();
const express = require("express");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const state = {
  startedAt: new Date().toISOString(),
  mode: process.env.BOT_MODE === "auto" ? "auto" : "signals",
  connection: "not_connected",
  market: "R_100",
  lastTick: null,
  lastDigitHistory: [],
  signals: [],
  trades: [],
  risk: { maxDailyLoss: 10, maxTradesPerDay: 10, stake: 1 },
  mt5: { connected: false, lastMessage: "MT5 bridge not connected" }
};

let derivSocket = null;
let derivReconnectTimer = null;

function addSignal(signal) {
  state.signals.unshift({ ...signal, timestamp: new Date().toISOString() });
  state.signals = state.signals.slice(0, 100);
}

function connectDeriv() {
  if (derivSocket && (derivSocket.readyState === WebSocket.OPEN ||
      derivSocket.readyState === WebSocket.CONNECTING)) return;
  const appId = process.env.DERIV_APP_ID;
  if (!appId) {
    state.connection = "needs_app_id";
    return;
  }
  state.connection = "connecting";
  derivSocket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(appId)}`);

  derivSocket.on("open", () => {
    state.connection = "connected";
    derivSocket.send(JSON.stringify({ ticks: state.market, subscribe: 1 }));
  });

  derivSocket.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.error) {
      state.connection = "error: " + msg.error.message;
      return;
    }
    if (msg.tick && msg.tick.quote !== undefined) {
      const quote = String(msg.tick.quote);
      const digits = quote.replace(/\D/g, "");
      const lastDigit = digits.length ? Number(digits[digits.length - 1]) : null;
      const tick = {
        symbol: msg.tick.symbol,
        quote: msg.tick.quote,
        epoch: msg.tick.epoch,
        lastDigit
      };
      state.lastTick = tick;
      if (lastDigit !== null) {
        state.lastDigitHistory.unshift(lastDigit);
        state.lastDigitHistory = state.lastDigitHistory.slice(0, 200);
        createResearchSignals();
      }
    }
  });

  derivSocket.on("close", () => {
    state.connection = "disconnected";
    clearTimeout(derivReconnectTimer);
    derivReconnectTimer = setTimeout(connectDeriv, 5000);
  });
  derivSocket.on("error", () => { state.connection = "connection_error"; });
}

function createResearchSignals() {
  const hist = state.lastDigitHistory;
  if (hist.length < 50) return;
  const sample = hist.slice(0, 100);
  const counts = Array(10).fill(0);
  sample.forEach(d => counts[d]++);
  const high = sample.filter(d => d > 4).length / sample.length;
  const low = sample.filter(d => d < 5).length / sample.length;
  const rareDigit = counts.indexOf(Math.min(...counts));
  const commonDigit = counts.indexOf(Math.max(...counts));

  // Research-only signals. Historical frequency is NOT evidence of predictive edge.
  const last = state.lastDigitHistory[0];
  const key = `${last}-${sample.length}-${sample[0]}`;
  if (state._lastSignalKey === key) return;
  state._lastSignalKey = key;
  addSignal({
    market: state.market,
    type: "research",
    label: "Digit statistics updated",
    detail: `Sample ${sample.length} ticks; over-4 ${(high * 100).toFixed(1)}%, under-5 ${(low * 100).toFixed(1)}%. Most frequent digit ${commonDigit}; least frequent digit ${rareDigit}.`,
    confidence: null,
    disclaimer: "Descriptive statistics only; not a prediction."
  });
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Universal Trading Bot",
    startedAt: state.startedAt,
    mode: state.mode,
    derivConnection: state.connection,
    mt5Connected: state.mt5.connected
  });
});

app.get("/api/state", (req, res) => {
  res.json({
    ...state,
    lastDigitCounts: state.lastDigitHistory.reduce((acc, d) => {
      acc[d] = (acc[d] || 0) + 1; return acc;
    }, {})
  });
});

app.post("/api/market", (req, res) => {
  const allowed = new Set(["R_10", "R_25", "R_50", "R_75", "R_100", "1HZ10V", "1HZ25V", "1HZ50V", "1HZ75V", "1HZ100V"]);
  const symbol = String(req.body.symbol || "");
  if (!allowed.has(symbol)) return res.status(400).json({ error: "Unsupported symbol in this starter. Check current Deriv availability." });
  state.market = symbol;
  state.lastTick = null;
  state.lastDigitHistory = [];
  if (derivSocket) {
    try { derivSocket.close(); } catch {}
  }
  derivSocket = null;
  connectDeriv();
  res.json({ ok: true, market: symbol });
});

app.post("/api/mode", (req, res) => {
  const mode = req.body.mode;
  if (!["signals", "auto"].includes(mode)) return res.status(400).json({ error: "Mode must be signals or auto." });
  if (mode === "auto") {
    return res.status(409).json({
      error: "Live auto-execution is intentionally disabled in this starter. Add and test broker-specific execution, risk checks, and explicit authorization first."
    });
  }
  state.mode = "signals";
  res.json({ ok: true, mode: state.mode });
});

// Safe placeholder endpoint for a future, authenticated MT5 Expert Advisor bridge.
app.post("/api/mt5/status", (req, res) => {
  const secret = process.env.MT5_BRIDGE_SECRET;
  if (!secret || req.headers["x-bridge-secret"] !== secret) {
    return res.status(401).json({ error: "MT5 bridge not authorized. Configure MT5_BRIDGE_SECRET on the server." });
  }
  state.mt5.connected = true;
  state.mt5.lastMessage = String(req.body.message || "Bridge heartbeat received").slice(0, 200);
  res.json({ ok: true });
});

app.get("/api/mt5/status", (req, res) => res.json(state.mt5));

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => {
  console.log(`Universal Trading Bot running on port ${PORT}`);
  connectDeriv();
});
