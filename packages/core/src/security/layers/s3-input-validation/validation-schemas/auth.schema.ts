import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح').min(1, 'البريد الإلكتروني مطلوب'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
});

export const registerSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح').min(1, 'البريد الإلكتروني مطلوب'),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير')
    .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم')
    .regex(/[^A-Za-z0-9]/, 'يجب أن تحتوي على رمز خاص'),
  tenantName: z.string().min(3, 'اسم المتجر يجب أن يكون 3 أحرف على الأقل'),
  businessType: z.enum(['RETAIL', 'SERVICE', 'HEALTHCARE', 'RESTAURANT', 'OTHER']),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'الرمز مطلوب'),
  newPassword: z.string()
    .min(8, 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير')
    .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم')
    .regex(/[^A-Za-z0-9]/, 'يجب أن تحتوي على رمز خاص'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: z.string()
    .min(8, 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير')
    .regex(/[a-z]/, 'يجب أن تحتوي على حرف صغير')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم')
    .regex(/[^A-Za-z0-9]/, 'يجب أن تحتوي على رمز خاص'),
});