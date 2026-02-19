# FoodBot Chrome Extension

AI-powered Chrome extension for automated food ordering on Swiggy and Zomato using Claude AI.

## Features

- **AI-Powered Automation**: Uses Claude AI to understand user intent and navigate food ordering platforms
- **Multi-Platform Support**: Works with Swiggy (Zomato support coming soon)
- **Intelligent Decision Making**: Analyzes page content and makes smart decisions about what actions to take
- **Real-time Status Updates**: Shows progress as the order is being placed
- **Session Management**: Tracks order sessions and maintains context

## Architecture

```
chrome-extension/
├── src/
│   ├── background/          # Background service worker
│   │   └── service-worker.ts
│   ├── content-scripts/     # Content scripts for web pages
│   │   └── swiggy-content.ts
│   ├── ui/                  # Popup UI
│   │   ├── popup.html
│   │   └── popup.ts
│   ├── shared/              # Shared types and constants
│   │   ├── types.ts
│   │   └── constants.ts
│   └── llm/                 # Claude AI client
│       └── claude-client.ts
├── dist/                    # Build output (generated)
├── images/                  # Extension icons
├── manifest.json            # Extension manifest (Manifest V3)
├── package.json
├── tsconfig.json
└── webpack.config.js
```

## Prerequisites

- Node.js 18+ and npm
- Chrome browser (latest version)
- Claude API key (get one from [Anthropic Console](https://console.anthropic.com/))

## Setup Instructions

### 1. Install Dependencies

```bash
cd chrome-extension
npm install
```

### 2. Configure Claude API Key

You'll need to configure your Claude API key through the extension after loading it.

### 3. Build the Extension

For development (with watch mode):
```bash
npm run dev
```

For production build:
```bash
npm run build
```

This will create a `dist/` folder with the compiled extension.

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `chrome-extension/dist/` folder
5. The FoodBot extension should now appear in your extensions list

### 5. Configure API Key

1. Click the FoodBot extension icon
2. Go to Settings
3. Enter your Claude API key
4. Save

## Usage

1. **Navigate to Swiggy.com**
   - Open [https://www.swiggy.com](https://www.swiggy.com) in Chrome

2. **Open FoodBot Extension**
   - Click the FoodBot icon in your Chrome toolbar

3. **Enter Your Order Request**
   - Type what you want to order (e.g., "I want to order a large pepperoni pizza from Domino's")
   - Optionally enter your location

4. **Start Order**
   - Click "Start Order" button
   - FoodBot will analyze the page and start placing your order
   - Watch the progress in the popup and on the page

5. **Monitor Progress**
   - The extension will show real-time status updates
   - Once complete, you'll see a confirmation

## Development

### Project Structure

- **Background Service Worker** (`src/background/service-worker.ts`)
  - Handles message routing between components
  - Manages session state
  - Coordinates with backend API

- **Content Scripts** (`src/content-scripts/swiggy-content.ts`)
  - Runs in the context of Swiggy pages
  - Performs DOM manipulation and data extraction
  - Executes automation actions

- **Popup UI** (`src/ui/popup.ts`)
  - User interface for the extension
  - Handles user input and displays status

- **Claude Client** (`src/llm/claude-client.ts`)
  - Communicates with Claude API
  - Provides intelligent decision-making
  - Analyzes page content and determines next actions

### Available Scripts

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check

# Clean build artifacts
npm run clean
```

### Code Quality

This project follows strict TypeScript and ESLint rules:

- TypeScript strict mode enabled
- Maximum cyclomatic complexity: 10
- Maximum file length: 300 lines
- Maximum function length: 50 lines
- No `any` types allowed
- Explicit return types required

### Testing

```bash
# Run tests (when implemented)
npm test

# Run tests with coverage
npm run test:coverage
```

## Architecture Details

### Message Flow

```
Popup UI → Background Service Worker → Content Script → Web Page
                    ↓
              Claude AI Client
                    ↓
              Backend API (optional)
```

### State Management

- **Chrome Storage**: Persists user preferences, sessions, and API keys
- **Session Management**: Tracks active ordering sessions
- **Message Passing**: Uses Chrome's message passing API for component communication

### Security

- API keys stored securely in Chrome storage
- Content Security Policy enforced
- Host permissions limited to specific domains
- No inline scripts or eval()

## Troubleshooting

### Extension Not Loading

- Check that you've built the project (`npm run build`)
- Verify the `dist/` folder exists
- Make sure all required files are present in `dist/`

### API Key Issues

- Verify your Claude API key is valid
- Check the API key is properly configured in Settings
- Review console logs for authentication errors

### Content Script Not Working

- Ensure you're on a supported platform (Swiggy.com)
- Check Chrome's console for errors (F12)
- Verify the manifest's host permissions are correct

### Build Errors

- Delete `node_modules/` and reinstall: `npm install`
- Clear build cache: `npm run clean`
- Check Node.js version (18+ required)

## Limitations

- Currently only supports Swiggy (Zomato support coming soon)
- Requires Claude API key (not included)
- May break if Swiggy changes their website structure
- Cannot handle payment methods that require OTP or 2FA

## Future Enhancements

- [ ] Zomato support
- [ ] Voice command integration
- [ ] Order history and favorites
- [ ] Price comparison across platforms
- [ ] Scheduled ordering
- [ ] Multi-language support

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all CI checks pass

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with Claude AI by the FoodBot Team**
