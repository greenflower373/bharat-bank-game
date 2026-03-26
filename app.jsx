import { useState, useEffect, useCallback } from "react";

const STOCKS = [
  { id: "RELIANCE", name: "Reliance Industries", price: 2450, sector: "Energy" },
  { id: "TCS", name: "Tata Consultancy", price: 3780, sector: "IT" },
  { id: "HDFC", name: "HDFC Bank", price: 1620, sector: "Finance" },
  { id: "INFOSYS", name: "Infosys Ltd", price: 1480, sector: "IT" },
  { id: "WIPRO", name: "Wipro Ltd", price: 420, sector: "IT" },
  { id: "BAJAJ", name: "Bajaj Finance", price: 6800, sector: "Finance" },
];

const LOAN_TYPES = [
  { id: "home", name: "Home Loan", rate: 8.5, maxTenure: 240, minAmount: 500000, icon: "🏠" },
  { id: "personal", name: "Personal Loan", rate: 14.0, maxTenure: 60, minAmount: 50000, icon: "💳" },
  { id: "car", name: "Car Loan", rate: 9.5, maxTenure: 84, minAmount: 300000, icon: "🚗" },
  { id: "education", name: "Education Loan", rate: 10.5, maxTenure: 120, minAmount: 200000, icon: "🎓" },
];

