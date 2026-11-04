#!/usr/bin/env bash
# Runs only inside a fresh Debian 12 container; no owner data is mounted writable.
set -euo pipefail
source /etc/os-release
test "$ID" = debian && test "$VERSION_ID" = 12
export DEBIAN_FRONTEND=noninteractive
export LC_ALL=C
apt-get update
apt-get install --yes --no-install-recommends \
  binutils python3 xvfb xauth libgtk-3-0 libgbm1 libasound2 libnss3 \
  libatk-bridge2.0-0 libcups2 libxss1 libxcomposite1 libxdamage1 libxrandr2 \
  libxtst6 libdrm2 xdg-utils
shopt -s nullglob
installers=(/source/linux-installer/*.deb)
test "${#installers[@]}" -eq 1
apt-get install --yes "${installers[0]}"
package=$(dpkg-deb --field "${installers[0]}" Package)
installed_exe=$(dpkg-query --listfiles "$package" | while IFS= read -r file; do
  file_name=$(basename "$file")
  if [[ "${file_name,,}" == "$package" && -f "$file" && -x "$file" && -f "$(dirname "$file")/resources/app.asar" ]]; then
    printf '%s\n' "$file"
  fi
done)
test -n "$installed_exe"
test "$(printf '%s\n' "$installed_exe" | wc -l)" -eq 1
app_dir=$(dirname "$installed_exe")
python3 /source/scripts/check-linux-glibc.py "$app_dir"
# Reuse the production packaged smoke: isolated userData, actual Electron,
# SQLite migrations and schema/table reads. It never opens the owner's data.
xvfb-run --auto-servernum node /source/apps/desktop/scripts/smoke-packaged.mjs \
  --platform=linux --arch=x64 --out-dir="$app_dir" --app-name="$(basename "$installed_exe")"
