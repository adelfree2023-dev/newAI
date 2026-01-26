# Dockerfile للمرحلة الأولى
FROM node:20-alpine AS builder

# تثبيت التبعيات الأساسية
RUN apk add --no-cache git python3 make g++

# تعيين مجلد العمل
WORKDIR /app

# نسخ package.json و yarn.lock
COPY package*.json ./

# تثبيت التبعيات
RUN npm install --production=false

# نسخ الملفات المصدرية
COPY . .

# بناء المشروع
RUN npm run build

# صورة الإنتاج النهائية
FROM node:20-alpine

# تثبيت التبعيات للإنتاج فقط
RUN apk add --no-cache openssl tini

# تعيين المستخدم غير الجذر
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# تعيين مجلد العمل
WORKDIR /app

# نسخ الملفات المبنية من الصورة السابقة
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env.production ./.env

# تثبيت التبعيات للإنتاج
RUN npm install --production=true --ignore-scripts

# تعيين الأذونات
RUN chown -R nextjs:nodejs /app && \
    chmod -R 755 /app/dist

# تغيير المستخدم
USER nextjs

# تعريض المنفذ
EXPOSE 3000

# نقطة التشغيل
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
