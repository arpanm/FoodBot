# TASK-MOBILE-001: Capacitor Native Mobile Apps - Full Production Implementation

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P1 (High)
**Estimated Effort:** 18 days
**Component:** Customer App / Restaurant App / Mobile
**Depends On:** Customer App (done), Restaurant App (done)
**Blocks:** Mobile release, push notifications, native features
**Related Requirements:** FR-CA-UI-001, RESTAURANT-REQ-001

---

## Overview

Complete Capacitor integration for both Customer and Restaurant React apps to produce production-ready iOS and Android native applications. This includes native plugin configuration, push notifications, biometric auth, camera access, geolocation, offline support, deep linking, app store build pipeline, and native performance optimization.

---

## Requirements

### Functional Requirements

1. **Capacitor Project Initialization**
   - Initialize Capacitor for customer-app (iOS + Android)
   - Initialize Capacitor for restaurant-app (iOS + Android)
   - Configure native project settings (bundle ID, app name, icons, splash screens)
   - Set up native build pipeline (Xcode for iOS, Android Studio for Android)
   - Configure capacitor.config.ts per environment (dev, staging, prod)

2. **Push Notifications**
   - Firebase Cloud Messaging (FCM) for Android
   - Apple Push Notification Service (APNs) for iOS
   - Notification categories: order updates, promotions, diet plan reminders, party plan alerts
   - Rich notifications (image, actions, deep link)
   - Notification preferences (per category opt-in/out)
   - Background notification handling
   - Notification history screen
   - Badge count management
   - Silent push for data sync

3. **Biometric Authentication**
   - Face ID / Touch ID on iOS
   - Fingerprint / Face unlock on Android
   - Secure keychain/keystore for token storage
   - Biometric login after initial email/password auth
   - Fallback to PIN/password
   - Biometric enrollment flow
   - Per-action biometric (payment confirmation)

4. **Geolocation & Maps**
   - Real-time GPS location for delivery tracking
   - Background location for delivery agents
   - Map integration (Google Maps / Apple Maps)
   - Restaurant map view
   - Delivery route visualization
   - Geo-fencing for restaurant proximity alerts
   - Address auto-detection from GPS
   - Location permission management

5. **Camera & Media**
   - Restaurant photo upload (owner app)
   - Dish photo upload
   - Review photo attachment
   - Profile picture upload
   - Image compression before upload
   - Gallery picker integration
   - Camera capture with cropping

6. **Offline Support**
   - Cache restaurant menus for offline browsing
   - Offline cart management
   - Queue orders when offline, sync when online
   - Network status indicator
   - Graceful degradation (read-only mode offline)
   - Local SQLite for offline data
   - Background sync on reconnect

7. **Deep Linking & App Links**
   - Universal Links (iOS) / App Links (Android)
   - Deep link routes: restaurant/:id, order/:id, dish/:id, plan/:id
   - Share restaurant/dish with deep links
   - Marketing campaign deep links
   - Deferred deep linking (link works even before app install)
   - QR code scanning for restaurant menus

8. **Performance & Native Optimization**
   - Native splash screen (no white flash)
   - App startup time < 2 seconds
   - Smooth 60fps scrolling
   - Image lazy loading with native caching
   - Memory management (max 200MB usage)
   - Battery optimization (no background drain)
   - Bundle size optimization (< 30MB initial download)
   - Code splitting for faster initial load

9. **App Store Requirements**
   - iOS: App Store Connect setup, provisioning profiles, signing
   - Android: Google Play Console setup, signing keys, bundle
   - Screenshot generation (all required sizes)
   - App Store listing content (description, keywords, category)
   - Privacy policy URL
   - App review guidelines compliance
   - Versioning strategy (SemVer)
   - OTA updates for web layer (Capacitor Live Update)

---

### Non-Functional Requirements

- App startup time < 2 seconds (cold start)
- 60fps scrolling in all list views
- Bundle size < 30MB (initial download)
- Memory usage < 200MB peak
- Battery: < 5% drain per hour of active use
- Offline: full menu browsing without network
- Push notification delivery rate > 98%
- Biometric auth < 500ms response time
- Deep link resolution < 1 second

---

## Architecture

