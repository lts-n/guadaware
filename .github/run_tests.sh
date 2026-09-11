#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "=== Running Guadaware API Tests ==="
echo ""

if ! command -v pytest &> /dev/null; then
    echo "pytest not found. Installing..."
    pip install pytest requests
fi

python -m pytest .github/tests/ -v --tb=short "$@"

echo ""
echo "=== Tests Complete ==="