function calcEMI(principal, annualRate, months) {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function fmt(n) {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + "Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + "L";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

const INITIAL_STATE = {
  playerName: "",
  balance: 500000,
  savingsBalance: 0,
  fdBalance: 0,
  accounts: [{ id: "ACC001", type: "Savings", balance: 500000, upiId: "player@bankgame" }],
  loans: [],
  portfolio: {},
  transactions: [],
  stockPrices: STOCKS.reduce((a, s) => ({ ...a, [s.id]: s.price }), {}),
  month: 1,
  netWorth: 500000,
  creditScore: 750,
  salary: 75000,
  gameStarted: false,
  notifications: [],
};

export default function App() {
  const [state, setState] = useState(INITIAL_STATE);
  const [screen, setScreen] = useState("home");
  const [modal, setModal] = useState(null);
  const [inputs, setInputs] = useState({});
  const [tab, setTab] = useState("overview");

  const addNotif = useCallback((msg, type = "info") => {
    const id = Date.now();
    setState(s => ({ ...s, notifications: [...s.notifications.slice(-4), { id, msg, type }] }));
    setTimeout(() => setState(s => ({ ...s, notifications: s.notifications.filter(n => n.id !== id) })), 3000);
  }, []);

  const addTxn = useCallback((desc, amount, type) => {
    const txn = { id: Date.now(), desc, amount, type, date: new Date().toLocaleDateString("en-IN") };
    setState(s => ({ ...s, transactions: [txn, ...s.transactions.slice(0, 49)] }));
  }, []);

  useEffect(() => {
    if (!state.gameStarted) return;
    const interval = setInterval(() => {
      setState(s => {
        const newPrices = { ...s.stockPrices };
        STOCKS.forEach(st => {
          const change = (Math.random() - 0.48) * 0.04;
          newPrices[st.id] = Math.max(50, Math.round(newPrices[st.id] * (1 + change)));
        });
        let newBalance = s.balance;
        let newLoans = s.loans.map(l => {
          if (l.remainingMonths > 0 && newBalance >= l.emi) {
            newBalance -= l.emi;
            return { ...l, remainingMonths: l.remainingMonths - 1, paid: l.paid + l.emi };
          }
          return l;
        });
        const portfolioValue = Object.entries(s.portfolio).reduce(
          (sum, [id, qty]) => sum + qty * newPrices[id], 0
        );
        const netWorth = newBalance + portfolioValue + s.savingsBalance + s.fdBalance;
        return { ...s, stockPrices: newPrices, balance: Math.round(newBalance), loans: newLoans, netWorth: Math.round(netWorth) };
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [state.gameStarted]);

  const startGame = () => {
    if (!inputs.name?.trim()) return;
    setState(s => ({ ...s, playerName: inputs.name, gameStarted: true }));
    setScreen("dashboard");
    addNotif(`Welcome ${inputs.name}! Your account is ready.`, "success");
  };

  const doUPI = () => {
    const amt = parseFloat(inputs.upiAmount);
    const toUpi = inputs.toUpi?.trim();
    if (!amt || amt <= 0 || !toUpi) return addNotif("Enter valid UPI details", "error");
    if (amt > state.balance) return addNotif("Insufficient balance!", "error");
    setState(s => ({ ...s, balance: Math.round(s.balance - amt) }));
    addTxn(`UPI to ${toUpi}`, amt, "debit");
    addNotif(`₹${amt.toLocaleString("en-IN")} sent to ${toUpi}`, "success");
    setModal(null);
    setInputs({});
  };

  const applyLoan = () => {
    const ltype = LOAN_TYPES.find(l => l.id === inputs.loanType);
    const amount = parseFloat(inputs.loanAmount);
    const tenure = parseInt(inputs.loanTenure);
    if (!ltype || !amount || !tenure) return addNotif("Fill all fields", "error");
    if (amount < ltype.minAmount) return addNotif(`Min amount: ${fmt(ltype.minAmount)}`, "error");
    if (tenure > ltype.maxTenure) return addNotif(`Max tenure: ${ltype.maxTenure} months`, "error");
    const emi = calcEMI(amount, ltype.rate, tenure);
    const loan = { id: `L${Date.now()}`, type: ltype.name, icon: ltype.icon, principal: amount, emi: Math.round(emi), rate: ltype.rate, totalMonths: tenure, remainingMonths: tenure, paid: 0 };
    setState(s => ({ ...s, loans: [...s.loans, loan], balance: Math.round(s.balance + amount), creditScore: Math.max(300, s.creditScore - 15) }));
    addTxn(`${ltype.name} disbursed`, amount, "credit");
    addNotif(`Loan approved! EMI: ${fmt(emi)}/month`, "success");
    setModal(null);
    setInputs({});
  };

  const buyStock = () => {
    const qty = parseInt(inputs.stockQty) || 1;
    const sid = inputs.selectedStock;
    if (!sid) return addNotif("Select a stock", "error");
    const price = state.stockPrices[sid];
    const total = price * qty;
    if (total > state.balance) return addNotif("Insufficient balance!", "error");
    setState(s => ({ ...s, balance: Math.round(s.balance - total), portfolio: { ...s.portfolio, [sid]: (s.portfolio[sid] || 0) + qty } }));
    addTxn(`Bought ${qty}x ${sid}`, total, "debit");
    addNotif(`Bought ${qty} shares of ${sid}`, "success");
    setModal(null);
    setInputs({});
  };

  const sellStock = (sid) => {
    const qty = parseInt(inputs[`sell_${sid}`]) || 1;
    const held = state.portfolio[sid] || 0;
    if (qty > held) return addNotif("Not enough shares", "error");
    const price = state.stockPrices[sid];
    const total = price * qty;
    const newPortfolio = { ...state.portfolio, [sid]: held - qty };
    if (newPortfolio[sid] === 0) delete newPortfolio[sid];
    setState(s => ({ ...s, balance: Math.round(s.balance + total), portfolio: newPortfolio }));
    addTxn(`Sold ${qty}x ${sid}`, total, "credit");
    addNotif(`Sold ${qty} shares of ${sid} for ${fmt(total)}`, "success");
  };

  const depositFD = () => {
    const amt = parseFloat(inputs.fdAmount);
    const months = parseInt(inputs.fdMonths) || 12;
    if (!amt || amt > state.balance) return addNotif("Invalid amount", "error");
    setState(s => ({ ...s, balance: Math.round(s.balance - amt), fdBalance: Math.round(s.fdBalance + amt * Math.pow(1 + 0.07 / 12, months)) }));
    addTxn(`FD created for ${months} months`, amt, "debit");
    addNotif(`FD created @ 7% for ${months} months`, "success");
    setModal(null);
    setInputs({});
  };

  const portfolioValue = Object.entries(state.portfolio).reduce((sum, [id, qty]) => sum + qty * state.stockPrices[id], 0);

  if (!state.gameStarted) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f1117 0%, #1a1f35 50%, #0f1117 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif" }}>
        <div style={{ textAlign: "center", color: "#fff", padding: "2rem" }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>🏦</div>
          <h1 style={{ fontSize: 42, fontWeight: 700, margin: "0 0 8px", background: "linear-gradient(90deg, #f5a623, #f7c948)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>BharatBank</h1>
          <p style={{ color: "#8892b0", fontSize: 16, marginBottom: 40 }}>India's Premier Banking Simulation</p>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(245,166,35,0.3)", borderRadius: 16, padding: "2rem", maxWidth: 380, margin: "0 auto" }}>
            <p style={{ color: "#ccd6f6", marginBottom: 20, fontSize: 14 }}>Start with ₹5,00,000 • Manage loans, stocks, UPI & more</p>
            <input
              placeholder="Enter your name"
              value={inputs.name || ""}
              onChange={e => setInputs({ name: e.target.value })}
              onKeyDown={e => e.key === "Enter" && startGame()}
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(245,166,35,0.4)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, boxSizing: "border-box", marginBottom: 16, outline: "none" }}
            />
            <button onClick={startGame} style={{ width: "100%", padding: "14px", borderRadius: 10, background: "linear-gradient(90deg, #f5a623, #f7c948)", border: "none", color: "#0f1117", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
              Open Account →
            </button>
          </div>
          <p style={{ color: "#4a5568", fontSize: 12, marginTop: 32 }}>Features: UPI Payments • Loans & EMI • Stock Market • Fixed Deposits</p>
        </div>
      </div>
    );
  }

  const screens = {
    dashboard: <Dashboard state={state} setModal={setModal} setScreen={setScreen} portfolioValue={portfolioValue} />,
    accounts: <Accounts state={state} setModal={setModal} addNotif={addNotif} addTxn={addTxn} setState={setState} />,
    loans: <Loans state={state} setModal={setModal} inputs={inputs} setInputs={setInputs} applyLoan={applyLoan} />,
    stocks: <Stocks state={state} setModal={setModal} inputs={inputs} setInputs={setInputs} buyStock={buyStock} sellStock={sellStock} portfolioValue={portfolioValue} />,
    transactions: <Transactions state={state} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#ccd6f6", fontFamily: "'Segoe UI', sans-serif" }}>
      <nav style={{ background: "#1a1f35", borderBottom: "1px solid rgba(245,166,35,0.2)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🏦</span>
          <span style={{ fontWeight: 700, color: "#f5a623", fontSize: 18 }}>BharatBank</span>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["dashboard", "accounts", "loans", "stocks", "transactions"].map(s => (
            <button key={s} onClick={() => setScreen(s)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: screen === s ? "rgba(245,166,35,0.2)" : "transparent", color: screen === s ? "#f5a623" : "#8892b0", cursor: "pointer", fontSize: 13, textTransform: "capitalize" }}>
              {s === "dashboard" ? "🏠" : s === "accounts" ? "💰" : s === "loans" ? "🏛" : s === "stocks" ? "📈" : "📋"} {s}
            </button>
          ))}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#8892b0" }}>{state.playerName}</div>
          <div style={{ fontSize: 13, color: "#f5a623", fontWeight: 600 }}>{fmt(state.balance)}</div>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        {screens[screen]}
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: "#1a1f35", border: "1px solid rgba(245,166,35,0.3)", borderRadius: 16, padding: "24px", width: "100%", maxWidth: 440 }}>
            {modal === "upi" && <UPIModal inputs={inputs} setInputs={setInputs} doUPI={doUPI} onClose={() => setModal(null)} />}
            {modal === "loan" && <LoanModal inputs={inputs} setInputs={setInputs} applyLoan={applyLoan} onClose={() => setModal(null)} />}
            {modal === "stock" && <StockModal inputs={inputs} setInputs={setInputs} buyStock={buyStock} state={state} onClose={() => setModal(null)} />}
            {modal === "fd" && <FDModal inputs={inputs} setInputs={setInputs} depositFD={depositFD} onClose={() => setModal(null)} />}
          </div>
        </div>
      )}

      <div style={{ position: "fixed", bottom: 20, right: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 300 }}>
        {state.notifications.map(n => (
          <div key={n.id} style={{ background: n.type === "error" ? "#3d1515" : n.type === "success" ? "#0d3321" : "#1a2540", border: `1px solid ${n.type === "error" ? "#e53e3e" : n.type === "success" ? "#38a169" : "#4a5568"}`, borderRadius: 10, padding: "10px 16px", color: "#fff", fontSize: 13, maxWidth: 280, animation: "slideIn 0.3s ease" }}>
            {n.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: "#1a1f35", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px", ...style }}>{children}</div>;
}

function StatCard({ label, value, color = "#f5a623", sub }) {
  return (
    <div style={{ background: "#141927", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px" }}>
      <div style={{ fontSize: 12, color: "#8892b0", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#4a5568", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Dashboard({ state, setModal, setScreen, portfolioValue }) {
  return (
    <div>
      <h2 style={{ color: "#fff", marginBottom: 20, fontSize: 22 }}>Welcome back, {state.playerName} 👋</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="Account Balance" value={fmt(state.balance)} color="#f5a623" />
        <StatCard label="Net Worth" value={fmt(state.netWorth)} color="#68d391" />
        <StatCard label="Portfolio Value" value={fmt(portfolioValue)} color="#63b3ed" sub={`${Object.keys(state.portfolio).length} stocks`} />
        <StatCard label="Credit Score" value={state.creditScore} color={state.creditScore > 700 ? "#68d391" : "#fc8181"} sub={state.creditScore > 750 ? "Excellent" : state.creditScore > 650 ? "Good" : "Fair"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { icon: "💸", label: "Send Money (UPI)", color: "#805ad5", action: () => setModal("upi") },
          { icon: "🏛", label: "Apply for Loan", color: "#e53e3e", action: () => setModal("loan") },
          { icon: "📈", label: "Invest in Stocks", color: "#38a169", action: () => setModal("stock") },
          { icon: "🏦", label: "Fixed Deposit", color: "#dd6b20", action: () => setModal("fd") },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action} style={{ background: `${btn.color}22`, border: `1px solid ${btn.color}55`, borderRadius: 12, padding: "18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, color: "#fff", fontSize: 14, fontWeight: 500 }}>
            <span style={{ fontSize: 28 }}>{btn.icon}</span>{btn.label}
          </button>
        ))}
      </div>
      {state.loans.filter(l => l.remainingMonths > 0).length > 0 && (
        <Card>
          <h3 style={{ color: "#fc8181", marginBottom: 12, fontSize: 15 }}>Active EMIs</h3>
          {state.loans.filter(l => l.remainingMonths > 0).map(l => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color: "#ccd6f6" }}>{l.icon} {l.type}</span>
              <span style={{ color: "#fc8181" }}>{fmt(l.emi)}/mo · {l.remainingMonths} left</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Accounts({ state, setModal, addNotif, addTxn, setState }) {
  const [transferAmt, setTransferAmt] = useState("");
  return (
    <div>
      <h2 style={{ color: "#fff", marginBottom: 20 }}>My Accounts</h2>
      <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "#8892b0" }}>Savings Account</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#f5a623", margin: "4px 0" }}>{fmt(state.balance)}</div>
              <div style={{ fontSize: 12, color: "#8892b0" }}>UPI: {state.accounts[0].upiId}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#8892b0" }}>ACC001</div>
              <button onClick={() => setModal("upi")} style={{ marginTop: 8, padding: "8px 16px", background: "#805ad5", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13 }}>Send UPI 💸</button>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "#8892b0" }}>Fixed Deposits</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#f5a623", margin: "4px 0" }}>{fmt(state.fdBalance)}</div>
              <div style={{ fontSize: 12, color: "#68d391" }}>7% p.a. interest</div>
            </div>
            <button onClick={() => setModal("fd")} style={{ padding: "8px 16px", background: "#dd6b2033", border: "1px solid #dd6b2055", borderRadius: 8, color: "#dd6b20", cursor: "pointer", fontSize: 13 }}>+ New FD</button>
          </div>
        </Card>
      </div>
      <Card>
        <h3 style={{ color: "#fff", marginBottom: 16 }}>Self Transfer</h3>
        <div style={{ display: "flex", gap: 12 }}>
          <input value={transferAmt} onChange={e => setTransferAmt(e.target.value)} placeholder="Amount" type="number" style={{ flex: 1, padding: "10px", background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14 }} />
          <button onClick={() => {
            const amt = parseFloat(transferAmt);
            if (!amt || amt > state.balance) return addNotif("Invalid amount", "error");
            setState(s => ({ ...s, balance: Math.round(s.balance - amt), savingsBalance: Math.round(s.savingsBalance + amt) }));
            addTxn("Transfer to wallet", amt, "debit");
            addNotif(`${fmt(amt)} moved to wallet`, "success");
            setTransferAmt("");
          }} style={{ padding: "10px 20px", background: "#38a16933", border: "1px solid #38a16955", borderRadius: 8, color: "#68d391", cursor: "pointer", fontSize: 13 }}>Transfer</button>
        </div>
      </Card>
    </div>
  );
}

function Loans({ state, setModal }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: "#fff" }}>Loans & EMI</h2>
        <button onClick={() => setModal("loan")} style={{ padding: "10px 20px", background: "#e53e3e33", border: "1px solid #e53e3e55", borderRadius: 10, color: "#fc8181", cursor: "pointer" }}>+ Apply Loan</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        {LOAN_TYPES.map(lt => (
          <div key={lt.id} style={{ background: "#141927", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 24 }}>{lt.icon}</div>
            <div style={{ color: "#fff", fontWeight: 600, marginTop: 8 }}>{lt.name}</div>
            <div style={{ color: "#f5a623", fontSize: 13, marginTop: 4 }}>{lt.rate}% p.a.</div>
            <div style={{ color: "#8892b0", fontSize: 12 }}>Up to {lt.maxTenure} months</div>
          </div>
        ))}
      </div>
      {state.loans.length === 0 ? (
        <Card><p style={{ color: "#4a5568", textAlign: "center" }}>No active loans. Apply for a loan to get started.</p></Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {state.loans.map(l => {
            const progress = ((l.totalMonths - l.remainingMonths) / l.totalMonths) * 100;
            return (
              <Card key={l.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div><span style={{ fontSize: 20 }}>{l.icon}</span> <span style={{ color: "#fff", fontWeight: 600 }}>{l.type}</span></div>
                  <span style={{ color: l.remainingMonths === 0 ? "#68d391" : "#fc8181", fontSize: 12 }}>{l.remainingMonths === 0 ? "✓ Closed" : `${l.remainingMonths} months left`}</span>
                </div>
                <div style={{ display: "flex", gap: 24, fontSize: 13, marginBottom: 12 }}>
                  <div><div style={{ color: "#8892b0" }}>Principal</div><div style={{ color: "#f5a623" }}>{fmt(l.principal)}</div></div>
                  <div><div style={{ color: "#8892b0" }}>EMI</div><div style={{ color: "#fc8181" }}>{fmt(l.emi)}/mo</div></div>
                  <div><div style={{ color: "#8892b0" }}>Rate</div><div style={{ color: "#ccd6f6" }}>{l.rate}%</div></div>
                </div>
                <div style={{ background: "#0f1117", borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #f5a623, #f7c948)", borderRadius: 4, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 11, color: "#4a5568", marginTop: 4 }}>{progress.toFixed(0)}% repaid</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stocks({ state, setModal, inputs, setInputs, sellStock, portfolioValue }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: "#fff" }}>Stock Market</h2>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#8892b0" }}>Portfolio</div>
          <div style={{ color: "#68d391", fontWeight: 700 }}>{fmt(portfolioValue)}</div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
        {STOCKS.map(stock => {
          const price = state.stockPrices[stock.id];
          const held = state.portfolio[stock.id] || 0;
          const orig = stock.price;
          const change = ((price - orig) / orig * 100).toFixed(1);
          const up = price >= orig;
          return (
            <Card key={stock.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "#fff" }}>{stock.id}</span>
                    <span style={{ fontSize: 11, color: "#8892b0", background: "#ffffff10", padding: "2px 8px", borderRadius: 4 }}>{stock.sector}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#8892b0" }}>{stock.name}</div>
                </div>
                <div style={{ textAlign: "right", minWidth: 80 }}>
                  <div style={{ color: "#fff", fontWeight: 600 }}>₹{price.toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: 12, color: up ? "#68d391" : "#fc8181" }}>{up ? "▲" : "▼"} {Math.abs(change)}%</div>
                </div>
                <button onClick={() => setModal("stock")} style={{ padding: "6px 12px", background: "#38a16933", border: "1px solid #38a16955", borderRadius: 8, color: "#68d391", cursor: "pointer", fontSize: 12 }}>Buy</button>
                {held > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "#8892b0" }}>{held} held</span>
                    <input value={inputs[`sell_${stock.id}`] || ""} onChange={e => setInputs({ ...inputs, [`sell_${stock.id}`]: e.target.value })} placeholder="qty" type="number" style={{ width: 50, padding: "4px 6px", background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#fff", fontSize: 12 }} />
                    <button onClick={() => sellStock(stock.id)} style={{ padding: "6px 10px", background: "#e53e3e33", border: "1px solid #e53e3e55", borderRadius: 8, color: "#fc8181", cursor: "pointer", fontSize: 12 }}>Sell</button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Transactions({ state }) {
  return (
    <div>
      <h2 style={{ color: "#fff", marginBottom: 20 }}>Transaction History</h2>
      {state.transactions.length === 0 ? (
        <Card><p style={{ color: "#4a5568", textAlign: "center" }}>No transactions yet.</p></Card>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {state.transactions.map(t => (
            <div key={t.id} style={{ background: "#141927", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#ccd6f6", fontSize: 14 }}>{t.desc}</div>
                <div style={{ color: "#4a5568", fontSize: 12 }}>{t.date}</div>
              </div>
              <div style={{ color: t.type === "credit" ? "#68d391" : "#fc8181", fontWeight: 600, fontSize: 15 }}>
                {t.type === "credit" ? "+" : "-"}{fmt(t.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UPIModal({ inputs, setInputs, doUPI, onClose }) {
  return (
    <div>
      <h3 style={{ color: "#fff", marginBottom: 20 }}>💸 Send via UPI</h3>
      <label style={{ color: "#8892b0", fontSize: 13 }}>UPI ID / Phone</label>
      <input value={inputs.toUpi || ""} onChange={e => setInputs({ ...inputs, toUpi: e.target.value })} placeholder="name@upi / 9876543210" style={{ width: "100%", padding: 12, background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box", marginTop: 6, marginBottom: 16 }} />
      <label style={{ color: "#8892b0", fontSize: 13 }}>Amount (₹)</label>
      <input value={inputs.upiAmount || ""} onChange={e => setInputs({ ...inputs, upiAmount: e.target.value })} type="number" placeholder="0" style={{ width: "100%", padding: 12, background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 18, boxSizing: "border-box", marginTop: 6, marginBottom: 20 }} />
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8892b0", cursor: "pointer" }}>Cancel</button>
        <button onClick={doUPI} style={{ flex: 2, padding: 12, background: "#805ad5", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Send Money 💸</button>
      </div>
    </div>
  );
}

function LoanModal({ inputs, setInputs, applyLoan, onClose }) {
  const ltype = LOAN_TYPES.find(l => l.id === inputs.loanType);
  const emi = ltype && inputs.loanAmount && inputs.loanTenure ? calcEMI(parseFloat(inputs.loanAmount), ltype.rate, parseInt(inputs.loanTenure)) : null;
  return (
    <div>
      <h3 style={{ color: "#fff", marginBottom: 20 }}>🏛 Apply for Loan</h3>
      <label style={{ color: "#8892b0", fontSize: 13 }}>Loan Type</label>
      <select value={inputs.loanType || ""} onChange={e => setInputs({ ...inputs, loanType: e.target.value })} style={{ width: "100%", padding: 12, background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box", marginTop: 6, marginBottom: 12 }}>
        <option value="">Select type</option>
        {LOAN_TYPES.map(lt => <option key={lt.id} value={lt.id}>{lt.icon} {lt.name} @ {lt.rate}%</option>)}
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ color: "#8892b0", fontSize: 13 }}>Amount (₹)</label>
          <input value={inputs.loanAmount || ""} onChange={e => setInputs({ ...inputs, loanAmount: e.target.value })} type="number" placeholder={ltype ? ltype.minAmount : "500000"} style={{ width: "100%", padding: 10, background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box", marginTop: 6 }} />
        </div>
        <div>
          <label style={{ color: "#8892b0", fontSize: 13 }}>Tenure (months)</label>
          <input value={inputs.loanTenure || ""} onChange={e => setInputs({ ...inputs, loanTenure: e.target.value })} type="number" placeholder={ltype ? ltype.maxTenure : "120"} style={{ width: "100%", padding: 10, background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box", marginTop: 6 }} />
        </div>
      </div>
      {emi && <div style={{ background: "#0d3321", border: "1px solid #38a169", borderRadius: 8, padding: 12, marginBottom: 16, textAlign: "center" }}>
        <div style={{ color: "#8892b0", fontSize: 13 }}>Monthly EMI</div>
        <div style={{ color: "#68d391", fontSize: 22, fontWeight: 700 }}>{fmt(emi)}</div>
      </div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8892b0", cursor: "pointer" }}>Cancel</button>
        <button onClick={applyLoan} style={{ flex: 2, padding: 12, background: "#e53e3e", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Apply Now</button>
      </div>
    </div>
  );
}

function StockModal({ inputs, setInputs, buyStock, state, onClose }) {
  const price = inputs.selectedStock ? state.stockPrices[inputs.selectedStock] : 0;
  const qty = parseInt(inputs.stockQty) || 1;
  return (
    <div>
      <h3 style={{ color: "#fff", marginBottom: 20 }}>📈 Buy Stocks</h3>
      <label style={{ color: "#8892b0", fontSize: 13 }}>Stock</label>
      <select value={inputs.selectedStock || ""} onChange={e => setInputs({ ...inputs, selectedStock: e.target.value })} style={{ width: "100%", padding: 12, background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box", marginTop: 6, marginBottom: 12 }}>
        <option value="">Select stock</option>
        {STOCKS.map(s => <option key={s.id} value={s.id}>{s.id} — ₹{state.stockPrices[s.id].toLocaleString("en-IN")}</option>)}
      </select>
      <label style={{ color: "#8892b0", fontSize: 13 }}>Quantity</label>
      <input value={inputs.stockQty || ""} onChange={e => setInputs({ ...inputs, stockQty: e.target.value })} type="number" placeholder="1" min="1" style={{ width: "100%", padding: 12, background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box", marginTop: 6, marginBottom: 12 }} />
      {price > 0 && <div style={{ background: "#0d3321", border: "1px solid #38a169", borderRadius: 8, padding: 12, marginBottom: 16, textAlign: "center" }}>
        <div style={{ color: "#8892b0", fontSize: 13 }}>Total Cost</div>
        <div style={{ color: "#68d391", fontSize: 22, fontWeight: 700 }}>₹{(price * qty).toLocaleString("en-IN")}</div>
      </div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8892b0", cursor: "pointer" }}>Cancel</button>
        <button onClick={buyStock} style={{ flex: 2, padding: 12, background: "#38a169", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Buy Stock 📈</button>
      </div>
    </div>
  );
}

function FDModal({ inputs, setInputs, depositFD, onClose }) {
  const amt = parseFloat(inputs.fdAmount) || 0;
  const months = parseInt(inputs.fdMonths) || 12;
  const maturity = amt * Math.pow(1 + 0.07 / 12, months);
  return (
    <div>
      <h3 style={{ color: "#fff", marginBottom: 20 }}>🏦 Fixed Deposit</h3>
      <label style={{ color: "#8892b0", fontSize: 13 }}>Deposit Amount (₹)</label>
      <input value={inputs.fdAmount || ""} onChange={e => setInputs({ ...inputs, fdAmount: e.target.value })} type="number" placeholder="100000" style={{ width: "100%", padding: 12, background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box", marginTop: 6, marginBottom: 12 }} />
      <label style={{ color: "#8892b0", fontSize: 13 }}>Tenure (months)</label>
      <input value={inputs.fdMonths || ""} onChange={e => setInputs({ ...inputs, fdMonths: e.target.value })} type="number" placeholder="12" min="1" max="120" style={{ width: "100%", padding: 12, background: "#0f1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box", marginTop: 6, marginBottom: 12 }} />
      {amt > 0 && <div style={{ background: "#2d1b0e", border: "1px solid #dd6b20", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#8892b0", fontSize: 13 }}>Interest Rate</span><span style={{ color: "#f5a623" }}>7% p.a.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ color: "#8892b0", fontSize: 13 }}>Maturity Amount</span><span style={{ color: "#dd6b20", fontWeight: 700, fontSize: 16 }}>₹{Math.round(maturity).toLocaleString("en-IN")}</span>
        </div>
      </div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8892b0", cursor: "pointer" }}>Cancel</button>
        <button onClick={depositFD} style={{ flex: 2, padding: 12, background: "#dd6b20", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Create FD 🏦</button>
      </div>
    </div>
  );
}
