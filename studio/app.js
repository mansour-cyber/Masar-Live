// ============================================================
// مسار — منطق مساحة العمل السحابية (المصادقة + المشاريع)
// Firebase Web SDK (modular) عبر CDN. الحماية عبر قواعد Firestore.
// ============================================================
import { firebaseConfig, isConfigured, FIREBASE_VERSION } from './config.js';

const $ = (id) => document.getElementById(id);
const CDN = (m) => `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-${m}.js`;

const el = {
  setupBanner: $('setupBanner'), authView: $('authView'), appView: $('appView'),
  authTitle: $('authTitle'), authSub: $('authSub'), authSubmit: $('authSubmit'),
  authForm: $('authForm'), authError: $('authError'), nameField: $('nameField'),
  displayName: $('displayName'), email: $('email'), password: $('password'),
  googleBtn: $('googleBtn'), userEmail: $('userEmail'), logoutBtn: $('logoutBtn'),
  newProjectBtn: $('newProjectBtn'), projectsGrid: $('projectsGrid'),
  projectsState: $('projectsState'), projectsCount: $('projectsCount'),
  modal: $('modal'), modalTitle: $('modalTitle'), projectName: $('projectName'),
  modalCancel: $('modalCancel'), modalSave: $('modalSave'), toast: $('toast'),
};

let mode = 'login';         // login | signup
let fb = null;              // { auth, db, api }
let currentUser = null;
let editingId = null;       // id قيد إعادة التسمية، أو null للإنشاء

// ---------- أدوات واجهة ----------
function toast(msg) {
  el.toast.textContent = msg; el.toast.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.toast.classList.remove('show'), 2200);
}
function showError(msg) { el.authError.textContent = msg; el.authError.hidden = !msg; }
function show(node, on = true) { node.hidden = !on; }
function fmtDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
    if (!d) return '—';
    return new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(d);
  } catch { return '—'; }
}

// ---------- وضع الإعداد المطلوب ----------
if (!isConfigured) {
  show(el.setupBanner, true);
  show(el.authView, true);
  el.authSubmit.disabled = true; el.googleBtn.disabled = true;
  el.authSubmit.classList.add('btn-primary');
  showError('أضِف إعداد Firebase في studio/config.js لتفعيل الدخول والحفظ السحابي.');
}

// ---------- ربط أزرار الواجهة (يعمل حتى قبل تحميل Firebase) ----------
document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});
function setMode(next) {
  mode = next;
  document.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('is-on', t.dataset.mode === next));
  const signup = next === 'signup';
  el.authTitle.textContent = signup ? 'إنشاء حساب' : 'تسجيل الدخول';
  el.authSub.textContent = signup ? 'ابدأ مساحتك وابنِ عملياتك.' : 'ادخل إلى عملياتك المحفوظة سحابيًا.';
  el.authSubmit.textContent = signup ? 'إنشاء الحساب' : 'دخول';
  show(el.nameField, signup);
  el.password.setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
  showError('');
}

// ---------- تهيئة Firebase ----------
async function initFirebase() {
  if (!isConfigured) return;
  try {
    const [{ initializeApp }, authMod, dbMod] = await Promise.all([
      import(CDN('app')), import(CDN('auth')), import(CDN('firestore')),
    ]);
    const app = initializeApp(firebaseConfig);
    const auth = authMod.getAuth(app);
    await authMod.setPersistence(auth, authMod.browserLocalPersistence).catch(() => {});
    const db = dbMod.getFirestore(app);
    fb = { auth, db, api: { ...authMod, ...dbMod } };
    wireAuthedUI();
    fb.api.onAuthStateChanged(auth, onAuthChange);
  } catch (err) {
    console.error(err);
    show(el.authView, true);
    showError('تعذّر تحميل Firebase. تأكد من الاتصال ومن صحة الإعداد.');
  }
}

// ---------- المصادقة ----------
function friendlyAuthError(code) {
  const map = {
    'auth/invalid-email': 'البريد الإلكتروني غير صحيح.',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد.',
    'auth/wrong-password': 'كلمة المرور غير صحيحة.',
    'auth/invalid-credential': 'بيانات الدخول غير صحيحة.',
    'auth/email-already-in-use': 'هذا البريد مستخدم بالفعل — سجّل الدخول.',
    'auth/weak-password': 'كلمة المرور ضعيفة (٦ أحرف على الأقل).',
    'auth/too-many-requests': 'محاولات كثيرة — حاول لاحقًا.',
    'auth/popup-closed-by-user': 'أُغلقت نافذة Google قبل الإكمال.',
    'auth/unauthorized-domain': 'النطاق غير مصرّح — أضِفه في Firebase Auth.',
  };
  return map[code] || 'حدث خطأ غير متوقع، حاول مجددًا.';
}

el.authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!fb) return;
  showError('');
  const email = el.email.value.trim(), pass = el.password.value;
  if (!email || pass.length < 6) { showError('أدخل بريدًا صحيحًا وكلمة مرور من ٦ أحرف على الأقل.'); return; }
  el.authSubmit.disabled = true;
  try {
    if (mode === 'signup') {
      const cred = await fb.api.createUserWithEmailAndPassword(fb.auth, email, pass);
      const name = el.displayName.value.trim();
      if (name) await fb.api.updateProfile(cred.user, { displayName: name }).catch(() => {});
    } else {
      await fb.api.signInWithEmailAndPassword(fb.auth, email, pass);
    }
  } catch (err) {
    showError(friendlyAuthError(err.code));
  } finally {
    el.authSubmit.disabled = false;
  }
});

