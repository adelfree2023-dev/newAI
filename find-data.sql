-- البحث عن أكبر 20 جدول في قاعدة البيانات حسب عدد السجلات
SELECT 
    schemaname, 
    relname as table_name, 
    n_live_tup as approx_row_count
FROM pg_stat_user_tables 
WHERE n_live_tup > 0
ORDER BY n_live_tup DESC 
LIMIT 20;

-- فحص هل هناك جداول في مخطط 'public' لم تظهر في Adminer؟
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
