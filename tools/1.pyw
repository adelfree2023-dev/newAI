import os
import sys
import tkinter as tk
from tkinter import messagebox, scrolledtext

# ✨ تحديد مسار الملف الحالي كمسار ثابت (لا يمكن تعديله)
if getattr(sys, 'frozen', False):
    base_dir = os.path.dirname(sys.executable)
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(base_dir)

# إعدادات ثابتة
DEFAULT_CONTENT = "# اكتب/الصق محتوى الملف هنا...\nprint('مرحباً!')"
LOG_HISTORY = []  # لتخزين سجل العمليات

def save_file():
    relative_path = path_entry.get().strip()
    content = content_text.get("1.0", tk.END).strip()
    
    # التحقق من المدخلات
    if not relative_path:
        log_message("✗ خطأ: مسار الملف النسبي فارغ!", "error")
        return
    if content == DEFAULT_CONTENT.strip():
        log_message("✗ خطأ: المحتوى فارغ!", "error")
        return
    
    try:
        # بناء المسار الكامل
        full_path = os.path.normpath(os.path.join(base_dir, relative_path))
        folder = os.path.dirname(full_path)
        
        # التحقق من وجود الملف
        if os.path.exists(full_path):
            response = messagebox.askyesno(
                "تحذير استبدال",
                f"الملف موجود بالفعل:\n{os.path.basename(full_path)}\n\n"
                "هل تريد استبداله بالملف الجديد؟",
                icon=messagebox.WARNING
            )
            if not response:
                log_message(f"✗ تم إلغاء حفظ: {relative_path}", "warning")
                return
        
        # إنشاء المجلدات المطلوبة
        if folder and not os.path.exists(folder):
            os.makedirs(folder)
            log_message(f"✓ تم إنشاء المجلد: {os.path.relpath(folder, base_dir)}", "info")
        
        # حفظ الملف
        with open(full_path, 'w', encoding='utf-8') as file:
            file.write(content)
        
        # تحديث السجل
        log_message(f"✓ تم الحفظ: {relative_path}", "success")
        
        # مسح الحقول للملف التالي
        reset_interface()
        
    except Exception as e:
        log_message(f"✗ خطأ: {str(e)}", "error")

def reset_interface():
    """إعادة تعيين الواجهة للملف التالي"""
    path_entry.delete(0, tk.END)
    content_text.delete("1.0", tk.END)
    content_text.insert(tk.END, DEFAULT_CONTENT)
    content_text.config(fg='grey')
    path_entry.focus_set()

def log_message(message, msg_type="info"):
    """إضافة رسالة إلى سجل العمليات مع تنسيق ألوان"""
    # تنسيق الألوان حسب نوع الرسالة
    colors = {
        "success": "#27ae60",
        "error": "#e74c3c",
        "warning": "#f39c12",
        "info": "#3498db"
    }
    
    # إضافة الوقت إلى الرسالة
    from datetime import datetime
    timestamp = datetime.now().strftime("%H:%M:%S")
    formatted_msg = f"[{timestamp}] {message}"
    
    # إضافة إلى السجل
    LOG_HISTORY.append(formatted_msg)
    if len(LOG_HISTORY) > 50:  # الحد من عدد السجلات
        LOG_HISTORY.pop(0)
    
    # تحديث منطقة السجل
    log_text.config(state=tk.NORMAL)
    log_text.delete("1.0", tk.END)
    
    # إضافة كل رسالة مع لونها
    for msg in LOG_HISTORY:
        if "✓ تم الحفظ" in msg:
            log_text.insert(tk.END, msg + "\n", "success")
        elif "✗" in msg:
            log_text.insert(tk.END, msg + "\n", "error")
        elif "تم إنشاء" in msg:
            log_text.insert(tk.END, msg + "\n", "info")
        else:
            log_text.insert(tk.END, msg + "\n", "normal")
    
    # تطبيق الألوان
    log_text.tag_config("success", foreground=colors["success"])
    log_text.tag_config("error", foreground=colors["error"])
    log_text.tag_config("info", foreground=colors["info"])
    log_text.tag_config("normal", foreground="#555")
    
    log_text.see(tk.END)  # التمرير إلى الأسفل
    log_text.config(state=tk.DISABLED)

def copy_base_path():
    """نسخ مسار القاعدة إلى الحافظة"""
    root.clipboard_clear()
    root.clipboard_append(base_dir)
    log_message(f"✓ تم نسخ مسار القاعدة: {base_dir}", "info")

