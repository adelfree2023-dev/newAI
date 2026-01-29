#!/bin/bash

# Apex Platform 2026 - M3 Stress Test Script
# Purpose: Create 1000 tenants as fast as possible and measure performance.

TOTAL_TENANTS=1000
API_URL="http://localhost:3000/api/tenants"
CONCURRENCY=10 # Number of parallel requests to avoid overwhelming the network stack but maintain speed

echo "🚀 Starting Official Apex M3 Stress Test: Creating $TOTAL_TENANTS Tenants..."
start_time=$(date +%s%N)

# Function to create a single tenant
create_tenant() {
    local id=$1
    local name="Store $id"
    local domain="store-$id"
    
    curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"id\":\"$id\", \"name\":\"$name\", \"domain\":\"$domain\", \"businessType\":\"RETAIL\", \"contactEmail\":\"admin@$domain.com\"}" > /dev/null
}

export -f create_tenant
export API_URL

# Use xargs for parallel execution
seq 1 $TOTAL_TENANTS | xargs -n 1 -P $CONCURRENCY -I {} bash -c "create_tenant tenant-{}"

end_time=$(date +%s%N)
duration_ns=$((end_time - start_time))
duration_sec=$(echo "scale=3; $duration_ns / 1000000000" | bc)
avg_per_tenant=$(echo "scale=3; ($duration_ns / $TOTAL_TENANTS) / 1000000" | bc)

echo "------------------------------------------------------------"
echo "✅ Stress Test Completed!"
echo "⏱️ Total Duration: $duration_sec seconds"
echo "⚡ Average Time Per Tenant: $avg_per_tenant ms"
echo "📈 Throughput: $(echo "scale=2; $TOTAL_TENANTS / $duration_sec" | bc) tenants/second"
echo "------------------------------------------------------------"
