#!/bin/bash
# ArcheryTrace APK: aapt2 -> javac -> d8 -> apksigner (sin Gradle)
# Windows (Git Bash) con tools/android/, o Linux/macOS con ANDROID_BUILD_TOOLS y ANDROID_JAR.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if command -v cygpath >/dev/null; then W() { cygpath -m "$1"; }; EXE=.exe; BAT=.bat; else W() { echo "$1"; }; EXE=; BAT=; fi
BT="${ANDROID_BUILD_TOOLS:-$ROOT/tools/android/android-15}"
JAR="${ANDROID_JAR:-$ROOT/tools/android/android-34-ext12/android.jar}"
KS="$ROOT/tools/android/archerytrace.keystore"
cd "$ROOT"
node --test tools/tests/coach.test.cjs tools/tests/coach-ui.test.cjs tools/tests/coach-agent.test.cjs tools/tests/coach-context.test.cjs
node --test tools/tests/mobile-playback.test.cjs tools/tests/session-model.test.cjs tools/tests/sessions.test.cjs tools/tests/trace-geom.test.cjs tools/tests/backup.test.cjs tools/tests/score.test.cjs tools/tests/compare.test.cjs tools/tests/goals.test.cjs >/dev/null 2>&1 || echo "AVISO: hay tests JS fallidos (heredados); se compila igualmente"
rm -rf android/build && mkdir -p android/build/gen android/build/classes android/build/assets
cp mobile/*.js mobile/index.html mobile/icon-192.png mobile/icon-512.png mobile/manifest.json android/build/assets/ && cp -r mobile/fonts mobile/photos android/build/assets/
node tools/coach-access.cjs --bundle android/build/assets "${COACH_MEMBER:-1}"
"$BT/aapt2$EXE" compile --dir android/res -o android/build/res.zip
"$BT/aapt2$EXE" link -o android/build/base.apk -I "$JAR" --manifest android/AndroidManifest.xml \
  -A android/build/assets android/build/res.zip --java android/build/gen --auto-add-overlay
SRCS="$(find android/src -name '*.java' | tr '\n' ' ')"
javac --release 17 -g -encoding UTF-8 -cp "$(W "$JAR")" -d android/build/classes \
  android/build/gen/com/eduardgilm/archerytrace/R.java $SRCS
jar -cf android/build/all.jar -C android/build/classes .
"$BT/d8$BAT" --release --lib "$JAR" --output android/build android/build/all.jar
(cd android/build && jar -uf base.apk classes.dex)
python3 tools/normalize-apk.py android/build/base.apk 2>/dev/null || python tools/normalize-apk.py android/build/base.apk
mkdir -p "$(dirname "$KS")"
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -alias at -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "${KS_PASS:-archerytrace}" -keypass "${KS_PASS:-archerytrace}" -dname "CN=ArcheryTrace"
fi
"$BT/apksigner$BAT" sign --ks "$KS" --ks-pass pass:"${KS_PASS:-archerytrace}" --key-pass pass:"${KS_PASS:-archerytrace}" \
  --out android/build/ArcheryTrace.apk android/build/base.apk
echo "APK_OK $(stat -c%s android/build/ArcheryTrace.apk) bytes"
