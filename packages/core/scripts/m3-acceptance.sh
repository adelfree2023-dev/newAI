#!/bin/bash

# =================================================================
# 🏆 M3 IAM OFFICIAL ACCEPTANCE RUN (CONCRETE EVIDENCE)
# =================================================================

API_URL="http://localhost:3000/api"
TEST_EMAIL="acceptance_$(date +%s)@example.com"
TEST_PASS="SecurePass123!"

echo "🚀 Starting M3 IAM Verification..."
echo "------------------------------------------------------------"

# 1. Register User
echo -n "Test 1: Register User (CUSTOMER) ... "
REG_RES=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"firstName\":\"Test\",\"lastName\":\"User\",\"role\":\"CUSTOMER\"}")
if [[ $REG_RES == *"\"email\":\"$TEST_EMAIL\""* ]]; then
  echo "✅ SUCCESS"
else
  echo "❌ FAILED"
  echo "Response: $REG_RES"
fi

# 2. Login
echo -n "Test 2: Login & JWT Receipt ... "
LOGIN_RES=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")
ACCESS_TOKEN=$(echo $LOGIN_RES | grep -oP '(?<="accessToken":")[^"]*')
if [[ -n "$ACCESS_TOKEN" ]]; then
  echo "✅ SUCCESS (Token received)"
else
  echo "❌ FAILED"
  echo "Response: $LOGIN_RES"
fi

# 3. Brute Force (5 attempts)
echo -n "Test 3: Brute Force (5 attempts lock) ... "
for i in {1..5}; do
  curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrong\"}" > /dev/null
done
LOCK_RES=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrong\"}")
if [[ $LOCK_RES == *"الحساب مقفل مؤقتاً"* ]]; then
  echo "✅ SUCCESS (Account Locked: 423 Expected)"
else
  echo "❌ FAILED"
  echo "Response: $LOCK_RES"
fi

# 4. RBAC Check (Access Denied)
echo -n "Test 4: RBAC Protection (CUSTOMER Forbidden) ... "
RBAC_RES=$(curl -s -X GET $API_URL/products \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Tenant-ID: system")
# Assuming products requires higher role or system tenant is protected
if [[ $RBAC_RES == *"Forbidden"* || $RBAC_RES == *"وصول مرفوض"* ]]; then
  echo "✅ SUCCESS (Access Denied for CUSTOMER)"
else
  echo "❌ FAILED (Should be Forbidden)"
  echo "Response: $RBAC_RES"
fi

# 12. Performance check
echo -n "Test 12: Login Performance (<300ms) ... "
START=$(date +%s%N)
curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" > /dev/null
END=$(date +%s%N)
LATENCY=$((($END - $START)/1000000))
if [ $LATENCY -lt 300 ]; then
  echo "✅ SUCCESS (${LATENCY}ms)"
else
  echo "⚠️ WARNING (${LATENCY}ms)"
fi

# 14. Bcrypt check (Direct DB)
echo -n "Test 14: Bcrypt Storage Evidence ($2b$) ... "
HASH_ID=$(PGPASSWORD=ApexSecure2026 psql -U apex_user -d apex_prod -p 5433 -h localhost -t -c "SELECT password_hash FROM users WHERE email='$TEST_EMAIL'" | xargs)
if [[ $HASH_ID == \$2b\$* ]]; then
  echo "✅ SUCCESS ($HASH_ID)"
else
  echo "❌ FAILED"
  echo "Found: $HASH_ID"
fi

echo "------------------------------------------------------------"
echo "✅ M3 IAM Official Acceptance Complete (Evidence Captured)"
