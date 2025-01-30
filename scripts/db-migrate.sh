#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Starting database migration process...${NC}"

# 1. Check current state
echo -e "\n${GREEN}Checking current database state...${NC}"
yarn db:check

# 2. Generate migration
echo -e "\n${GREEN}Generating new migration...${NC}"
yarn db:generate

# 3. Ask for confirmation
read -p "Would you like to review the generated migration before applying? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${YELLOW}Please review the migration files in supabase/migrations/${NC}"
    read -p "Press enter to continue or Ctrl+C to abort"
fi

# 4. Apply migration
echo -e "\n${GREEN}Applying migration...${NC}"
yarn db:migrate

# 5. Verify state after migration
echo -e "\n${GREEN}Verifying database state...${NC}"
yarn db:check

echo -e "\n${GREEN}Migration process completed!${NC}" 