```
Mobile App Architecture:
React App → Capacitor Bridge → Native Layer
    ↓              ↓              ↓
  Web Views    JS→Native     iOS/Android APIs
  (UI)         (Plugins)     (Push, Bio, GPS)

Native Plugins:
├── @capacitor/push-notifications
├── @capacitor/biometric (custom or community)
├── @capacitor/geolocation
├── @capacitor/camera
├── @capacitor/filesystem
├── @capacitor/network
├── @capacitor/app (lifecycle)
├── @capacitor/splash-screen
├── @capacitor/status-bar
├── @capacitor/keyboard
├── @capacitor/haptics
├── @capacitor/share
├── @capacitor/browser (OAuth callback)
└── @capacitor/local-notifications

App Structure:
├── customer-app/
│   ├── src/
│   │   ├── plugins/
│   │   │   ├── push-notifications.ts
│   │   │   ├── biometric-auth.ts
│   │   │   ├── geolocation.ts
│   │   │   ├── camera.ts
│   │   │   ├── offline-manager.ts
│   │   │   └── deep-link-handler.ts
│   │   ├── hooks/
│   │   │   ├── useNativeNotifications.ts
│   │   │   ├── useBiometricAuth.ts
│   │   │   ├── useGeolocation.ts
│   │   │   ├── useCamera.ts
│   │   │   ├── useOfflineSync.ts
│   │   │   └── useDeepLink.ts
│   │   └── services/
│   │       ├── notification.service.ts
│   │       ├── offline-storage.service.ts
│   │       └── native-bridge.service.ts
│   ├── ios/ (native Xcode project)
│   ├── android/ (native Android project)
│   └── capacitor.config.ts
└── restaurant-app/
    ├── src/plugins/ (same structure)
    ├── ios/
    ├── android/
    └── capacitor.config.ts

Build Pipeline:
Code → npm build → Capacitor sync → Native build
  → iOS: Xcode Archive → IPA → TestFlight → App Store
  → Android: Gradle Bundle → AAB → Play Console → Play Store

CI/CD:
├── GitHub Actions → Build React → Capacitor sync
├── Fastlane (iOS) → Match signing → Build → Upload
└── Fastlane (Android) → Sign → Build → Upload
```

---

## SDLC Phases

### Phase 1: Capacitor Initialization & Core Setup (Days 1-3)

**Objectives:** Initialize Capacitor projects, configure native settings, establish build pipeline.

**Tasks:**
1. Install Capacitor dependencies in customer-app and restaurant-app
2. Run `npx cap init` for both apps (iOS + Android)
3. Configure capacitor.config.ts (server URL, plugins, app metadata)
4. Generate app icons (all sizes for iOS + Android)
5. Generate splash screens (all sizes)
6. Configure native project settings (bundle ID, version, permissions)
7. Set up Xcode project (signing, capabilities)
8. Set up Android project (gradle, signing config)
9. Verify builds on iOS simulator and Android emulator
10. Set up Fastlane for iOS and Android
11. Set up GitHub Actions workflow for mobile builds

**Deliverables:**
- Both apps building on iOS + Android
- Fastlane configuration
- CI/CD pipeline for mobile builds

### Phase 2: Push Notifications & Biometric Auth (Days 4-7)

**Objectives:** Implement push notifications and biometric authentication.

**Tasks:**
1. Set up Firebase project (FCM for Android)
2. Configure APNs (certificates, provisioning)
3. Implement push notification plugin wrapper
4. Implement notification registration flow
5. Implement notification handling (foreground, background, killed)
6. Implement rich notifications (image, actions)
7. Implement notification preferences (per-category toggle)
8. Implement notification history screen
9. Implement badge count management
10. Set up biometric plugin (@capacitor-community/biometric-auth or custom)
11. Implement biometric enrollment flow
12. Implement biometric login (after initial auth)
13. Implement secure token storage (Keychain/Keystore)
14. Implement fallback to PIN/password
15. Implement per-action biometric (payment confirmation)
16. Unit tests for notification and biometric services

**Deliverables:**
- Push notifications working on iOS + Android
- Biometric auth with secure token storage
- Notification preferences and history

### Phase 3: Geolocation, Camera & Maps (Days 8-11)

**Objectives:** Implement geolocation, camera, and map features.

**Tasks:**
1. Implement geolocation plugin wrapper
2. Implement location permission request flow
3. Implement real-time GPS tracking for delivery
4. Implement background location updates
5. Integrate Google Maps / Apple Maps
6. Implement restaurant map view
7. Implement delivery route visualization
8. Implement geo-fencing for proximity alerts
9. Implement address auto-detection from GPS
10. Implement camera plugin wrapper
11. Implement photo capture with cropping
12. Implement gallery picker
13. Implement image compression before upload
14. Implement photo upload (restaurant, dish, review, profile)
15. Unit tests for geolocation and camera services

