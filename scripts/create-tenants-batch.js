const axios = require('axios');
const fs = require('fs');

// دالة مساعدة للتأخير (Delay Helper)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createTenantsBatch() {
    const batchSize = 50; // 50 مستأجر في كل دفعة
    const totalTenants = 1000;
    const delayBetweenBatches = 2000; // 2 ثانية بين كل دفعة
    const outputLog = '/tmp/benchmark_final_log.txt';

    // URL الخادم (يمكن تغييره حسب البيئة)
    const baseUrl = 'http://localhost:3000/api/tenants';

    console.log(`🚀 بدء إنشاء ${totalTenants} مستأجر...`);
    fs.writeFileSync(outputLog, `Starting Benchmark at ${new Date().toISOString()}\n`);

    let totalSuccess = 0;
    let totalFailures = 0;
    const startTime = Date.now();

    for (let i = 0; i < totalTenants; i += batchSize) {
        const batchPromises = [];

        // إنشاء دفعة من المستأجرين
        for (let j = 0; j < batchSize && (i + j) < totalTenants; j++) {
            const tenantNumber = i + j + 1;
            const tenantId = `tenant-${tenantNumber.toString().padStart(4, '0')}`;

            batchPromises.push(
                axios.post(baseUrl, {
                    id: tenantId,
                    name: `متجر رقم ${tenantNumber}`,
                    domain: `store${tenantNumber}`,
                    businessType: 'RETAIL',
                    contactEmail: `admin${tenantNumber}@example.com`,
                    contactPhone: `+966500000${tenantNumber.toString().padStart(3, '0')}`,
                    address: {
                        street: `شارع ${tenantNumber}`,
                        city: 'الرياض',
                        country: 'السعودية',
                        postalCode: '12345'
                    }
                })
                    .then(() => ({ status: 'fulfilled', id: tenantId }))
                    .catch((err) => ({ status: 'rejected', id: tenantId, error: err.message }))
            );
        }

        try {
            // انتظار اكتمال الدفعة الحالية
            const results = await Promise.all(batchPromises);

            // حساب النجاحات والفشل في هذه الدفعة
            const successes = results.filter(r => r.status === 'fulfilled').length;
            const failures = results.filter(r => r.status === 'rejected').length;

            totalSuccess += successes;
            totalFailures += failures;

            const logMsg = `✅ الدفعة ${Math.floor(i / batchSize) + 1}: ${successes} نجاح، ${failures} فشل`;
            console.log(logMsg);
            fs.appendFileSync(outputLog, logMsg + '\n');

            // التأخير بين الدفعات لتخفيف الحمل
            if (i + batchSize < totalTenants) {
                // console.log(`⏳ انتظار ${delayBetweenBatches}ms...`);
                await delay(delayBetweenBatches);
            }
        } catch (error) {
            console.error(`❌ خطأ غير متوقع في الدفعة ${Math.floor(i / batchSize) + 1}:`, error.message);
        }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    const summary = `
--- 📊 النتائج النهائية (Final Results) ---
✅ النجاح: ${totalSuccess}
❌ الفشل: ${totalFailures}
⏱️ الزمن الكلي: ${duration.toFixed(2)} ثانية
🚀 المعدل: ${(totalSuccess / duration).toFixed(2)} مستأجر/ثانية
-------------------------------------------
`;

    console.log(summary);
    fs.appendFileSync(outputLog, summary);
}

createTenantsBatch();
