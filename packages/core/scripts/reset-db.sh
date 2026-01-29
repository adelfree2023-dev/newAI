#!/bin/bash
# Reset Database Script for Apex Platform
echo "🛑 Stopping all processes..."
# This is meant to be run on the server

DB_USER="apex_user"
DB_NAME="apex_prod"
DB_PORT="5433"
DB_HOST="localhost"

echo "🧹 Dropping all tables in public schema..."
export PGPASSWORD=ApexSecure2026
psql -U $DB_USER -d $DB_NAME -p $DB_PORT -h $DB_HOST -c "
DO \$\$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;"

if [ $? -eq 0 ]; then
    echo "✅ Database tables cleared successfully."
else
    echo "❌ Failed to clear database tables."
    exit 1
fi
