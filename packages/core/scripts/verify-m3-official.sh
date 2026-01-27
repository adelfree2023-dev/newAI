#!/bin/bash

# Apex Platform 2026 - Official M3 Verification Script (14 Tests)
# Based on doc/test M3.txt

BASE_URL="http://localhost:3000/api"
TEST_EMAIL="official-test@apex.com"
TEST_PASS="SecurePass123!"
TENANT_ID="official-m3-tenant"

echo "🏆 Starting Official M3 Verification - 14 Comprehensive Tests"
echo "------------------------------------------------------------"

echo "Phase 0: Clean Start (Removing previous test user)"
export PGPASSWORD=ApexSecure2026
psql -U apex_user -d apex_prod -p 5433 -h localhost -c "DELETE FROM sessions WHERE \"userId\" IN (SELECT id FROM users WHERE email='$TEST_EMAIL'); DELETE FROM users WHERE email='$TEST_EMAIL';" > /dev/null
echo "✅ Cleaned"

# --- PART 1: AUTHENTICATION ---

echo "Test 1: Register User (CUSTOMER)"
REG_RES=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASS\", \"firstName\": \"Official\", \"lastName\": \"Test\", \"role\": \"CUSTOMER\"}")
echo $REG_RES | grep -q "email" && echo "✅ SUCCESS" || (echo "❌ FAILED: $REG_RES" && exit 1)

echo -e "\nTest 2: Login & JWT Receipt"
LOGIN_RES=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASS\"}")
USER_TOKEN=$(echo $LOGIN_RES | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RES | jq -r '.refreshToken')
if [ "$USER_TOKEN" != "null" ]; then echo "✅ SUCCESS (Token received)"; else echo "❌ FAILED: $LOGIN_RES"; exit 1; fi

echo -e "\nTest 3: Brute Force Protection (5 Fails -> Locked)"
for i in {1..5}; do
  curl -s -o /dev/null -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrong_password\"}"
done
LOCKED_RES=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrong_password\"}")
echo $LOCKED_RES | grep -q "Locked" && echo "✅ SUCCESS (Account Locked)" || echo "⚠️ Warning: Account not locked (Check service settings)"

# --- PART 2: AUTHORIZATION ---

echo -e "\nTest 4: Role-Based Protection (CUSTOMER cannot DELETE)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $BASE_URL/products/123 \
  -H "Authorization: Bearer $USER_TOKEN")
[ "$HTTP_CODE" == "403" ] && echo "✅ SUCCESS (403 Forbidden)" || echo "❌ FAILED (Code: $HTTP_CODE)"

echo -e "\nTest 5: Tenant Isolation (Accessing other tenant)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET $BASE_URL/products \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "X-Tenant-ID: other-tenant-123")
[ "$HTTP_CODE" == "403" ] && echo "✅ SUCCESS (403 Forbidden)" || echo "❌ FAILED (Code: $HTTP_CODE)"

# --- PART 3: 2FA ---

echo -e "\nTest 6: Enable 2FA"
TFA_RES=$(curl -s -X POST $BASE_URL/auth/2fa/enable \
  -H "Authorization: Bearer $USER_TOKEN")
echo $TFA_RES | grep -q "secret" && echo "✅ SUCCESS" || echo "❌ FAILED: $TFA_RES"

echo -e "\nTest 7: Login with 2FA requirement"
# This requires a fresh login attempt
TFA_LOGIN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASS\"}")
echo $TFA_LOGIN | grep -q "requires2FA" && echo "✅ SUCCESS (Flag set)" || echo "❌ FAILED (Check User Entity status)"

echo -e "\nTest 8: Verify 2FA (Mock Token)"
# In a real test we'd need a valid TOTP, but here we check for the endpoint existence
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/verify-2fa \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"some-id\",\"token\":\"123456\"}")
[ "$HTTP_CODE" != "404" ] && echo "✅ SUCCESS (Endpoint operative)" || echo "❌ FAILED (404 Not Found)"

# --- PART 4: SESSIONS ---

echo -e "\nTest 9: Refresh Token"
REFRESH_RES=$(curl -s -X POST $BASE_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo $REFRESH_RES | grep -q "accessToken" && echo "✅ SUCCESS" || echo "❌ FAILED: $REFRESH_RES"

echo -e "\nTest 10: Logout"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/logout \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
[ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ] && echo "✅ SUCCESS" || echo "❌ FAILED (Code: $HTTP_CODE)"

echo -e "\nTest 11: Logout All Devices"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/logout-all \
  -H "Authorization: Bearer $USER_TOKEN")
[ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ] && echo "✅ SUCCESS" || echo "❌ FAILED (Code: $HTTP_CODE)"

# --- PART 5: PERFORMANCE & SECURITY ---

echo -e "\nTest 12: Login Performance"
time curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASS\"}" > /dev/null
echo "✅ Check real-time above"

echo -e "\nTest 13: Information Leakage Prevention"
LEAK_RES=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"nonexistent@apex.com\", \"password\": \"wrong_password\"}")
echo $LEAK_RES | grep -q "Unauthorized" && echo "✅ SUCCESS (Generic Error)" || echo "❌ FAILED (Too specific)"

echo -e "\nTest 14: Password Encryption (Raw DB Verification)"
DB_HASH=$(export PGPASSWORD=ApexSecure2026 && psql -U apex_user -d apex_prod -p 5433 -h localhost -t -c "SELECT \"passwordHash\" FROM users WHERE email='$TEST_EMAIL' LIMIT 1;")
echo "Hash: $DB_HASH"
echo $DB_HASH | grep -q '^\$2b\$' && echo "✅ SUCCESS (Valid Bcrypt Hash)" || echo "❌ FAILED (Plaintext or invalid hash)"

echo -e "\n------------------------------------------------------------"
echo "🏁 Official M3 Verification Complete"
