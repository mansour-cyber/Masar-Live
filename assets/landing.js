const menuToggle=document.querySelector('[data-menu-toggle]');
const navLinks=document.querySelector('[data-nav-links]');

menuToggle?.addEventListener('click',()=>{
  const open=navLinks.classList.toggle('open');
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
    const open=item.classList.toggle('open');
    button.setAttribute('aria-expanded',String(open));
  });
});

const revealItems=document.querySelectorAll('.reveal');
if('IntersectionObserver' in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:.12});
  revealItems.forEach(item=>observer.observe(item));
}else{
  revealItems.forEach(item=>item.classList.add('visible'));
}

const year=document.querySelector('[data-year]');
if(year)year.textContent=new Date().getFullYear();
