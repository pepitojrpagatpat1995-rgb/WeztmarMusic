# Weztmar Music — Android MVP

A real Expo/React Native music app prototype with:
- Premium dark + gold UI
- Home / Search / Upload / Library / Profile tabs
- Import local audio files
- Optional cover image
- Persistent library using AsyncStorage
- Play / pause / seek / next / previous
- Favorites
- Playlists (starter UI)
- Mini-player
- Full Now Playing screen

## Run on Android

1. Install Node.js 20+.
2. Install Expo tooling:
   `npm install`
3. Start:
   `npx expo start`
4. Scan the QR code with Expo Go, or press `a` for an Android emulator.

## Build an installable APK

For a cloud Android build:
1. Install EAS CLI:
   `npm install -g eas-cli`
2. Sign in:
   `eas login`
3. Configure:
   `eas build:configure`
4. Build:
   `eas build -p android --profile preview`

The resulting APK can be installed on an Android phone.

## Important MVP note

The first version stores imported song metadata locally on the device. It is not yet a multi-user cloud streaming service. The next phase can add accounts, cloud storage, online streaming, artist profiles and an admin dashboard.