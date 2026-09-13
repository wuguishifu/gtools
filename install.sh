#!/bin/sh
# Installs the gtools CLI.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/wuguishifu/gtools/main/install.sh | sh
#
# Env vars:
#   GTOOLS_VERSION      release tag to install (default: latest)
#   GTOOLS_INSTALL_DIR  install directory (default: $HOME/.gtools/bin)

set -e

REPO="wuguishifu/gtools"
BIN_NAME="gtools"
INSTALL_DIR="${GTOOLS_INSTALL_DIR:-$HOME/.gtools/bin}"
VERSION="${GTOOLS_VERSION:-latest}"

detect_platform() {
  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Darwin) platform="macos" ;;
    Linux) platform="linux" ;;
    *)
      echo "Error: unsupported OS: $os" >&2
      echo "The gtools installer supports macOS and Linux." >&2
      echo "On Windows, download gtools-windows-x64.exe from:" >&2
      echo "  https://github.com/${REPO}/releases/latest" >&2
      exit 1
      ;;
  esac

  case "$arch" in
    x86_64 | amd64) arch="x64" ;;
    arm64 | aarch64) arch="arm64" ;;
    *)
      echo "Error: unsupported architecture: $arch" >&2
      exit 1
      ;;
  esac

  asset="gtools-${platform}-${arch}"
}

download_url() {
  if [ "$VERSION" = "latest" ]; then
    echo "https://github.com/${REPO}/releases/latest/download/${asset}"
  else
    echo "https://github.com/${REPO}/releases/download/${VERSION}/${asset}"
  fi
}

# The standalone binary cannot bundle sharp, so image commands shell out to the
# vips CLI. Other commands run fine without it, so this warns rather than fails.
check_vips() {
  if command -v vips >/dev/null 2>&1; then
    echo "Found $(vips --version), image commands are ready."
    return
  fi

  echo ""
  echo "Note: vips was not found on your PATH."
  echo "gtools commands that process images need it:"
  echo ""

  if [ "$platform" = "macos" ]; then
    echo "  brew install vips"
  else
    echo "  sudo apt install libvips-tools    # Debian/Ubuntu"
    echo "  sudo dnf install vips-tools       # Fedora"
  fi

  echo ""
  echo "Everything else works without it."
}

add_to_path() {
  case ":$PATH:" in
    *":$INSTALL_DIR:"*)
      echo "$INSTALL_DIR is already in your PATH."
      return
      ;;
  esac

  shell_name="$(basename "${SHELL:-sh}")"

  case "$shell_name" in
    fish)
      profile="$HOME/.config/fish/config.fish"
      line="set -gx PATH \"$INSTALL_DIR\" \$PATH"
      ;;
    zsh)
      profile="$HOME/.zshrc"
      line="export PATH=\"$INSTALL_DIR:\$PATH\""
      ;;
    bash)
      if [ "$(uname -s)" = "Darwin" ]; then
        profile="$HOME/.bash_profile"
      else
        profile="$HOME/.bashrc"
      fi
      line="export PATH=\"$INSTALL_DIR:\$PATH\""
      ;;
    *)
      profile="$HOME/.profile"
      line="export PATH=\"$INSTALL_DIR:\$PATH\""
      ;;
  esac

  mkdir -p "$(dirname "$profile")"
  touch "$profile"

  if grep -qs "$INSTALL_DIR" "$profile"; then
    echo "PATH entry already present in $profile"
  else
    printf '\n# Added by gtools installer\n%s\n' "$line" >>"$profile"
    echo "Added $INSTALL_DIR to PATH in $profile"
  fi

  echo ""
  echo "Restart your shell, or run:"
  echo "  source $profile"
  echo "then run '$BIN_NAME --help' to get started."
}

main() {
  detect_platform
  url="$(download_url)"

  echo "Installing $BIN_NAME for ${platform}-${arch}..."
  echo "Downloading ${url}"

  mkdir -p "$INSTALL_DIR"
  tmp_file="$(mktemp)"

  if ! curl -fsSL "$url" -o "$tmp_file"; then
    echo "Error: failed to download binary from $url" >&2
    rm -f "$tmp_file"
    exit 1
  fi

  chmod +x "$tmp_file"
  mv "$tmp_file" "$INSTALL_DIR/$BIN_NAME"

  echo "Installed $BIN_NAME to $INSTALL_DIR/$BIN_NAME"

  check_vips
  add_to_path
}

main
