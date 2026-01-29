DO $$
DECLARE
    r RECORD;
    total_users INT := 0;
    current_count INT;
    schema_with_data_count INT := 0;
BEGIN
    FOR r IN 
        SELECT nspname 
        FROM pg_namespace 
        WHERE nspname LIKE 'tenant_%'
    LOOP
        BEGIN
            EXECUTE format('SELECT count(*) FROM %I.users', r.nspname) INTO current_count;
            total_users := total_users + current_count;
            IF current_count > 0 THEN
                schema_with_data_count := schema_with_data_count + 1;
                RAISE NOTICE 'Schema % has % users', r.nspname, current_count;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- إذا كان الجدول غير موجود في مخطط معين تخطاه
            CONTINUE;
        END;
    END LOOP;
    
    RAISE NOTICE '-------------------------------------------';
    RAISE NOTICE 'Total Users found: %', total_users;
    RAISE NOTICE 'Number of schemas with at least one user: %', schema_with_data_count;
END $$;
