# FoodBot Chrome Extension - Quick Start

Get up and running in 5 minutes! ⚡

## Prerequisites

- Node.js 18+ installed
- Chrome browser
- Claude API key ([Get one here](https://console.anthropic.com/))

## Installation (2 minutes)

```bash
# 1. Navigate to project directory
cd /Users/arpan1.mukherjee/code/FoodBot/chrome-extension

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build
```

## Load in Chrome (1 minute)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Done! ✅

## First Order (2 minutes)

1. Open [Swiggy.com](https://www.swiggy.com) in Chrome
2. Click the **FoodBot icon** in Chrome toolbar
3. Enter: `"I want to order a pizza from Domino's"`
4. Click **Start Order**
5. Watch it work! 🎉

## What's Next?

- **Configure API Key**: Click Settings in the popup
- **Read Docs**: Check out [README.md](./README.md)
- **Detailed Setup**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Architecture**: Read [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

## Troubleshooting

### Extension not loading?

```bash
# Rebuild
npm run build

# Check dist/ folder exists
ls dist/
```

### Changes not showing?

1. Go to `chrome://extensions/`
2. Click **reload icon** on FoodBot card

### Need help?

- Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) Troubleshooting section
- Open an issue on GitHub

---

**Happy ordering! 🍕**