**Deliverables:**
- Geolocation with delivery tracking and maps
- Camera/gallery with image upload
- Geo-fencing alerts

### Phase 4: Offline Support & Deep Linking (Days 12-15)

**Objectives:** Implement offline browsing and deep linking.

**Tasks:**
1. Set up SQLite for local offline storage
2. Implement menu caching strategy (sync on app open)
3. Implement offline cart management
4. Implement order queue (sync when online)
5. Implement network status detection and indicator
6. Implement graceful degradation (read-only offline mode)
7. Implement background sync on reconnect
8. Implement conflict resolution (offline changes vs server)
9. Configure Universal Links (iOS)
10. Configure App Links (Android)
11. Implement deep link route handler
12. Implement deep link routes: restaurant/:id, order/:id, dish/:id, plan/:id
13. Implement share functionality with deep links
14. Implement deferred deep linking
15. Implement QR code scanning for restaurant menus
16. Unit + integration tests for offline and deep linking

**Deliverables:**
- Offline menu browsing and cart
- Background sync
- Deep linking working on iOS + Android
- QR code scanning

### Phase 5: Performance, App Store & Release (Days 16-18)

**Objectives:** Optimize performance, prepare app store listings, and validate release readiness.

**Tasks:**
1. Optimize native splash screen (no white flash)
2. Measure and optimize app startup time (target < 2 seconds)
3. Profile and fix scrolling performance (target 60fps)
4. Implement native image caching
5. Audit and optimize bundle size (target < 30MB)
6. Battery profiling and optimization
7. Memory profiling and leak detection
8. Set up App Store Connect (iOS)
9. Set up Google Play Console (Android)
10. Generate screenshots for all required device sizes
11. Write app store listing (description, keywords, category)
12. Set up privacy policy URL
13. Configure OTA updates (Capacitor Live Update)
14. Run full regression test on real devices (iOS + Android)
15. Submit to TestFlight (iOS) and internal testing (Android)
16. Documentation: build process, release checklist, troubleshooting

**Deliverables:**
- Optimized apps meeting performance targets
- App Store + Play Store listings ready
- OTA update mechanism
- Release documentation

---

## Acceptance Criteria

- [ ] Customer app builds and runs on iOS simulator + real device
- [ ] Customer app builds and runs on Android emulator + real device
- [ ] Restaurant app builds and runs on iOS + Android
- [ ] Push notifications working (FCM + APNs)
- [ ] Rich notifications with images and actions
- [ ] Notification preferences (per-category opt-in/out)
- [ ] Biometric auth (Face ID, Touch ID, Fingerprint)
- [ ] Secure token storage (Keychain/Keystore)
- [ ] Geolocation for delivery tracking
- [ ] Map integration with restaurant view
- [ ] Camera/gallery for photo uploads with compression
- [ ] Offline browsing of cached menus
- [ ] Offline cart management with sync
- [ ] Deep linking working (Universal Links + App Links)
- [ ] QR code scanning for menus
- [ ] App startup < 2 seconds
- [ ] Bundle size < 30MB
- [ ] 60fps scrolling in lists
- [ ] Memory usage < 200MB peak
- [ ] App Store + Play Store listing ready
- [ ] CI/CD pipeline for automated builds (Fastlane + GitHub Actions)
- [ ] OTA updates working (web layer)
- [ ] 85%+ test coverage (JS layer)
- [ ] Native integration tests passing
- [ ] Tested on real devices (minimum: iPhone 13+, Pixel 6+)

---

## Files to Create/Modify

### Customer App

- `apps/customer-app/capacitor.config.ts`
- `apps/customer-app/ios/` (native Xcode project, auto-generated)
- `apps/customer-app/android/` (native Android project, auto-generated)
- `apps/customer-app/src/plugins/push-notifications.ts`
- `apps/customer-app/src/plugins/biometric-auth.ts`
- `apps/customer-app/src/plugins/geolocation.ts`
- `apps/customer-app/src/plugins/camera.ts`
- `apps/customer-app/src/plugins/offline-manager.ts`
- `apps/customer-app/src/plugins/deep-link-handler.ts`
- `apps/customer-app/src/plugins/qr-scanner.ts`
- `apps/customer-app/src/hooks/useNativeNotifications.ts`
- `apps/customer-app/src/hooks/useBiometricAuth.ts`
- `apps/customer-app/src/hooks/useGeolocation.ts`
- `apps/customer-app/src/hooks/useCamera.ts`
- `apps/customer-app/src/hooks/useOfflineSync.ts`
- `apps/customer-app/src/hooks/useDeepLink.ts`
- `apps/customer-app/src/services/notification.service.ts`
- `apps/customer-app/src/services/offline-storage.service.ts`
- `apps/customer-app/src/services/native-bridge.service.ts`
- `apps/customer-app/src/components/NotificationHistory.tsx`
- `apps/customer-app/src/components/NotificationPreferences.tsx`
- `apps/customer-app/src/components/MapView.tsx`
- `apps/customer-app/src/components/DeliveryTracker.tsx`
- `apps/customer-app/src/components/OfflineIndicator.tsx`

