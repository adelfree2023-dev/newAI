-- فحص حجم قاعدة البيانات الحالية
SELECT pg_database_size('apex_prod') / 1024 / 1024 as size_mb;

-- فحص هل هناك أي بيانات في جداول النظام؟
SELECT sum(n_live_tup) FROM pg_stat_user_tables;
