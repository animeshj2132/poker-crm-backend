#!/bin/bash

# Database Migration Runner
# Run all SQL migrations in order

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    echo "Please set it in your .env file or export it:"
    echo "export DATABASE_URL=postgresql://user:password@host:5432/dbname"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SQL_DIR="$SCRIPT_DIR/../sql"

echo -e "${GREEN}Starting database migrations...${NC}"
echo "Database: $DATABASE_URL"
echo ""

# List of migration files in order
MIGRATIONS=(
    "0001_init.sql"
    "0002_branding.sql"
    "0003_club_logo.sql"
    "0004_club_branding.sql"
    "0005_user_password_hash.sql"
    "0006_password_reset_flag.sql"
    "0007_extend_club_roles.sql"
    "0008_waitlist_tables.sql"
    "0008_club_operations.sql"
)

# Run each migration
for migration in "${MIGRATIONS[@]}"; do
    file="$SQL_DIR/$migration"
    
    if [ ! -f "$file" ]; then
        echo -e "${YELLOW}Warning: $migration not found, skipping...${NC}"
        continue
    fi
    
    echo -e "${GREEN}Running $migration...${NC}"
    
    # Use psql to run the migration
    if psql "$DATABASE_URL" -f "$file" -v ON_ERROR_STOP=1; then
        echo -e "${GREEN}✓ $migration completed successfully${NC}"
    else
        echo -e "${RED}✗ $migration failed${NC}"
        echo "Stopping migrations due to error"
        exit 1
    fi
    
    echo ""
done

echo -e "${GREEN}All migrations completed successfully!${NC}"

