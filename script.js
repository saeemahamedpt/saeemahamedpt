
const toggle = document.querySelector('#mode-toggle');
toggle?.addEventListener('click', () => {
  document.documentElement.classList.toggle('light');
  const mode = document.documentElement.classList.contains('light') ? 'Light' : 'Dark';
  toggle.textContent = mode + ' mode';
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = document.querySelector(id);
    if(target){
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth'});
    }
  })
})
