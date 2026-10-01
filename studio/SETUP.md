# إعداد مساحة مسار السحابية (Firebase)

هذا الدليل يفعّل تسجيل الدخول والحفظ السحابي لمساحة `/studio/`. يستغرق ~١٠ دقائق، ويتم مرة واحدة.

## ١) إنشاء مشروع Firebase
1. افتح <https://console.firebase.google.com> وسجّل الدخول بحسابك.
2. **Add project** → اسم المشروع (مثال: `masar-app`) → أكمل الخطوات (يمكن تعطيل Analytics).

## ٢) تفعيل تسجيل الدخول
1. من القائمة: **Build → Authentication → Get started**.
2. تبويب **Sign-in method**:
   - فعّل **Email/Password**.
   - (اختياري) فعّل **Google**.
3. تبويب **Settings → Authorized domains**: أضِف نطاق النشر:
   - `mansour-cyber.github.io`
   - `localhost` (للتجربة المحلية، موجود غالبًا).

## ٣) تفعيل قاعدة البيانات
1. **Build → Firestore Database → Create database**.
2. اختر **Production mode** → اختر الموقع الأقرب (مثال: `eur3` أو `nam5`).
3. بعد الإنشاء: تبويب **Rules** → الصق محتوى ملف [`firestore.rules`](../firestore.rules) بالكامل → **Publish**.

## ٤) ربط تطبيق الويب
1. **Project settings** (أيقونة الترس) → قسم **Your apps** → أيقونة **Web `</>`**.
2. سجّل التطبيق (اسم أي شيء) — **لا** تفعّل Hosting الآن.
3. انسخ كائن `firebaseConfig`، والصق قيمه في [`studio/config.js`](./config.js) مكان `REPLACE...`:

```js
export const firebaseConfig = {
  apiKey: "AIza…",
  authDomain: "masar-app.firebaseapp.com",
  projectId: "masar-app",
  storageBucket: "masar-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef…",
};
```

> هذه المفاتيح **عامة وآمنة** للنشر — الحماية الفعلية عبر قواعد Firestore والمصادقة، لا عبر إخفائها.

## ٥) التجربة
- ادفع التغييرات، ثم افتح: `https://mansour-cyber.github.io/Masar-Live/studio/`
- أنشئ حسابًا، ثم أنشئ «عملية جديدة» — يجب أن تُحفظ وتظهر في القائمة.
- للتجربة محليًا: شغّل خادمًا ثابتًا في جذر المشروع (`npx serve`) وافتح `/studio/`.

---

## نموذج البيانات (Firestore)
```
projects/{projectId}
  ├─ ownerUid : string        (مالك العملية = uid)
  ├─ name     : string
  ├─ data     : { nodes[], edges[], lanes[] }   ← مخطط العملية
  ├─ createdAt: timestamp
  └─ updatedAt: timestamp

users/{uid}   (اختياري — المرحلة القادمة: الملف الشخصي والمؤسسة)
```

## المراحل القادمة (بعد هذا الأساس)
1. **تكامل المحرر السحابي**: ربط محرر `/app/` بـ Firestore ليحمّل ويحفظ العملية بمعرّفها (`?pid=`) بدل localStorage.
2. **المؤسسات والصلاحيات**: `orgs/{orgId}` + أدوار (مالك/محرّر/مطّلع) ومشاركة العمليات.
3. **مكتبة القوالب** على مستوى المؤسسة + سجل مراجعات.
4. **الاشتراك السنوي** والفوترة + لوحة إدارة.
