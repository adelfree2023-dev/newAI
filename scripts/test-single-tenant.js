const axios = require('axios');

async function createSingleTenant() {
    const tenantNumber = 9999;
    const tenantId = `tenant-${tenantNumber}`;
    const baseUrl = 'http://localhost:3000/api/tenants';

    console.log(`🚀 محاولة إنشاء مستأجر واحد للاختبار (${tenantId})...`);

    try {
        const response = await axios.post(baseUrl, {
            id: tenantId,
            name: `متجر اختبار ${tenantNumber}`,
            domain: `teststore${tenantNumber}`,
            businessType: 'RETAIL',
            contactEmail: `admin${tenantNumber}@example.com`,
            contactPhone: `+966500000999`,
            address: {
                street: `شارع الاختبار`,
                city: 'الرياض',
                country: 'السعودية',
                postalCode: '11111'
            }
        });

        console.log(`✅ تم الإنشاء بنجاح! Status: ${response.status}`);
        console.log('Response:', response.data);
    } catch (error) {
        console.error(`❌ فشل الإنشاء!`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`Error: ${error.message}`);
        }
    }
}

createSingleTenant();
