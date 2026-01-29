-- إنشاء جدول المستأجرين الرئيسي (إذا لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS public.tenants (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    schema_name VARCHAR(63) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول المستخدمين في المخطط العام (لإدارة النظام)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'USER',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    tenant_id VARCHAR(36) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إضافة مستخدم مدير للنظام (اختياري للتجربة)
INSERT INTO public.users (email, password_hash, role, tenant_id)
VALUES ('admin@apex-platform.com', '$2b$10$vM.9ZAs8K/oI2Z6sRlyQ0uFfO8mGvGvGvGvGvGvGvGvGvGvGvGvG', 'SUPER_ADMIN', 'system')
ON CONFLICT (email) DO NOTHING;
