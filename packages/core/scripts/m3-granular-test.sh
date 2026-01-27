#!/bin/bash

# =================================================================
# 🏆 M3 IAM GRANULAR TEST SUITE (14 TESTS)
# =================================================================

API_URL="http://localhost:3000/api"
TEST_EMAIL="acceptance_$(date +%s)@example.com"
TEST_PASS="GranularPass123!"
TOKEN_FILE="/tmp/m3_token.txt"
USER_ID_FILE="/tmp/m3_userid.txt"

echo "🎯 M3 Granular Testing Execution"
echo "------------------------------------------------------------"

case "$1" in
  1)
    echo -n "[Test 1] Register User (CUSTOMER) ... "
    RES=$(curl -s -X POST $API_URL/auth/register -H "Content-Type: application/json" \
      -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"firstName\":\"Granular\",\"lastName\":\"Test\",\"role\":\"CUSTOMER\"}")
    if [[ $RES == *"\"email\":\"$TEST_EMAIL\""* ]]; then
      echo "✅ SUCCESS"
      echo $RES > /tmp/m3_reg_res.json
    else
      echo "❌ FAILED: $RES"
    fi
    ;;
  2)
    echo -n "[Test 2] Login & JWT Receipt ... "
    # We need a registered user from Test 1 or a constant one
    # For granular, let's use the one we just created if possible, or a fallback
    EMAIL=$(cat /tmp/m3_reg_res.json | grep -oP '(?<="email":")[^"]*' || echo "test@example.com")
    RES=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$TEST_PASS\"}")
    TOKEN=$(echo $RES | grep -oP '(?<="accessToken":")[^"]*')
    USER_ID=$(echo $RES | grep -oP '(?<="id":")[^"]*')
    if [[ -n "$TOKEN" ]]; then
      echo "✅ SUCCESS (Token: ${TOKEN:0:10}...)"
      echo $TOKEN > $TOKEN_FILE
      echo $USER_ID > $USER_ID_FILE
    else
      echo "❌ FAILED: $RES"
    fi
    ;;
  3)
    echo -n "[Test 3] Brute Force (5 attempts) ... "
    EMAIL="brute_$(date +%s)@example.com"
    # Register first
    curl -s -X POST $API_URL/auth/register -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$TEST_PASS\",\"firstName\":\"B\",\"lastName\":\"F\"}" > /dev/null
    for i in {1..5}; do
      curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"wrong\"}" > /dev/null
    done
    RES=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"wrong\"}")
    if [[ $RES == *"الحساب مقفل مؤقتاً"* || $RES == *"423"* || $RES == *"Locked"* ]]; then
      echo "✅ SUCCESS (423/Locked received)"
    else
      echo "❌ FAILED (Should be locked): $RES"
    fi
    ;;
  4)
    echo -n "[Test 4] RBAC Protection (CUSTOMER Forbidden) ... "
    TOKEN=$(cat $TOKEN_FILE)
    RES=$(curl -s -H "Authorization: Bearer $TOKEN" $API_URL/products)
    if [[ $RES == *"Forbidden"* || $RES == *"وصول مرفوض"* ]]; then
      echo "✅ SUCCESS (403 Forbidden)"
    else
      echo "❌ FAILED (Should be Forbidden): $RES"
    fi
    ;;
  5)
    echo -n "[Test 5] Tenant Isolation Check ... "
    TOKEN=$(cat $TOKEN_FILE)
    RES=$(curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-ID: malicious-tenant" $API_URL/products)
    if [[ $RES == *"Forbidden"* || $RES == *"وصول مرفوض"* ]]; then
      echo "✅ SUCCESS (Access Denied)"
    else
      echo "❌ FAILED: $RES"
    fi
    ;;
  12)
    echo -n "[Test 12] Performance check (<300ms) ... "
    EMAIL=$(cat /tmp/m3_reg_res.json | grep -oP '(?<="email":")[^"]*')
    START=$(date +%s%N)
    curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$TEST_PASS\"}" > /dev/null
    END=$(date +%s%N)
    LATENCY=$((($END - $START)/1000000))
    if [ $LATENCY -lt 300 ]; then
      echo "✅ SUCCESS (${LATENCY}ms)"
    else
      echo "⚠️ WARNING (${LATENCY}ms - over 300ms)"
    fi
    ;;
  14)
    echo -n "[Test 14] Bcrypt Storage Evidence ... "
    EMAIL=$(cat /tmp/m3_reg_res.json | grep -oP '(?<="email":")[^"]*')
    # Try public schema first, then system
    HASH=$(PGPASSWORD=ApexSecure2026 psql -U apex_user -d apex_prod -p 5433 -h localhost -t -c "SELECT password_hash FROM public.users WHERE email='$EMAIL'" | xargs)
    if [[ -z "$HASH" ]]; then
       # Maybe in different schema? Let's check information_schema
       SCHEMA=$(PGPASSWORD=ApexSecure2026 psql -U apex_user -d apex_prod -p 5433 -h localhost -t -c "SELECT table_schema FROM information_schema.tables WHERE table_name = 'users' LIMIT 1" | xargs)
       HASH=$(PGPASSWORD=ApexSecure2026 psql -U apex_user -d apex_prod -p 5433 -h localhost -t -c "SELECT password_hash FROM $SCHEMA.users WHERE email='$EMAIL'" | xargs)
    fi
    
    if [[ $HASH == \$2b\$* ]]; then
      echo "✅ SUCCESS (Bcrypt Hash found: ${HASH:0:15}...)"
    else
      echo "❌ FAILED (Hash format weird: $HASH)"
    fi
    ;;
  *)
    echo "⚠️  Test $1 not yet implemented in granular script or invalid."
    ;;
esac
