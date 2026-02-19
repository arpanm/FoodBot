# FoodBot Chrome Extension - Complete Setup Guide

This guide walks you through the complete setup process for the FoodBot Chrome Extension, from installation to testing.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Building the Extension](#building-the-extension)
4. [Loading in Chrome](#loading-in-chrome)
5. [Configuration](#configuration)
6. [Testing the Extension](#testing-the-extension)
7. [Development Workflow](#development-workflow)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

1. **Node.js 18+**
   ```bash
   # Check your version
   node --version

   # If you need to install/update, visit:
   # https://nodejs.org/
   ```

2. **npm (comes with Node.js)**
   ```bash
   # Check your version
   npm --version
   ```

3. **Chrome Browser (latest version)**
   ```bash
   # Visit: https://www.google.com/chrome/
   ```

4. **Claude API Key**
   - Sign up at [Anthropic Console](https://console.anthropic.com/)
   - Create an API key
   - Keep it safe - you'll need it later

### Optional Tools

- **Git** (for version control)
- **VS Code** (recommended IDE)

## Installation

### 1. Navigate to Project Directory

```bash
cd /Users/arpan1.mukherjee/code/FoodBot/chrome-extension
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- TypeScript
- Webpack and related loaders
- ESLint and TypeScript ESLint
- Anthropic SDK
- Type definitions for Chrome APIs

**Expected output:**
```
added 250+ packages in 30s
```

### 3. Verify Installation

```bash
# Check if TypeScript is installed
npx tsc --version

# Check if Webpack is installed
npx webpack --version

# Check if ESLint is installed
npx eslint --version
```

## Building the Extension

### Development Build (with watch mode)

For active development with automatic rebuilds:

```bash
npm run dev
```

This will:
- Compile TypeScript to JavaScript
- Bundle all modules
- Copy manifest and assets
- Watch for file changes and rebuild automatically
- Create source maps for debugging

**Keep this terminal open while developing.**

### Production Build

For final release:

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

### Verify Build Output

Check that the `dist/` folder contains:

```bash
ls -la dist/

# Expected files:
# - background/service-worker.js
# - content-scripts/swiggy-content.js
# - ui/popup.html
# - ui/popup.js
# - manifest.json
# - images/ (if you added icons)
```

## Loading in Chrome

### Step 1: Open Chrome Extensions Page

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Or use menu: **⋮ (Menu)** → **More Tools** → **Extensions**

### Step 2: Enable Developer Mode

1. Find the **Developer mode** toggle in the top-right corner
2. Click to enable it
3. New buttons will appear: "Load unpacked", "Pack extension", "Update"

### Step 3: Load the Extension

1. Click **"Load unpacked"**
2. Navigate to `/Users/arpan1.mukherjee/code/FoodBot/chrome-extension/dist/`
3. Select the `dist` folder
4. Click **"Select"** or **"Open"**

### Step 4: Verify Installation

You should see:
- FoodBot extension card in the extensions list
- Extension ID (e.g., `abcdefghijklmnopqrstuvwxyz123456`)
- Status: **Enabled**
- FoodBot icon in Chrome toolbar (if icons are added)

### Pinning the Extension

1. Click the **puzzle icon** (Extensions) in Chrome toolbar
2. Find **FoodBot**
3. Click the **pin icon** to keep it visible

## Configuration

### Configure Claude API Key

#### Method 1: Through Extension UI (Recommended)

1. Click the **FoodBot icon** in Chrome toolbar
2. Click **"Settings"** link in the popup
3. Enter your Claude API key
4. Click **"Save"**

#### Method 2: Directly in Chrome Storage

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Expand **Storage** → **Local Storage**
4. Find the extension's storage
5. Add key: `claude_api_key` with your API key as value

### Configure Default Location (Optional)

1. Open the extension popup
2. Enter your default location in the "Location" field
3. This will be saved for future orders

## Testing the Extension

### Test 1: Extension Loads Successfully

1. Click the FoodBot icon
2. Popup should open with:
   - Title: "FoodBot"
   - Input field: "What would you like to order?"
   - Location field
   - "Start Order" button

### Test 2: Navigate to Supported Platform

1. Open a new tab
2. Navigate to [https://www.swiggy.com](https://www.swiggy.com)
3. Click the FoodBot icon
4. Should see message: "Navigate to Swiggy.com or Zomato.com to start ordering"

### Test 3: Check Content Script Injection

1. On Swiggy.com, open Chrome DevTools (F12)
2. Go to **Console** tab
3. Look for log: `"FoodBot Swiggy content script loaded"`
4. If you see this, content script is working

### Test 4: Check Background Service Worker

1. Go to `chrome://extensions/`
2. Find FoodBot extension
3. Click **"service worker"** link (under "Inspect views")
4. DevTools opens for the background script
5. Look for log: `"FoodBot Background Service Worker v1.0.0 initialized"`

### Test 5: Test Basic Order Flow (without API key)

1. On Swiggy.com
2. Click FoodBot icon
3. Enter: "I want to order a pizza"
4. Click "Start Order"
5. Should see status update in popup
6. Check console for logs

### Test 6: Test with API Key

1. Configure your Claude API key (see Configuration section)
2. Navigate to Swiggy.com
3. Click FoodBot icon
4. Enter a specific order request:
   ```
   I want to order a large pepperoni pizza from Domino's
   ```
5. Add location if needed
6. Click "Start Order"
7. Watch the extension work:
   - Status updates in popup
   - Actions executed on the page
   - Console logs in DevTools

## Development Workflow

### Recommended Setup

1. **Terminal 1**: Run development build
   ```bash
   npm run dev
   ```

2. **Terminal 2**: Run linter on file save
   ```bash
   npm run lint -- --watch
   ```

3. **Chrome**: Load extension and keep DevTools open

### Making Changes

1. Edit source files in `src/`
2. Webpack automatically rebuilds (if using `npm run dev`)
3. Reload extension in Chrome:
   - Go to `chrome://extensions/`
   - Click **reload icon** on FoodBot card
   - Or click **"Update"** button at top
4. Test changes

### Common Development Tasks

#### Add a New Message Type

1. Edit `src/shared/types.ts`
2. Add new enum value to `MessageType`
3. Update message handlers in:
   - `src/background/service-worker.ts`
   - `src/content-scripts/swiggy-content.ts`
4. Rebuild and test

#### Add a New Browser Action

1. Edit `src/shared/types.ts`
2. Add new enum value to `BrowserAction`
3. Implement handler in `src/content-scripts/swiggy-content.ts`
4. Update LLM prompt in `src/llm/claude-client.ts`
5. Rebuild and test

#### Update Selectors

1. Inspect Swiggy website elements
2. Edit `src/shared/constants.ts`
3. Update `SWIGGY_SELECTORS` object
4. Test with content script

#### Add Zomato Support

1. Create `src/content-scripts/zomato-content.ts`
2. Add Zomato selectors to constants
3. Update manifest.json content scripts
4. Add entry point to webpack.config.js
5. Implement Zomato-specific logic

### Code Quality Checks

Before committing:

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Type check
npm run type-check

# Run all checks
npm run lint && npm run type-check && npm run build
```

## Troubleshooting

### Issue: Extension Not Appearing in Chrome

**Symptoms:**
- Extension doesn't show up after loading
- No errors displayed

**Solutions:**
1. Verify you loaded the `dist/` folder, not the root folder
2. Check manifest.json exists in dist/
3. Run build again: `npm run build`
4. Check for errors in `chrome://extensions/`

### Issue: Build Fails

**Symptoms:**
```
ERROR in ...
Module not found
```

**Solutions:**
1. Delete `node_modules/` and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Clear webpack cache:
   ```bash
   npm run clean
   npm run build
   ```
3. Check Node.js version: `node --version` (should be 18+)

### Issue: TypeScript Errors

**Symptoms:**
```
TS2304: Cannot find name 'chrome'
TS2339: Property does not exist
```

**Solutions:**
1. Ensure `@types/chrome` is installed:
   ```bash
   npm install --save-dev @types/chrome
   ```
2. Check `tsconfig.json` includes `"types": ["chrome"]`
3. Restart your IDE

### Issue: Content Script Not Loading

**Symptoms:**
- No console log from content script
- Actions don't work on Swiggy

**Solutions:**
1. Check you're on `https://www.swiggy.com`
2. Reload the extension in `chrome://extensions/`
3. Check manifest.json host permissions
4. Look for errors in DevTools console
5. Verify content script is in dist/ folder

### Issue: Background Service Worker Crashes

**Symptoms:**
- Service worker shows as "inactive" in chrome://extensions/
- Messages not being received

**Solutions:**
1. Check DevTools console for service worker (click "service worker" link)
2. Look for unhandled promise rejections
3. Reload extension
4. Check for infinite loops or memory leaks

### Issue: API Key Not Working

**Symptoms:**
- "Claude API key not configured" error
- Authentication errors

**Solutions:**
1. Verify API key is correct
2. Check API key has proper permissions in Anthropic Console
3. Ensure no extra spaces in API key
4. Check storage:
   ```javascript
   // In DevTools console
   chrome.storage.local.get('claude_api_key', (result) => {
     console.log(result);
   });
   ```

### Issue: Webpack Build Warnings

**Symptoms:**
```
WARNING in asset size limit
```

**Solutions:**
- These are typically just warnings, not errors
- You can ignore them for development
- For production, consider code splitting

### Issue: Extension Updates Not Reflected

**Symptoms:**
- Changes don't appear after rebuild
- Old code still running

**Solutions:**
1. Hard reload extension:
   - Go to `chrome://extensions/`
   - Click **remove** (trash icon)
   - Click **Load unpacked** again
2. Clear Chrome cache:
   - Settings → Privacy → Clear browsing data
   - Check "Cached images and files"
3. Close and reopen Chrome

## Advanced Configuration

### Custom API Endpoint

To use a custom backend API:

1. Edit `src/shared/constants.ts`
2. Update `API_CONFIG.PRODUCTION_URL`
3. Rebuild extension

### Enable Debug Logging

1. Edit `src/shared/constants.ts`
2. Set `FEATURE_FLAGS.ENABLE_DEBUG_LOGGING = true`
3. Rebuild extension

### Adjust Timeouts

1. Edit `src/shared/constants.ts`
2. Modify values in `TIMEOUTS` object
3. Rebuild extension

## Next Steps

1. **Read the Documentation**: Review `README.md` for architecture details
2. **Explore the Code**: Start with `src/background/service-worker.ts`
3. **Test on Swiggy**: Try placing a real order (in test mode)
4. **Contribute**: Add features, fix bugs, improve documentation

## Getting Help

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check README.md and code comments
- **Console Logs**: Always check Chrome DevTools console
- **API Documentation**: [Anthropic API Docs](https://docs.anthropic.com/)

---

**Happy Coding! 🚀**
