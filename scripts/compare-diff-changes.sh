#!/bin/bash
# Compare changes between two push refs
# Usage: bash compare-diff-changes.sh <before-ref> <after-ref> <compare-dir>

set -e

before_ref=$1
after_ref=$2
compare_dir=$3
if [ -z "$before_ref" ] || [ -z "$after_ref" ] || [ -z "$compare_dir" ]; then
    echo "Usage: $0 <before-ref> <after-ref> <compare-dir>"
    exit 1
fi

git log --oneline --name-only --pretty=format: \
    $before_ref..$after_ref |
    sort -u |
    grep $compare_dir
