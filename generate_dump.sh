#!/bin/bash
DUMP_FILE="brier_code_dump.txt"
rm -f $DUMP_FILE

append_file() {
  if [ -f "$1" ]; then
    echo "=== FILE: $1 ===" >> $DUMP_FILE
    cat "$1" >> $DUMP_FILE
    echo "" >> $DUMP_FILE
  fi
}

append_file "prisma/schema.prisma"
append_file "src/indexer/shadow_daemon.js"
append_file "src/app/vault/[botId]/page.tsx"
append_file "src/app/leaderboard/page.tsx"
append_file "src/app/discover/page.tsx"
append_file "src/app/list-bot/page.tsx"
append_file "src/app/maker/[address]/page.tsx"
append_file "contracts/BrierVault.sol"
append_file "package.json"

find src/app/api -type f -name "*.ts" -o -name "*.tsx" | while read -r file; do append_file "$file"; done
find src/lib -type f -name "*.ts" -o -name "*.tsx" | while read -r file; do append_file "$file"; done
find src/components -type f -name "*.ts" -o -name "*.tsx" | while read -r file; do append_file "$file"; done

echo "Dump generated at $DUMP_FILE"
