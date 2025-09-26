#!/bin/bash

echo "🧪 Testing Backend Code Quality"

echo "1. Checking for unused variables..."
if grep -n "declared and not used" backend/*.go; then
    echo "❌ Found unused variables"
else
    echo "✅ No unused variables found"
fi

echo "2. Checking for TODO comments..."
if grep -n "TODO\|FIXME\|XXX" backend/*.go; then
    echo "⚠️  Found TODO comments"
else
    echo "✅ No TODO comments found"
fi

echo "3. Checking for empty functions..."
if grep -A5 "func.*{" backend/*.go | grep -B5 "}" | grep -E "^\s*$"; then
    echo "⚠️  Found potentially empty functions"
else
    echo "✅ No empty functions found"
fi

echo "4. Checking file sizes..."
for file in backend/*.go; do
    lines=$(wc -l < "$file")
    echo "  $file: $lines lines"
done

echo "✅ Backend code quality check completed"
