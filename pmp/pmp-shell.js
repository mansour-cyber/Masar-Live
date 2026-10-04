(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = (ar, en) => `<span data-ar="${esc(ar)}" data-en="${esc(en)}">${esc(document.documentElement.lang === 'en' ? en : ar)}</span>`;
  function updateLanguage(language) {
    document.querySelectorAll('.workspace-shell [data-ar]').forEach(el => { el.textContent = el.dataset[language]; });
    document.querySelectorAll('.workspace-shell [data-shell-language]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.shellLanguage === language));
    });
  }
  function mount({host, user, area = 'course', onLanguage, onLogout}) {
    const root = area === 'course' ? './' : '../';
    host.classList.add('workspace-shell');
    host.innerHTML = `<div class="workspace-header notranslate" translate="no">
      <a class="workspace-brand" id="course-link" href="${root}?learn=1"><span class="workspace-mark" aria-hidden="true">ATQN</span><span><strong>${text('أتقن','ATQN')}</strong><small>${text('تعلّم. تدرّب. تابع تقدمك.','Learn. Practice. Track your progress.')}</small></span></a>
      <div class="workspace-account"><span id="account-name" class="account-name">${esc(user?.display_name || user?.username || '')}</span><div class="language-toggle" role="group" aria-label="Language"><button id="language-ar" data-shell-language="ar" lang="ar">عربي</button><button id="language-en" data-shell-language="en" lang="en">English</button></div><button id="signout" class="workspace-logout">${text('خروج','Sign out')}</button></div>
    </div><nav class="workspace-navigation notranslate" translate="no" aria-label="${document.documentElement.lang === 'en' ? 'Your learning journey' : 'رحلتك التعليمية'}">
      <a href="${root}?learn=1" ${area === 'course' ? 'aria-current="page"' : ''}>${text('رحلة التعلم','Learning journey')}</a>
      <a href="${root}practice/?v=10" ${area === 'practice' ? 'aria-current="page"' : ''}>${text('بنك الأسئلة','Question bank')}</a>
      <a id="adminLink" href="${root}admin/?v=10" ${area === 'admin' ? 'aria-current="page"' : ''} ${user?.role === 'admin' ? '' : 'hidden'}>${text('إدارة المنصة','Administration')}</a>
    </nav><span id="sync-status" class="workspace-sync" ${area === 'practice' ? '' : 'hidden'}></span>`;
    updateLanguage(document.documentElement.lang === 'en' ? 'en' : 'ar');
    if (onLanguage) host.querySelectorAll('[data-shell-language]').forEach(button => {
      button.onclick = () => onLanguage(button.dataset.shellLanguage);
    });
    if (onLogout) host.querySelector('#signout').onclick = onLogout;
  }
  window.PMP_SHELL = {mount, updateLanguage};
})();
