-- تعديل أسماء الأعمدة لتتوافق مع TypeORM
ALTER TABLE public.users RENAME COLUMN first_name TO "firstName";
ALTER TABLE public.users RENAME COLUMN last_name TO "lastName";
ALTER TABLE public.users RENAME COLUMN password_hash TO "passwordHash";
ALTER TABLE public.users RENAME COLUMN tenant_id TO "tenantId";
ALTER TABLE public.users RENAME COLUMN created_at TO "createdAt";
ALTER TABLE public.users RENAME COLUMN updated_at TO "updatedAt";

-- التأكد من وجود عمود mfaEnabled و mfaSecret (من واقع الكود)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "mfaSecret" VARCHAR(255);
