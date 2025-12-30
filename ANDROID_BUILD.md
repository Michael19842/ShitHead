# Android Build Workflow

## Vereisten

1. **Android Studio** geïnstalleerd (download: https://developer.android.com/studio)
2. **JDK 17+** geïnstalleerd (komt mee met Android Studio)
3. **Android SDK** geconfigureerd via Android Studio

### Environment Variables instellen (Windows)

Open **Systeem Eigenschappen** > **Geavanceerd** > **Omgevingsvariabelen** en voeg toe:

```
JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
ANDROID_HOME = C:\Users\JOUW_USER\AppData\Local\Android\Sdk
```

Voeg ook toe aan je **Path**:
```
%JAVA_HOME%\bin
%ANDROID_HOME%\platform-tools
```

> **Tip:** Na het wijzigen van environment variables moet je een nieuw terminal venster openen!

## Beschikbare NPM Scripts

```bash
# Sync web assets naar Android project
npm run android:sync

# Open project in Android Studio
npm run android:open

# Run op aangesloten device/emulator (via Capacitor)
npm run android:run

# Build debug APK
npm run android:build-debug

# Build release APK (unsigned)
npm run android:build-release
```

## Stap-voor-stap: Debug APK bouwen

### Methode 1: Via Command Line

```bash
cd shithead-app

# 1. Build en sync
npm run android:sync

# 2. Build de APK
cd android
gradlew.bat assembleDebug

# APK locatie:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Methode 2: Via Android Studio

```bash
# 1. Sync eerst
npm run android:sync

# 2. Open in Android Studio
npm run android:open
```

Dan in Android Studio:
1. Wacht tot Gradle sync klaar is
2. **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
3. Klik op "locate" in de popup om de APK te vinden

## Stap-voor-stap: Release APK bouwen (voor distributie)

### 1. Keystore aanmaken (eenmalig)

```bash
keytool -genkey -v -keystore shithead-release.keystore -alias shithead -keyalg RSA -keysize 2048 -validity 10000
```

Bewaar de keystore veilig en onthoud het wachtwoord!

### 2. Gradle configureren

Maak `android/keystore.properties`:
```properties
storeFile=../shithead-release.keystore
storePassword=JOUW_STORE_WACHTWOORD
keyAlias=shithead
keyPassword=JOUW_KEY_WACHTWOORD
```

Update `android/app/build.gradle`, voeg toe boven `android {`:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

En binnen `android { ... }` voeg toe:
```gradle
signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### 3. Release APK bouwen

```bash
npm run android:build-release

# APK locatie:
# android/app/build/outputs/apk/release/app-release.apk
```

## Testen op Device

### Via USB (aanbevolen)
1. Zet **USB Debugging** aan op je Android telefoon
   - Ga naar Instellingen > Over telefoon
   - Tap 7x op "Build number" om Developer Options te activeren
   - Ga naar Developer Options > USB Debugging aan
2. Sluit telefoon aan via USB
3. Run: `npm run android:run`

### Via Emulator
1. Open Android Studio
2. **Tools** > **Device Manager** > Maak een Virtual Device
3. Run: `npm run android:run`

### APK handmatig installeren
1. Kopieer de APK naar je telefoon
2. Open de APK met een file manager
3. Sta installatie van onbekende bronnen toe indien nodig

## Veelvoorkomende Problemen

### "ANDROID_HOME not set"
```bash
# Windows - voeg toe aan System Environment Variables:
ANDROID_HOME = C:\Users\JOUW_USER\AppData\Local\Android\Sdk
```

### "SDK location not found"
Maak `android/local.properties`:
```properties
sdk.dir=C:\\Users\\JOUW_USER\\AppData\\Local\\Android\\Sdk
```

### Gradle build faalt
```bash
cd android
gradlew.bat clean
gradlew.bat assembleDebug
```

## APK Locaties Overzicht

| Type | Locatie |
|------|---------|
| Debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Release APK | `android/app/build/outputs/apk/release/app-release.apk` |
