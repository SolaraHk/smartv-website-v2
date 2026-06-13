(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  // Reveal styles are gated on this class so content stays visible
  // when this file fails to load.
  document.documentElement.classList.add('js');

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  const nav = $('#nav');
  const syncNav = () => nav?.classList.toggle('scrolled', window.scrollY > 20);
  syncNav();
  window.addEventListener('scroll', syncNav, { passive: true });

  const navToggle = $('#navToggle');
  const navMobile = $('#navMobile');
  if (navToggle && navMobile) {
    const closeMenu = () => {
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', '開啟選單');
      navMobile.classList.remove('open');
    };

    navToggle.addEventListener('click', () => {
      const open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      navToggle.setAttribute('aria-label', open ? '開啟選單' : '關閉選單');
      navMobile.classList.toggle('open', !open);
    });

    $$('#navMobile a').forEach((link) => link.addEventListener('click', closeMenu));
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  const waForm = $('#waForm');
  if (waForm) {
    waForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!waForm.reportValidity()) return;
      const grade = $('#waGrade')?.value || '未填寫';
      const course = $('#waCourse')?.value || '未填寫';
      const branchSelect = $('#waBranch');
      const phone = branchSelect?.value || '85251133667';
      const branchName = branchSelect?.selectedOptions?.[0]?.textContent?.trim() || '天后分校';
      const message = [
        `你好，我想查詢 Smart V「${course}」課程詳情及試堂。`,
        `孩子年級：${grade}`,
        `想查詢分校：${branchName}`,
        '可否提供課程時間、收費及名額？謝謝！'
      ].join('\n');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    });
  }

  const waFab = $('#waFab');
  const syncFab = () => waFab?.classList.toggle('show', window.scrollY > 480);
  if (waFab) {
    syncFab();
    window.addEventListener('scroll', syncFab, { passive: true });
  }

  // Ruler progress bar: mirrors reading position under the docked nav.
  const ruler = $('#navRuler');
  if (ruler) {
    let rulerQueued = false;
    const syncRuler = () => {
      rulerQueued = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      ruler.style.transform = `scaleX(${ratio})`;
    };
    syncRuler();
    window.addEventListener('scroll', () => {
      if (!rulerQueued) {
        rulerQueued = true;
        requestAnimationFrame(syncRuler);
      }
    }, { passive: true });
    window.addEventListener('resize', syncRuler);
  }

  // Poster lightbox: a swipeable/scrollable gallery so parents can read
  // the results full-size. On touch you swipe (no tap-spamming buttons);
  // on desktop the arrows scroll the track. Tapping empty space closes.
  const lightbox = $('#lightbox');
  const zoomables = $$('.zoomable');
  if (lightbox && zoomables.length) {
    const track = $('#lightboxTrack');
    const lbCap = $('#lightboxCap');
    const lbClose = $('.lightbox__close', lightbox);
    const lbPrev = $('.lightbox__nav--prev', lightbox);
    const lbNext = $('.lightbox__nav--next', lightbox);
    let group = [];
    let lastFocus = null;

    const captionFor = (trigger) => {
      const img = $('img', trigger);
      const cap = trigger.closest('figure')?.querySelector('figcaption');
      if (!cap) return img ? img.alt : '';
      const parts = Array.from(cap.children).map((el) => el.textContent.trim()).filter(Boolean);
      return parts.length ? parts.join('｜') : cap.textContent.trim();
    };

    const currentIndex = () => {
      const w = track.clientWidth || 1;
      return Math.max(0, Math.min(group.length - 1, Math.round(track.scrollLeft / w)));
    };
    const syncCap = () => { if (group.length) lbCap.textContent = captionFor(group[currentIndex()]); };

    const open = (trigger) => {
      const gallery = trigger.dataset.gallery;
      group = gallery ? zoomables.filter((z) => z.dataset.gallery === gallery) : [trigger];
      const index = Math.max(0, group.indexOf(trigger));
      track.innerHTML = '';
      group.forEach((z) => {
        const source = $('img', z);
        const slide = document.createElement('div');
        slide.className = 'lightbox__slide';
        const big = document.createElement('img');
        big.src = source.currentSrc || source.src;
        big.alt = source.alt;
        big.draggable = false;
        slide.appendChild(big);
        track.appendChild(slide);
      });
      lastFocus = document.activeElement;
      lbPrev.hidden = group.length < 2;
      lbNext.hidden = group.length < 2;
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      track.scrollLeft = index * track.clientWidth; // jump to clicked poster, no animation
      syncCap();
      lbClose.focus();
    };

    const close = () => {
      lightbox.hidden = true;
      track.innerHTML = '';
      document.body.style.overflow = '';
      if (lastFocus?.focus) lastFocus.focus();
    };

    const step = (delta) => track.scrollBy({ left: delta * track.clientWidth, behavior: 'smooth' });

    let capQueued = false;
    track.addEventListener('scroll', () => {
      if (capQueued) return;
      capQueued = true;
      requestAnimationFrame(() => { capQueued = false; syncCap(); });
    }, { passive: true });

    zoomables.forEach((z) => z.addEventListener('click', () => open(z)));
    lbClose.addEventListener('click', close);
    lbPrev.addEventListener('click', () => step(-1));
    lbNext.addEventListener('click', () => step(1));
    // close only when tapping empty space (not the image) — avoids accidental actions
    lightbox.addEventListener('click', (event) => {
      const t = event.target;
      if (t === lightbox || t === track || t.classList.contains('lightbox__slide')) close();
    });
    window.addEventListener('keydown', (event) => {
      if (lightbox.hidden) return;
      if (event.key === 'Escape') close();
      else if (event.key === 'ArrowLeft' && group.length > 1) step(-1);
      else if (event.key === 'ArrowRight' && group.length > 1) step(1);
      else if (event.key === 'Tab') {
        const focusables = [lbClose, lbPrev, lbNext].filter((b) => !b.hidden);
        const current = focusables.indexOf(document.activeElement);
        event.preventDefault();
        const next = event.shiftKey
          ? (current <= 0 ? focusables.length - 1 : current - 1)
          : (current + 1) % focusables.length;
        focusables[next].focus();
      }
    });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Full-screen hero video: keep the poster visible if playback fails,
  // and stay on the poster frame when the visitor prefers reduced motion.
  const heroMotion = $('#heroMotion');
  if (heroMotion) {
    const fallBack = () => heroMotion.classList.add('hero__motion--off');
    heroMotion.addEventListener('error', fallBack, true);
    heroMotion.querySelector('source')?.addEventListener('error', fallBack);
    const saveData = navigator.connection && navigator.connection.saveData;
    if (saveData) {
      // visitor enabled data-saver: stay on the poster, stop buffering the video
      heroMotion.removeAttribute('autoplay');
      $$('source', heroMotion).forEach((source) => source.removeAttribute('src'));
      heroMotion.load();
    } else if (reducedMotion) {
      heroMotion.removeAttribute('autoplay');
      heroMotion.pause();
    } else {
      heroMotion.play().catch(() => {});
    }
  }

  // Scroll reveals: IntersectionObserver adds .in; transforms and
  // opacity only, fully skipped under reduced motion.
  const revealTargets = $$('[data-reveal], [data-reveal-item]');
  const heroTargets = $$('[data-hero], [data-hero-art]');

  const showAll = () => {
    [...revealTargets, ...heroTargets].forEach((el) => el.classList.add('in'));
  };

  if (reducedMotion || !('IntersectionObserver' in window)) {
    showAll();
    return;
  }

  heroTargets.forEach((el, index) => {
    setTimeout(() => el.classList.add('in'), 120 + index * 110);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.hasAttribute('data-reveal-item')) {
        const siblings = $$('[data-reveal-item]', el.parentElement);
        siblings.forEach((item, index) => {
          setTimeout(() => item.classList.add('in'), index * 90);
        });
        siblings.forEach((item) => observer.unobserve(item));
      } else {
        el.classList.add('in');
        observer.unobserve(el);
      }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  revealTargets.forEach((el) => observer.observe(el));
})();
