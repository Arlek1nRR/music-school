/* ==========================================================================
   ОБЩИЙ СКРИПТ — header, scroll-reveal, виджет, формы.
   Дизайн единый (тёмная liquid-glass тема), переключатель темы отключён.
   ========================================================================== */

(function () {
  'use strict';

  // ---------- ТЕМА (зафиксирована — тёмная liquid-glass) ----------
  // Раньше был light/dark переключатель. Сейчас дизайн-система единая,
  // тёмная. data-theme выставляем явно, чтобы CSS-токены в style.css
  // (которые завязаны на :root[data-theme="dark"]) применялись гарантированно.
  const root = document.documentElement;
  root.setAttribute('data-theme', 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#000000');

  // Theme toggle удалён — никаких .theme-toggle в HTML больше нет.

  // ---------- HEADER HEIGHT -> CSS-переменная ----------
  // Измеряем высоту .site-header (с top: 24px) и проставляем --header-h
  // на :root, чтобы .mobile-menu мог динамически позиционироваться
  // ниже шапки с зазором 8px. Без этого на iOS высота шапки плавает
  // (safe-area, font-scale) и меню "слипается" с шапкой.
  const siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    const updateHeaderH = () => {
      const h = siteHeader.getBoundingClientRect().height;
      // bottom - top даёт полную высоту блока (top: 24px уже учтён)
      root.style.setProperty('--header-h', Math.round(h) + 'px');
    };
    updateHeaderH();
    window.addEventListener('resize', updateHeaderH);
    window.addEventListener('orientationchange', updateHeaderH);
  }

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
  // Backdrop создаётся в JS (а не в HTML × 5 файлов), открывается/закрывается
  // синхронно с .mobile-menu. Body scroll lock через overflow:hidden.
  // A11y: aria-modal, focus-trap (Tab циклит по ссылкам), Esc для закрытия,
  // возврат фокуса на .menu-toggle.
  const toggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (toggle && mobileMenu) {
    let menuBackdrop = null;

    const ensureBackdrop = () => {
      if (!menuBackdrop) {
        menuBackdrop = document.createElement('div');
        menuBackdrop.className = 'menu-backdrop';
        menuBackdrop.setAttribute('aria-hidden', 'true');
        document.body.appendChild(menuBackdrop);
      }
      return menuBackdrop;
    };

    const setMenu = (open) => {
      mobileMenu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      ensureBackdrop().classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        mobileMenu.setAttribute('aria-modal', 'true');
        mobileMenu.setAttribute('role', 'dialog');
        const firstLink = mobileMenu.querySelector('a');
        if (firstLink) firstLink.focus();
      } else {
        mobileMenu.removeAttribute('aria-modal');
        mobileMenu.removeAttribute('role');
      }
    };

    toggle.addEventListener('click', () => {
      setMenu(!mobileMenu.classList.contains('open'));
    });

    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => setMenu(false));
    });

    // Закрытие по клику на backdrop
    document.addEventListener('click', e => {
      if (e.target === menuBackdrop && mobileMenu.classList.contains('open')) {
        setMenu(false);
        toggle.focus();
      }
    });

    // Esc — закрыть, вернуть фокус на бургер. Tab — focus-trap.
    document.addEventListener('keydown', e => {
      if (!mobileMenu.classList.contains('open')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setMenu(false);
        toggle.focus();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = mobileMenu.querySelectorAll('a, button');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
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
