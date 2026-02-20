#!/bin/bash

# ============================================================================
# FoodBot Mobile App Setup Script
# ============================================================================
# This script should be run after all files have been created manually.
# It will install dependencies and prepare the mobile app for development.
#
# Usage: cd apps/mobile-app && chmod +x SETUP.sh && ./SETUP.sh
# ============================================================================

echo "🚀 FoodBot Mobile App Setup"
echo "======================================"
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from apps/mobile-app directory."
    exit 1
fi

echo "📦 Step 1: Installing dependencies..."
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# iOS setup (only on macOS)
if [ "$(uname)" == "Darwin" ]; then
    echo "🍎 Step 2: Setting up iOS dependencies..."
    cd ios
    pod install
    cd ..
    echo "✅ iOS setup complete"
    echo ""
else
    echo "⏭️  Skipping iOS setup (not on macOS)"
    echo ""
fi

# Android setup
echo "🤖 Step 3: Android setup instructions"
echo "----------------------------------------"
echo "Before running on Android, ensure you have:"
echo "  - Android Studio installed"
echo "  - Android SDK installed"
echo "  - ANDROID_HOME environment variable set"
echo "  - An emulator or physical device connected"
echo ""

# Environment setup
echo "🔧 Step 4: Environment configuration"
echo "----------------------------------------"
echo "Create a .env file with the following variables:"
echo ""
echo "GATEWAY_API_URL=http://localhost:3000/api/v1"
echo "GOOGLE_CLIENT_ID=your_google_client_id"
echo "FACEBOOK_CLIENT_ID=your_facebook_client_id"
echo "APPLE_CLIENT_ID=your_apple_client_id"
echo ""

# Deep linking setup
echo "🔗 Step 5: Deep linking configuration"
echo "----------------------------------------"
echo "For OAuth to work, you need to configure deep linking:"
echo ""
echo "iOS (ios/FoodBotMobile/Info.plist):"
echo "  <key>CFBundleURLTypes</key>"
echo "  <array>"
echo "    <dict>"
echo "      <key>CFBundleURLSchemes</key>"
echo "      <array>"
echo "        <string>foodbot</string>"
echo "      </array>"
echo "    </dict>"
echo "  </array>"
echo ""
echo "Android (android/app/src/main/AndroidManifest.xml):"
echo "  <intent-filter>"
echo "    <action android:name=\"android.intent.action.VIEW\" />"
echo "    <category android:name=\"android.intent.category.DEFAULT\" />"
echo "    <category android:name=\"android.intent.category.BROWSABLE\" />"
echo "    <data android:scheme=\"foodbot\" />"
echo "  </intent-filter>"
echo ""

# Next steps
echo "✅ Setup complete!"
echo ""
echo "📱 Next steps:"
echo "----------------------------------------"
echo "1. Update .env file with your API credentials"
echo "2. Configure deep linking (see instructions above)"
echo "3. Start Metro bundler: pnpm start"
echo "4. Run on Android: pnpm run android"
echo "5. Run on iOS: pnpm run ios"
echo ""
echo "📖 For more information, see README.md"
echo ""
