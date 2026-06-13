/* ==========================================================================
   ОБЩИЙ СКРИПТ — поведение header, scroll-reveal, плавающий виджет,
   мобильное меню, обработка форм.
   ========================================================================== */

(function () {
  'use strict';

  // ---------- HEADER: эффект при прокрутке ----------
  const header = document.querySelector('.header-inner');
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 30) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- МОБИЛЬНОЕ МЕНЮ ----------
  const toggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------- ПЛАВАЮЩИЙ ВИДЖЕТ СВЯЗИ ----------
  const widget = document.querySelector('.floating-widget');
  if (widget) {
    const trigger = widget.querySelector('.widget-trigger');
    const menu = widget.querySelector('.widget-menu');
    if (trigger && menu) {
      trigger.addEventListener('click', () => {
        const open = menu.classList.toggle('open');
        trigger.classList.toggle('open', open);
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', e => {
        if (!widget.contains(e.target) && menu.classList.contains('open')) {
          menu.classList.remove('open');
          trigger.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // ---------- SCROLL-REVEAL ----------
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach(el => observer.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  // ---------- ФОРМЫ: лёгкая валидация + "отправка" ----------
  document.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn ? btn.textContent : '';
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Отправляем...';
      }
      // Имитация отправки — в продакшене заменить на реальный fetch
      setTimeout(() => {
        if (btn) {
          btn.textContent = '✓ Заявка принята';
          btn.style.background = 'linear-gradient(135deg, #5DEFA0, #25D366)';
        }
        form.reset();
        setTimeout(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = original;
            btn.style.background = '';
          }
        }, 3000);
      }, 900);
    });
  });

  // ---------- ПЛАВНЫЙ ЯКОРНЫЙ СКРОЛЛ ----------
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const offset = 100;
          const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });
})();
