import axios from 'axios';

const API_URL = 'http://localhost:8080'; // أو رابط السيرفر المباشر

async function testQuickStart() {
    console.log('🧪 بدء اختبار الانضمام السريع...');

    try {
        const response = await axios.post(`${API_URL}/onboarding/quick-start`, {
            storeName: 'Apex Pearl Store',
            domain: 'pearl-store',
            email: 'pearl-owner@gmail.com',
            password: 'SecurePassword@2026',
            businessType: 'JEWELRY'
        });

        console.log('✅ تم إنشاء المتجر بنجاح!');
        console.log('📊 النتائج:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ فشل الاختبار:', error.response?.data || error.message);
    }
}

testQuickStart();