### Restaurant App

- `apps/restaurant-app/capacitor.config.ts`
- `apps/restaurant-app/ios/` (native Xcode project)
- `apps/restaurant-app/android/` (native Android project)
- `apps/restaurant-app/src/plugins/push-notifications.ts`
- `apps/restaurant-app/src/plugins/biometric-auth.ts`
- `apps/restaurant-app/src/plugins/geolocation.ts`
- `apps/restaurant-app/src/plugins/camera.ts`
- `apps/restaurant-app/src/plugins/offline-manager.ts`
- `apps/restaurant-app/src/plugins/deep-link-handler.ts`
- `apps/restaurant-app/src/hooks/useNativeNotifications.ts`
- `apps/restaurant-app/src/hooks/useBiometricAuth.ts`
- `apps/restaurant-app/src/hooks/useCamera.ts`
- `apps/restaurant-app/src/services/notification.service.ts`
- `apps/restaurant-app/src/services/offline-storage.service.ts`

### Build & CI/CD

- `fastlane/Fastfile` (iOS + Android lanes)
- `fastlane/Matchfile` (iOS code signing)
- `fastlane/Appfile` (app metadata)
- `.github/workflows/mobile-build.yml`
- `.github/workflows/mobile-release.yml`
- `scripts/build-mobile.sh`
- `scripts/generate-icons.sh`
- `scripts/generate-screenshots.sh`

### Tests

- `apps/customer-app/src/plugins/__tests__/push-notifications.spec.ts`
- `apps/customer-app/src/plugins/__tests__/biometric-auth.spec.ts`
- `apps/customer-app/src/plugins/__tests__/geolocation.spec.ts`
- `apps/customer-app/src/plugins/__tests__/camera.spec.ts`
- `apps/customer-app/src/plugins/__tests__/offline-manager.spec.ts`
- `apps/customer-app/src/plugins/__tests__/deep-link-handler.spec.ts`
- `apps/customer-app/src/hooks/__tests__/useNativeNotifications.spec.ts`
- `apps/customer-app/src/hooks/__tests__/useBiometricAuth.spec.ts`
- `apps/customer-app/src/hooks/__tests__/useOfflineSync.spec.ts`
- `apps/restaurant-app/src/plugins/__tests__/push-notifications.spec.ts`
- `apps/restaurant-app/src/plugins/__tests__/biometric-auth.spec.ts`
- `apps/restaurant-app/src/plugins/__tests__/camera.spec.ts`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| iOS App Store rejection | Medium | High | Follow Apple guidelines strictly, pre-submission review |
| Push notification deliverability issues | Medium | Medium | Use FCM + APNs correctly, test on real devices |
| Biometric API differences across devices | High | Medium | Abstract behind plugin, test on multiple devices |
| Offline sync conflicts | Medium | High | Last-write-wins with conflict resolution UI |
| Large bundle size | Medium | Medium | Code splitting, tree shaking, image optimization |
| Background location drains battery | High | High | Use significant location changes, not continuous GPS |

---

## Dependencies

- @capacitor/core, @capacitor/ios, @capacitor/android
- @capacitor/push-notifications
- @capacitor-community/biometric-auth
- @capacitor/geolocation
- @capacitor/camera
- @capacitor/filesystem
- @capacitor/network
- @capacitor/app
- @capacitor/splash-screen
- @capacitor/status-bar
- @capacitor/keyboard
- @capacitor/haptics
- @capacitor/share
- @capacitor/browser
- @capacitor/local-notifications
- @capacitor-community/sqlite (offline storage)
- @capacitor-community/barcode-scanner (QR codes)
- Firebase (FCM)
- Fastlane (build automation)
- Xcode 15+ (iOS builds)
- Android Studio (Android builds)

---

**This document is a living guide. Update it as implementation progresses.**