function wireAuthedUI() {
  el.googleBtn.addEventListener('click', async () => {
    if (!fb) return;
    showError('');
    try {
      const provider = new fb.api.GoogleAuthProvider();
      await fb.api.signInWithPopup(fb.auth, provider);
    } catch (err) { showError(friendlyAuthError(err.code)); }
  });
  el.logoutBtn.addEventListener('click', () => fb && fb.api.signOut(fb.auth));
  el.newProjectBtn.addEventListener('click', () => openModal(null));
  el.modalCancel.addEventListener('click', closeModal);
  el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });
  el.modalSave.addEventListener('click', saveProject);
  el.projectName.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveProject(); });
}

async function onAuthChange(user) {
  currentUser = user;
  if (user) {
    show(el.setupBanner, false);
    show(el.authView, false);
    show(el.appView, true);
    el.userEmail.textContent = user.email || user.displayName || '';
    await loadProjects();
  } else {
    show(el.appView, false);
    show(el.authView, true);
    setMode('login');
  }
}

// ---------- المشاريع (Firestore) ----------
function projectsCol() { return fb.api.collection(fb.db, 'projects'); }

async function loadProjects() {
  el.projectsGrid.innerHTML = '';
  show(el.projectsState, true);
  el.projectsState.innerHTML = '<span class="app-muted">جارٍ التحميل…</span>';
  try {
    const q = fb.api.query(
      projectsCol(),
      fb.api.where('ownerUid', '==', currentUser.uid),
      fb.api.orderBy('updatedAt', 'desc'),
    );
    const snap = await fb.api.getDocs(q);
    const items = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    renderProjects(items);
  } catch (err) {
    console.error(err);
    // orderBy قد يتطلب فهرسًا؛ نعيد المحاولة دون ترتيب للعرض الأولي.
    try {
      const q2 = fb.api.query(projectsCol(), fb.api.where('ownerUid', '==', currentUser.uid));
      const snap2 = await fb.api.getDocs(q2);
      const items = [];
      snap2.forEach((d) => items.push({ id: d.id, ...d.data() }));
      items.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      renderProjects(items);
    } catch (err2) {
      console.error(err2);
      show(el.projectsState, true);
      el.projectsState.innerHTML = '<strong>تعذّر تحميل العمليات</strong>تأكد من نشر قواعد Firestore وتفعيل قاعدة البيانات.';
      el.projectsCount.textContent = '';
    }
  }
}

function renderProjects(items) {
  el.projectsCount.textContent = items.length ? `${items.length} عملية` : 'لا عمليات بعد';
  if (!items.length) {
    show(el.projectsState, true);
    el.projectsState.innerHTML = '<strong>ابدأ عمليتك الأولى</strong>أنشئ عملية جديدة لتوثيق الإجراء وحسم المسؤوليات وحفظها سحابيًا.';
    return;
  }
  show(el.projectsState, false);
  el.projectsGrid.innerHTML = '';
  items.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="pc-mark"><img src="../brand/masar-symbol.svg" alt=""></div>
      <h3></h3>
      <div class="pc-meta">آخر تحديث: ${fmtDate(p.updatedAt)}</div>
      <div class="pc-actions">
        <button class="pc-btn" data-act="open">فتح</button>
        <button class="pc-btn" data-act="rename">إعادة تسمية</button>
        <button class="pc-btn danger" data-act="delete">حذف</button>
      </div>`;
    card.querySelector('h3').textContent = p.name || 'عملية بدون اسم';
    card.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'open' || !act) return openProject(p);
      if (act === 'rename') return openModal(p);
      if (act === 'delete') return deleteProject(p);
    });
    el.projectsGrid.appendChild(card);
  });
}

function openProject(p) {
  // تكامل المحرر السحابي هو المرحلة التالية؛ نمرّر معرّف العملية للمحرر.
  location.href = `../app/?pid=${encodeURIComponent(p.id)}`;
}

// ---------- إنشاء/تعديل ----------
function openModal(project) {
  editingId = project?.id || null;
  el.modalTitle.textContent = editingId ? 'إعادة تسمية العملية' : 'عملية جديدة';
  el.projectName.value = project?.name || '';
  show(el.modal, true);
  setTimeout(() => el.projectName.focus(), 30);
}
function closeModal() { show(el.modal, false); editingId = null; }

async function saveProject() {
  const name = el.projectName.value.trim();
  if (!name) { el.projectName.focus(); return; }
  el.modalSave.disabled = true;
  try {
    if (editingId) {
      await fb.api.updateDoc(fb.api.doc(fb.db, 'projects', editingId), {
        name, updatedAt: fb.api.serverTimestamp(),
      });
      toast('حُدّث الاسم');
    } else {
      await fb.api.addDoc(projectsCol(), {
        ownerUid: currentUser.uid,
        name,
        data: { nodes: [], edges: [], lanes: [] },
        createdAt: fb.api.serverTimestamp(),
        updatedAt: fb.api.serverTimestamp(),
      });
      toast('أُنشئت العملية');
    }
    closeModal();
    await loadProjects();
  } catch (err) {
    console.error(err);
    toast('تعذّر الحفظ — تحقّق من القواعد');
  } finally {
    el.modalSave.disabled = false;
  }
}

async function deleteProject(p) {
  if (!confirm(`حذف «${p.name || 'العملية'}»؟ لا يمكن التراجع.`)) return;
  try {
    await fb.api.deleteDoc(fb.api.doc(fb.db, 'projects', p.id));
    toast('حُذفت العملية');
    await loadProjects();
  } catch (err) {
    console.error(err);
    toast('تعذّر الحذف');
  }
}

// ---------- إقلاع ----------
setMode('login');
initFirebase();
