// ============================================================
// إعداد Firebase لمنصة مسار (SaaS)
// استبدل القيم أدناه بإعداد مشروعك من:
// Firebase Console → Project settings → Your apps → SDK setup (Config)
// ملاحظة: هذه المفاتيح عامة وآمنة للنشر — الحماية الفعلية عبر
// قواعد Firestore (firestore.rules) والمصادقة، لا عبر إخفاء المفاتيح.
// ============================================================
export const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_FIREBASE_API_KEY",
  authDomain: "REPLACE.firebaseapp.com",
  projectId: "REPLACE",
  storageBucket: "REPLACE.appspot.com",
  messagingSenderId: "REPLACE",
  appId: "REPLACE",
};

// يتحوّل تلقائيًا إلى وضع "الإعداد مطلوب" ما دامت القيم افتراضية.
export const isConfigured =
  !String(firebaseConfig.apiKey).startsWith("REPLACE") &&
  !String(firebaseConfig.projectId).startsWith("REPLACE");

// إصدار Firebase Web SDK المستخدم (modular، عبر CDN).
export const FIREBASE_VERSION = "10.12.5";
