# 🏦 BharatBank — India Banking Simulation Game

A full-featured India-themed banking simulation game built with React. Play as a customer managing your finances with UPI payments, stock investments, loans, and fixed deposits.

## 🎮 Features

| Feature | Details |
|---|---|
| 💰 **Accounts** | Savings account, wallet transfers, account overview |
| 💸 **UPI Payments** | Send money to any UPI ID or phone number |
| 🏛 **Loans & EMI** | Home, Personal, Car, Education loans with live EMI calculator |
| 📈 **Stock Market** | Buy/sell NSE stocks (Reliance, TCS, Infosys, etc.) with live price simulation |
| 🏦 **Fixed Deposits** | Create FDs at 7% p.a. with maturity calculator |
| 📊 **Credit Score** | Dynamic score based on loan behaviour |
| 📋 **Transactions** | Full history of all debits and credits |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org))
- npm or yarn

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/bharat-bank-game.git
cd bharat-bank-game

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## 📱 Mobile Support

The game is fully responsive and works on:
- Desktop browsers (Chrome, Firefox, Edge, Safari)
- Mobile browsers (Android Chrome, iOS Safari)
- Tablet

## 🌐 Deploy to GitHub Pages (Free Hosting)

```bash
# 1. Add homepage to package.json
#    "homepage": "https://YOUR_USERNAME.github.io/bharat-bank-game"

# 2. Install gh-pages
npm install --save-dev gh-pages

# 3. Add scripts to package.json
#    "predeploy": "npm run build"
#    "deploy": "gh-pages -d dist"

# 4. Deploy
npm run deploy
```

## 📁 Project Structure

```
bharat-bank-game/
├── src/
│   ├── App.jsx        # Main game component (all screens)
│   └── main.jsx       # React entry point
├── index.html         # HTML entry
├── vite.config.js     # Vite config
├── package.json
└── README.md
```

## 🎯 Gameplay Tips

- Start by exploring your Dashboard to see account balance
- Send UPI payments to simulate daily transactions
- Apply for a Home Loan to get more capital (EMI auto-deducted)
- Buy stocks and watch prices fluctuate every 3 seconds
- Create Fixed Deposits to earn passive interest at 7% p.a.
- Keep your Credit Score above 700 for better loan eligibility

## 🔮 Roadmap / Future Features

- [ ] Mutual Funds (SIP)
- [ ] GST & Tax filing mini-game
- [ ] Multiple player accounts
- [ ] Leaderboard (net worth ranking)
- [ ] Random life events (medical emergency, job loss, bonus)
- [ ] RBI policy rate changes affecting loan rates
- [ ] Save/load game state (localStorage)

## 🛠 Tech Stack

- **React 18** — UI framework
- **Vite** — Build tool
- **Pure CSS** — No UI library (fully custom dark theme)

## 📄 License

MIT License — Free to use, modify, and distribute.

---

Made with ❤️ for Indian banking enthusiasts
