#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(tr -d '\r\n' < "$repo_root/VERSION")"
package_name="bflabs-workbuddy-theme-v${version}"
stage_root="$(mktemp -d "${TMPDIR:-/tmp}/bflabs-workbuddy-theme.XXXXXX")"
package_root="$stage_root/$package_name"
dist_root="$repo_root/dist"

cleanup() {
  rm -rf "$stage_root"
}
trap cleanup EXIT

mkdir -p "$package_root" "$dist_root"
for entry in \
  README.md DESIGN.md LICENSE ATTRIBUTIONS.md CHANGELOG.md SECURITY.md VERSION \
  AGENTS.md BFLABS.md CONTRIBUTING.md \
  package.json theme.json theme.css preview.html preview-shell.css \
  assets artifacts scripts test vendor; do
  cp -R "$repo_root/$entry" "$package_root/"
done

find "$package_root" -type f -exec touch -t 202608260000 {} +
archive="$dist_root/$package_name.zip"
rm -f "$archive" "$archive.sha256"
(cd "$stage_root" && zip -X -q -r "$archive" "$package_name")

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$dist_root" && sha256sum "$(basename "$archive")" > "$(basename "$archive").sha256")
else
  (cd "$dist_root" && shasum -a 256 "$(basename "$archive")" > "$(basename "$archive").sha256")
fi

printf '%s\n' "$archive" "$archive.sha256"
