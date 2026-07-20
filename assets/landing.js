const menuToggle=document.querySelector('[data-menu-toggle]');
const navLinks=document.querySelector('[data-nav-links]');

menuToggle?.addEventListener('click',()=>{
  const open=navLinks?.classList.toggle('open')??false;
  menuToggle.setAttribute('aria-expanded',String(open));
  menuToggle.textContent=open?'×':'☰';
});

navLinks?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
  navLinks.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded','false');
  if(menuToggle)menuToggle.textContent='☰';
}));

document.querySelectorAll('.faq-question').forEach(button=>{
  button.addEventListener('click',()=>{
    const item=button.closest('.faq-item');
    const wasOpen=item?.classList.contains('open');

    document.querySelectorAll('.faq-item.open').forEach(openItem=>{
      openItem.classList.remove('open');
      openItem.querySelector('.faq-question')?.setAttribute('aria-expanded','false');
    });

    if(item&&!wasOpen){
      item.classList.add('open');
      button.setAttribute('aria-expanded','true');
    }
  });
});

const year=document.querySelector('[data-year]');
if(year)year.textContent=new Date().getFullYear();
