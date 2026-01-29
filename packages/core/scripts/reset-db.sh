#!/bin/bash
# Reset Database Script for Apex Platform
echo "🛑 Stopping all processes..."
# This is meant to be run on the server

DB_USER="apex_user"
DB_NAME="apex_prod"
DB_PORT="5433"
DB_HOST="localhost"

echo "🧹 Resetting public schema..."
export PGPASSWORD=ApexSecure2026
psql -U $DB_USER -d $DB_NAME -p $DB_PORT -h $DB_HOST -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO $DB_USER; GRANT ALL ON SCHEMA public TO public;"

if [ $? -eq 0 ]; then
    echo "✅ Database schema reset successfully."
else
    echo "❌ Failed to reset database schema."
    exit 1
fi
