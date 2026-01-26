const axios = require('axios');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createTenantsBatch() {
    const batchSize = 50; // 50 مستأجر في كل دفعة
    const totalTenants = 1000;
    const delayBetweenBatches = 2000; // 2 ثانية بين كل دفعة

    console.log(`🚀 بدء إنشاء ${totalTenants} مستأجر...`);
    console.log(`📦 حجم الدفعة: ${batchSize} | ⏱️ التأخير: ${delayBetweenBatches}ms`);

    const startTime = Date.now();
    let totalSuccess = 0;
    let totalFailure = 0;

    for (let i = 0; i < totalTenants; i += batchSize) {
        const batchPromises = [];

        // إنشاء دفعة من المستأجرين
        for (let j = 0; j < batchSize && (i + j) < totalTenants; j++) {
            const tenantNumber = i + j + 1;
            batchPromises.push(
                axios.post('http://localhost:3000/api/tenants', {
                    id: `tenant-stress-${tenantNumber.toString().padStart(4, '0')}`,
                    name: `متجر ضغط رقم ${tenantNumber}`,
                    domain: `stress-store-${tenantNumber}`,
                    businessType: 'RETAIL',
                    contactEmail: `admin-stress-${tenantNumber}@example.com`,
                    contactPhone: `+96650000000${tenantNumber % 10}`,
                    address: {
                        street: `شارع الضغط ${tenantNumber}`,
                        city: 'الرياض',
                        country: 'السعودية',
                        postalCode: '12345'
                    }
                }).catch(err => {
                    // نلتقط الخطأ هنا حتى لا يوقف Promise.allSettled العملية بالكامل إذا استخدمنا Promise.all مستقبلاً
                    // ولكن مع allSettled الأمر أسهل. هذا فقط للتوضيح.
                    throw err;
                })
            );
        }

        try {
            const results = await Promise.allSettled(batchPromises);

            // حساب النجاحات والفشل
            const successes = results.filter(r => r.status === 'fulfilled').length;
            const failures = results.filter(r => r.status === 'rejected').length;

            totalSuccess += successes;
            totalFailure += failures;

            console.log(`✅ الدفعة ${Math.floor(i / batchSize) + 1}: ${successes} نجاح، ${failures} فشل`);

            // تسجيل الأخطاء إن وجدت
            if (failures > 0) {
                const errors = results.filter(r => r.status === 'rejected').map(r => r.reason.message);
                console.warn(`⚠️ عينات من الأخطاء: ${errors.slice(0, 3).join(', ')}`);
            }

            // التأخير بين الدفعات
            if (i + batchSize < totalTenants) {
                await delay(delayBetweenBatches);
            }
        } catch (error) {
            console.error(`❌ خطأ غير متوقع في الدفعة ${Math.floor(i / batchSize) + 1}:`, error.message);
        }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('--------------------------------------------------');
    console.log('🎉 اكتملت عملية الإنشاء!');
    console.log(`📊 الإجمالي: ${totalTenants}`);
    console.log(`✅ نجاح: ${totalSuccess}`);
    console.log(`❌ فشل: ${totalFailure}`);
    console.log(`⏱️ الزمن المستغرق: ${duration.toFixed(2)} ثانية`);
    console.log(`🚀 المعدل: ${(totalSuccess / duration).toFixed(2)} مستأجر/ثانية`);
    console.log('--------------------------------------------------');
}

createTenantsBatch();
