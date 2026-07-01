/* ==========================================================================
   ОБЩИЙ СКРИПТ — header, тема (light/dark), scroll-reveal, виджет, формы.
   ========================================================================== */

(function () {
  'use strict';

  // ---------- ТЕМА (light / dark) ----------
  const THEME_KEY = 'music-school-theme';
  const root = document.documentElement;

  const getInitialTheme = () => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  };

  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#F4ECDD' : '#0F0E1A');
    }
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
      btn.setAttribute('aria-label', theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему');
    });
  };

  applyTheme(getInitialTheme());

  document.addEventListener('click', e => {
    const btn = e.target.closest('.theme-toggle');
    if (!btn) return;
    const current = root.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  // ---------- HEADER: эффект при прокрутке ----------
  // С 80px (а не 30) — хедер плавно появляется, не "мигает" на коротких
  // отскоках вверх, и хватает времени, чтобы юзер прокрутил мимо
  // верхней "шапки" hero. Прозрачный хедер на главной (см. body.home в nike.css)
  // подхватывает состояние .scrolled, меняя фон/цвет/тень.
  const header = document.querySelector('.header-inner');
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 80) header.classList.add('scrolled');
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

  // ---------- ФОРМЫ: реальная отправка через /api/requests (см. js/form-handler.js) ----------
  // Имитация удалена — за нас работает form-handler.js, подключённый как
  // <script type="module"> на страницах с формами.

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

  // ---------- КАСТОМНЫЙ DROPDOWN (стилизованный <select>) ----------
  // Нативный <select> остаётся в DOM (для отправки формы и нативной валидации),
  // но визуально скрыт (display: none). Кастомный триггер + .select-menu
  // управляют отображением. Параллельно создаём <input type="hidden" name=...>,
  // который и отправляется с формой — он гарантированно "чист" и не зависит
  // от того, как браузер обрабатывает скрытый <select>.
  const closeAllSelects = (except) => {
    document.querySelectorAll('.select.open').forEach(s => {
      if (s === except) return;
      s.classList.remove('open');
      const t = s.querySelector('[data-select-trigger]');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  };

  const initSelect = (root) => {
    const select = root.querySelector('select');
    const trigger = root.querySelector('[data-select-trigger]');
    const label = root.querySelector('[data-select-label]');
    const menu = root.querySelector('[data-select-menu]');
    if (!select || !trigger || !label || !menu) return;

    // Создаём/находим скрытый input, дублирующий значение <select> для отправки.
    // Снимаем name с нативного <select> (он display:none и не должен отправляться),
    // иначе в FormData поле появится дважды.
    let hidden = null;
    if (select.name) {
      hidden = root.querySelector('input[type="hidden"][data-select-hidden]');
      if (!hidden) {
        hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = select.name;
        hidden.setAttribute('data-select-hidden', '');
        root.insertBefore(hidden, select.nextSibling);
      }
      // Убираем name с нативного <select>, чтобы не дублировать поле в FormData.
      select.removeAttribute('name');
    }

    const options = Array.from(menu.querySelectorAll('.select-option'));

    const setLabel = (text, isPlaceholder) => {
      label.textContent = text;
      label.classList.toggle('placeholder', !!isPlaceholder);
    };

    const markSelected = (value) => {
      options.forEach(o => {
        o.classList.toggle('is-selected', o.dataset.value === value);
      });
    };

    const open = () => {
      closeAllSelects(root);
      root.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    };

    const close = () => {
      root.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    };

    // Инициализация из текущего значения <select> (восстановление при сбросе формы)
    const syncFromSelect = () => {
      const opt = select.options[select.selectedIndex];
      if (!opt || !opt.value) {
        setLabel(select.options[0] ? select.options[0].textContent : '', true);
        markSelected('');
        select.value = '';
        if (hidden) hidden.value = '';
      } else {
        setLabel(opt.textContent, false);
        markSelected(opt.value);
        if (hidden) hidden.value = opt.value;
      }
    };
    syncFromSelect();

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      if (root.classList.contains('open')) close();
      else open();
    });

    options.forEach(opt => {
      const choose = () => {
        const value = opt.dataset.value;
        select.value = value;
        if (hidden) hidden.value = value;
        // прокидываем change, чтобы ловили сторонние слушатели
        select.dispatchEvent(new Event('change', { bubbles: true }));
        setLabel(opt.querySelector('span').textContent, false);
        markSelected(value);
        close();
        trigger.focus();
      };
      opt.addEventListener('click', e => {
        e.stopPropagation();
        choose();
      });
      opt.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          choose();
        }
      });
    });

    // Закрытие по клику вне / Escape
    document.addEventListener('click', e => {
      if (!root.contains(e.target)) close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && root.classList.contains('open')) {
        close();
        trigger.focus();
      }
    });

    // Сброс значения при вызове form.reset() — стандартное событие 'reset' на <form>
    if (select.form) {
      select.form.addEventListener('reset', () => {
        // после reset значение select становится "", подтянем UI на следующий тик
        setTimeout(syncFromSelect, 0);
      });
    }
  };

  document.querySelectorAll('[data-select]').forEach(initSelect);
})();
