'use strict';

// ─── Mobile navigation ────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

hamburger.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// ─── Scroll reveal ───────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  }),
  { threshold: 0.12 }
);

document.querySelectorAll('.fade-up').forEach(el => revealObserver.observe(el));

// Elements inside .js-reveal-immediate are revealed on load without
// waiting for them to scroll into view (used for above-the-fold content).
document.querySelectorAll('.js-reveal-immediate .fade-up').forEach(el => {
  setTimeout(() => el.classList.add('visible'), 80);
});
