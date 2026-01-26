import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(3, 'اسم المتجر يجب أن يكون 3 أحرف على الأقل').max(50, 'الاسم طويل جداً'),
  domain: z.string().min(3, 'النطاق يجب أن يكون 3 أحرف على الأقل')
    .regex(/^[a-z0-9-]+$/, 'النطاق يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط'),
  businessType: z.enum(['RETAIL', 'SERVICE', 'HEALTHCARE', 'RESTAURANT', 'OTHER'], {
    errorMap: () => ({ message: 'نوع العمل غير صالح' })
  }),
  contactEmail: z.string().email('البريد الإلكتروني غير صالح'),
  contactPhone: z.string()
    .regex(/^[\d\s+()-]*$/, 'رقم الهاتف يحتوي على أحرف غير صالحة')
    .min(8, 'رقم الهاتف قصير جداً'),
  address: z.object({
    street: z.string().min(5, 'اسم الشارع مطلوب'),
    city: z.string().min(2, 'المدينة مطلوبة'),
    country: z.string().min(2, 'البلد مطلوب'),
    postalCode: z.string().min(3, 'الرمز البريدي مطلوب'),
  }),
  subscriptionPlan: z.enum(['FREE', 'PRO', 'ENTERPRISE'], {
    errorMap: () => ({ message: 'خطة الاشتراك غير صالحة' })
  }).default('FREE'),
});

export const updateTenantSchema = z.object({
  name: z.string().min(3, 'اسم المتجر يجب أن يكون 3 أحرف على الأقل').max(50, 'الاسم طويل جداً').optional(),
  businessType: z.enum(['RETAIL', 'SERVICE', 'HEALTHCARE', 'RESTAURANT', 'OTHER']).optional(),
  contactEmail: z.string().email('البريد الإلكتروني غير صالح').optional(),
  contactPhone: z.string()
    .regex(/^[\d\s+()-]*$/, 'رقم الهاتف يحتوي على أحرف غير صالحة')
    .min(8, 'رقم الهاتف قصير جداً').optional(),
  address: z.object({
    street: z.string().min(5, 'اسم الشارع مطلوب').optional(),
    city: z.string().min(2, 'المدينة مطلوبة').optional(),
    country: z.string().min(2, 'البلد مطلوب').optional(),
    postalCode: z.string().min(3, 'الرمز البريدي مطلوب').optional(),
  }).optional(),
  settings: z.object({
    language: z.string().min(2, 'رمز اللغة غير صالح').optional(),
    timezone: z.string().optional(),
    currency: z.enum(['SAR', 'USD', 'EUR', 'GBP', 'AED', 'EGP']).optional(),
  }).optional(),
});