#!/bin/sh
# One-time: enable git hooks from .githooks/
# Run: sh scripts/install_hooks.sh
set -e
REPO_ROOT="$(git rev-parse --show-toplevel)"
git -C "$REPO_ROOT" config core.hooksPath .githooks
chmod +x "$REPO_ROOT/.githooks/pre-commit" 2>/dev/null || true
echo "Hooks installed: core.hooksPath = .githooks"
