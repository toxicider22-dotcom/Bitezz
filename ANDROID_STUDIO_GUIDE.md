# BiteFlow POS - Android Studio & APK Build Guide

This project is fully configured with **Capacitor 8** and contains a native **Android Studio project** ready to build, run on emulators, test on physical Android devices, or export as a release APK / Android App Bundle (`.aab`).

---

## 🚀 Quick Start (Easiest Way)

### 1. Prerequisites on your Computer
- **Node.js**: LTS version (v18 or v20+)
- **Android Studio**: Install [Android Studio](https://developer.android.com/studio) (Koala, Ladybug, Hedgehog, or newer)
- **Java JDK**: JDK 17 or JDK 21 (included automatically with Android Studio)
- **Android SDK**: Android API 34 or 35 with Android SDK Platform-Tools and Build-Tools installed via the SDK Manager in Android Studio.

---

### 2. Open in Android Studio

#### Method A: Direct from Command Line
In the root directory of this project on your computer:
```bash
# 1. Install dependencies (if newly cloned/unzipped)
npm install

# 2. Build the latest web assets, sync with Android, and open Android Studio
npm run android
```
*Note: `npm run android` automatically compiles the Vite bundle, synchronizes plugins, and launches Android Studio targeting the `android/` directory.*

#### Method B: Opening Directly inside Android Studio
1. Launch **Android Studio**.
2. Click **Open** (or **File > Open**).
3. Browse to this project's folder and select the **`android`** subfolder (e.g. `path/to/biteflow-pos/android`).
4. Click **OK** / **Open**.
5. Wait for Android Studio to finish the initial Gradle Sync (you will see progress in the bottom status bar).

---

## 📱 How to Run and Test

### On an Emulator
1. Open the **Device Manager** in Android Studio (toolbar icon or **Tools > Device Manager**).
2. Create or launch any Virtual Device (e.g., Pixel 7 or Pixel Tablet, API 34+).
3. Click the green **Run** (Play ▶) button in the top toolbar.
4. BiteFlow POS will launch in full screen with native status bar, splash screen, and responsive POS tablet/counter layout.

### On a Physical Android Phone / Tablet / POS Terminal
1. On your Android device, enable **Developer options** and turn on **USB debugging**.
2. Connect your device to your computer via USB cable.
3. Select your device from the device dropdown in Android Studio.
4. Click the green **Run** (Play ▶) button.

---

## 📦 How to Build the APK / AAB

### To generate a test debug APK (immediately installable on any Android phone):
1. In Android Studio, go to the top menu:
   **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Once build completes, a popup notification will appear:
   *`APK(s) generated successfully for 1 module: app-debug.apk`*
3. Click **locate** to reveal `app-debug.apk` inside:
   `android/app/build/outputs/apk/debug/app-debug.apk`
4. You can transfer this `.apk` to your phone via USB, Google Drive, or WhatsApp, and tap to install!

### To generate a signed release APK or Google Play Bundle (`.aab`):
1. In Android Studio, go to:
   **Build > Generate Signed Bundle / APK...**
2. Choose **Android App Bundle** (for Google Play Store) or **APK** (for direct distribution).
3. Create a new Keystore or select your existing keystore.
4. Select `release` build variant and click **Finish**.
5. Output will be saved in `android/app/release/`.

---

## 🔄 Making Web Code Changes & Re-Syncing
Whenever you make changes to files in `src/`:
```bash
# Rebuild the web code and update the native Android assets:
npm run cap:build
```
In Android Studio, simply hit **Run ▶** or **Rebuild Project** to test the updated app immediately!

---

## ⚙️ Android Configuration Details

- **Application ID / Package Name**: `com.biteflow.pos`
- **Target SDK**: Android 34 / 35 (Android 14 / 15)
- **Minimum SDK**: Android 22 (Android 5.1 Lollipop - compatible with 99%+ of devices)
- **Permissions configured in `AndroidManifest.xml`**:
  - `INTERNET`: For Firebase live Firestore sync, online orders, WhatsApp tracking links.
  - `ACCESS_NETWORK_STATE`: For offline detection and automatic cloud sync reconnection.
  - `VIBRATE`: For native haptic feedback on touch and button presses.
- **Orientation & Layout**: Auto-adapts to both landscape POS terminals / tablets and portrait mobile smartphones.
- **Hardware Back Button**: Handled cleanly with Capacitor App back button listener.
