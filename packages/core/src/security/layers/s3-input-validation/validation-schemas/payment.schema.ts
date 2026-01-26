import { z } from 'zod';

export const paymentSchema = z.object({
  amount: z.number().positive('المبلغ يجب أن يكون موجباً').min(1, 'يجب أن يكون المبلغ أكبر من الصفر'),
  currency: z.enum(['SAR', 'USD', 'EUR', 'GBP', 'AED', 'EGP'], {
    errorMap: () => ({ message: 'عملة غير مدعومة' })
  }),
  sourceId: z.string().min(1, 'مصدر الدفع مطلوب'),
  description: z.string().min(5, 'الوصف يجب أن يكون 5 أحرف على الأقل'),
  customerId: z.string().min(1, 'معرف العميل مطلوب'),
  metadata: z.record(z.string()).optional(),
});

export const refundSchema = z.object({
  paymentId: z.string().min(1, 'معرف الدفع مطلوب'),
  amount: z.number().positive('المبلغ يجب أن يكون موجباً').optional(),
  reason: z.string().min(3, 'السبب مطلوب').optional(),
});