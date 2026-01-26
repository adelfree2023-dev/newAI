const TOTAL_TENANTS = 1000;
const BATCH_SIZE = 20; // تقليل حجم الدفعة قليلاً لزيادة الاستقرار
const API_URL = 'http://localhost:3000/api/tenants';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createTenant(i) {
    const timestamp = Date.now();
    const id = `bt_${timestamp}_${i}`;
    const data = {
        id: id,
        name: `Benchmark Tenant ${i}`,
        domain: `bench-${timestamp}-${i}.com`,
        businessType: 'RETAIL',
        contactEmail: `admin-${i}@bench.com`
    };

    try {
        const start = Date.now();
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const duration = Date.now() - start;

        const responseText = await response.text();
        if (response.ok) {
            return { success: true, duration };
        } else {
            return { success: false, error: responseText, status: response.status, duration };
        }
    } catch (err) {
        return { success: false, error: err.message, status: 500, duration: 0 };
    }
}

async function runBenchmark() {
    console.log(`🚀 Starting Benchmark: Creating ${TOTAL_TENANTS} tenants...`);
    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;
    let totalDuration = 0;

    for (let i = 0; i < TOTAL_TENANTS; i += BATCH_SIZE) {
        const batchPromises = [];
        for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL_TENANTS; j++) {
            batchPromises.push(createTenant(i + j));
        }

        const results = await Promise.all(batchPromises);
        results.forEach(res => {
            if (res.success) {
                successCount++;
                totalDuration += res.duration;
            } else {
                failCount++;
                console.error(`❌ Failed (Status ${res.status}): ${res.error.substring(0, 100)}`);
            }
        });

        const progress = Math.round(((i + BATCH_SIZE) / TOTAL_TENANTS) * 100);
        console.log(`⏳ Progress: ${Math.min(progress, 100)}% (${successCount + failCount}/${TOTAL_TENANTS})`);

        // تأخير بسيط بين الدفعات لتجنب الرفض
        await delay(100);
    }

    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;

    console.log('\n--- 📊 BENCHMARK RESULTS ---');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failures: ${failCount}`);
    console.log(`⏱️ Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`📈 Throughput: ${(successCount / totalTime).toFixed(2)} tenants/sec`);
    console.log(`🕒 Avg Per Tenant: ${(totalDuration / successCount || 0).toFixed(2)}ms`);
    console.log('----------------------------\n');

    if (totalTime < 300) {
        console.log('🎯 GOAL ACHIEVED: Under 5 minutes!');
    } else {
        console.log('⚠️ GOAL FAILED: Over 5 minutes.');
    }
}

runBenchmark();
