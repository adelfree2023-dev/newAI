-- فحص المخططات المتخصصة
SELECT 'tenant_iso1' as schema, count(*) FROM "tenant_iso1".users
UNION ALL
SELECT 'tenant_iso2', count(*) FROM "tenant_iso2".users;

-- هل هناك أي مستخدمين مسجلين في أي جدول يحمل اسم مشابه؟
SELECT schemaname, relname, n_live_tup 
FROM pg_stat_user_tables 
WHERE relname ILIKE '%user%';