# إنشاء النافذة الرئيسية
root = tk.Tk()
root.title(f"محرر ملفات آمن - ({os.path.basename(base_dir)})")
root.geometry("750x650")
root.minsize(700, 500)
root.configure(bg='#f0f0f0')

# إطار المسار (ثابت)
path_frame = tk.Frame(root, bg='#f0f0f0')
path_frame.pack(pady=10, padx=20, fill='x')

tk.Label(path_frame, text="📁 مسار القاعدة (غير قابل للتعديل):", 
         bg='#f0f0f0', font=('Arial', 10, 'bold'), fg='#2c3e50').pack(anchor='w')

# مسار القاعدة (ثابت - غير قابل للتعديل)
base_path_label = tk.Label(
    path_frame,
    text=base_dir,
    font=('Consolas', 11),
    bg='#e9f7fe',
    fg='#2c3e50',
    relief=tk.SOLID,
    borderwidth=1,
    padx=10,
    pady=5,
    anchor='w',
    cursor='hand2'
)
base_path_label.pack(fill='x', pady=5)
base_path_label.bind("<Double-Button-1>", lambda e: copy_base_path())

tk.Label(path_frame, text="✏️ مسار الملف النسبي (اسم الملف أو المجلد الفرعي):", 
         bg='#f0f0f0', font=('Arial', 10, 'bold'), fg='#2c3e50').pack(anchor='w', pady=(10,0))

# مسار نسبي (قابل للتعديل)
path_entry = tk.Entry(path_frame, font=('Consolas', 11), width=60, 
                     bg='#ffffff', relief=tk.SOLID, borderwidth=1)
path_entry.pack(fill='x', pady=5, ipady=3)

# إطار المحتوى
content_frame = tk.Frame(root, bg='#f0f0f0')
content_frame.pack(pady=5, padx=20, fill='both', expand=True)

tk.Label(content_frame, text="📝 محتوى الملف:", bg='#f0f0f0', 
         font=('Arial', 10, 'bold'), fg='#2c3e50').pack(anchor='w')

content_text = scrolledtext.ScrolledText(
    content_frame, 
    wrap=tk.WORD, 
    font=('Courier New', 11),
    bg='#ffffff',
    fg='grey',
    relief=tk.SOLID,
    borderwidth=1,
    padx=10,
    pady=10,
    height=12
)
content_text.pack(fill='both', expand=True)
content_text.insert(tk.END, DEFAULT_CONTENT)
content_text.bind("<FocusIn>", lambda e: (
    content_text.delete("1.0", tk.END) if content_text.get("1.0", "end-1c") == DEFAULT_CONTENT else None,
    content_text.config(fg='black')
))

# زر الحفظ
button_frame = tk.Frame(root, bg='#f0f0f0')
button_frame.pack(pady=10)

save_button = tk.Button(
    button_frame, 
    text="💾 حفظ وانتقال للملف التالي", 
    command=save_file,
    bg='#2ecc71',
    fg='white',
    font=('Arial', 12, 'bold'),
    padx=20,
    pady=8,
    relief=tk.RAISED,
    borderwidth=2,
    activebackground='#27ae60',
    cursor='hand2'
)
save_button.pack(ipadx=10)

# منطقة السجل (Log Area)
log_frame = tk.Frame(root, bg='#f0f0f0')
log_frame.pack(pady=5, padx=20, fill='both', expand=True)

tk.Label(log_frame, text="📋 سجل العمليات:", bg='#f0f0f0', 
         font=('Arial', 10, 'bold'), fg='#2c3e50').pack(anchor='w')

log_text = scrolledtext.ScrolledText(
    log_frame,
    wrap=tk.WORD,
    font=('Arial', 9),
    bg='#f8f9fa',
    fg='#333',
    relief=tk.SOLID,
    borderwidth=1,
    height=8,
    state=tk.DISABLED
)
log_text.pack(fill='both', expand=True)

# إضافة رسالة ترحيب
log_message(f"مرحباً! مسار القاعدة: {base_dir}", "info")
log_message("• اكتب مساراً نسبياً مثل: packages/core/file.py", "info")
log_message("• اضغط Ctrl+S للحفظ السريع", "info")
log_message("• النقر المزدوج على مسار القاعدة ينسخه إلى الحافظة", "info")

# اختصارات لوحة المفاتيح
root.bind('<Control-s>', lambda event: save_file())

# تهيئة الواجهة
path_entry.focus_set()

root.mainloop()