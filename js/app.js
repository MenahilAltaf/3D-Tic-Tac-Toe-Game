/* =====================================================
   TRIAD — app.js
   Shared behaviour across every page: mobile nav, scroll
   reveal animations, and the FAQ accordion.
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initScrollReveal();
  initFaqAccordion();
  markActiveNavLink();
});

/**
 * Toggles the mobile navigation menu open/closed when the
 * hamburger button is clicked, and closes it again whenever
 * a link inside the menu is chosen.
 */
function initMobileNav() {
  const toggleBtn = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (!toggleBtn || !navLinks) return;

  toggleBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    toggleBtn.classList.toggle('active');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      toggleBtn.classList.remove('active');
    });
  });
}

/**
 * Adds the "active" class to whichever nav link matches the
 * current page, so visitors always know where they are.
 */
function markActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
  });
}

/**
 * Uses an IntersectionObserver to fade + slide elements with
 * the "reveal" class into view as the user scrolls to them.
 * This keeps the animation cheap (no scroll event listeners).
 */
function initScrollReveal() {
  const revealItems = document.querySelectorAll('.reveal');
  if (!revealItems.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

/**
 * Expands/collapses FAQ answers when a question is clicked.
 * Only one answer is kept open at a time within its group.
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close sibling FAQ items in the same list for a clean accordion feel
      const parentList = item.parentElement;
      parentList.querySelectorAll('.faq-item.open').forEach((openItem) => {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-answer').style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add('open');
        const answer = item.querySelector('.faq-answer');
        answer.style.maxHeight = answer.scrollHeight + 40 + 'px';
      }
    });
  });
}
