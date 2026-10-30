/* Cheonan Wellness 2026 - static, dependency-free presentation */
(() => {
  'use strict';
  const deck = document.getElementById('deck');
  const slides = [...document.querySelectorAll('.slide')];
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const count = document.getElementById('current-number');
  const progress = document.getElementById('progress-fill');
  const prev = document.getElementById('prev-slide');
  const next = document.getElementById('next-slide');
  const original = document.querySelector('.original-toggle');
  const fullscreen = document.querySelector('.fullscreen-toggle');
  const hint = document.getElementById('keyboard-hint');
  const dialog = document.getElementById('detail-dialog');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogText = document.getElementById('dialog-text');
  const announcer = document.getElementById('announcer');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = -1;
  let rafPending = false;
  const countAnimated = new WeakSet();

  function animateNumber(element) {
    if (countAnimated.has(element)) return;
    countAnimated.add(element);
    const target = Number(element.dataset.count);
    const decimals = Number(element.dataset.decimals || 0);
    const formatter = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (reduceMotion.matches) { element.textContent = formatter.format(target); return; }
    const start = performance.now();
    const duration = target > 10 ? 1250 : 850;
    function tick(time) {
      const t = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      element.textContent = formatter.format(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else element.textContent = formatter.format(target);
    }
    requestAnimationFrame(tick);
  }

  function setActive(nextIndex) {
    const nextValue = Math.min(Math.max(nextIndex, 0), slides.length - 1);
    if (index === nextValue) return;
    index = nextValue;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle('is-active', active);
      if (active) slide.querySelectorAll('.counter').forEach(animateNumber);
    });
    navLinks.forEach((link, i) => {
      const active = i === index;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const activeLink = navLinks[index];
    if (activeLink) activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    count.textContent = String(index + 1).padStart(2, '0');
    progress.style.width = `${((index + 1) / slides.length) * 100}%`;
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    announcer.textContent = `${index + 1} / ${slides.length} : ${slides[index].dataset.title}`;
    if (window.location.hash !== `#slide-${index + 1}`) {
      history.replaceState(null, '', `#slide-${index + 1}`);
    }
  }

  function detectCurrent() {
    rafPending = false;
    const bounds = deck.getBoundingClientRect();
    let visibleWinner = 0;
    let mostVisible = -1;
    for (let i = 0; i < slides.length; i++) {
      const rect = slides[i].getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top));
      if (visible > mostVisible) { mostVisible = visible; visibleWinner = i; }
    }
    setActive(visibleWinner);
  }

  function goTo(i, smooth = true) {
    const clamped = Math.min(Math.max(i, 0), slides.length - 1);
    setActive(clamped);
    slides[clamped].scrollIntoView({ behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto', block: 'start' });
  }

  prev.addEventListener('click', () => goTo(index - 1));
  next.addEventListener('click', () => goTo(index + 1));
  navLinks.forEach((link, i) => link.addEventListener('click', (event) => { event.preventDefault(); goTo(i); }));
  document.querySelector('.brand').addEventListener('click', (event) => { event.preventDefault(); goTo(0); });
  deck.addEventListener('scroll', () => {
    if (!rafPending) { rafPending = true; requestAnimationFrame(detectCurrent); }
    hint?.classList.add('hidden');
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (dialog.open) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    let target = null;
    if (event.key === 'ArrowDown' || event.key === 'PageDown') target = index + 1;
    if (event.key === 'ArrowUp' || event.key === 'PageUp') target = index - 1;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = slides.length - 1;
    if (event.code === 'Space' && el?.tagName !== 'BUTTON' && el?.tagName !== 'A') target = index + (event.shiftKey ? -1 : 1);
    if (target !== null) { event.preventDefault(); goTo(target); hint?.classList.add('hidden'); }
  });

  original.addEventListener('click', () => {
    const enabled = document.body.classList.toggle('original-mode');
    original.setAttribute('aria-pressed', String(enabled));
    original.setAttribute('title', enabled ? '인터랙티브 웹 화면으로 돌아가기' : '원본 슬라이드 이미지 보기');
    original.setAttribute('aria-label', enabled ? '인터랙티브 웹 화면으로 돌아가기' : '원본 슬라이드 이미지 보기');
    original.querySelector('span').textContent = enabled ? '웹 보기' : '원본';
    // The mobile original mode uses a different section height.
    requestAnimationFrame(() => goTo(index, false));
  });

  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      // Browsers may disallow fullscreen inside an embedded preview.
      fullscreen.title = '현재 환경에서는 전체 화면을 사용할 수 없습니다';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.setAttribute('aria-label', document.fullscreenElement ? '전체 화면 종료' : '전체 화면 전환');
    fullscreen.title = document.fullscreenElement ? '전체 화면 종료' : '전체 화면 전환';
  });

  document.querySelectorAll('[data-detail-title]').forEach(card => {
    card.addEventListener('click', () => {
      dialogTitle.textContent = card.dataset.detailTitle || '';
      dialogText.textContent = (card.dataset.detailText || '').replaceAll(' | ', '\n');
      dialog.showModal();
    });
  });
  document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
  document.getElementById('dialog-done').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

  function targetFromHash() {
    const match = window.location.hash.match(/^#slide-(\d+)$/);
    if (!match) return 0;
    return Math.min(Math.max(Number(match[1]) - 1, 0), slides.length - 1);
  }
  window.addEventListener('hashchange', () => goTo(targetFromHash()));
  window.addEventListener('resize', () => { requestAnimationFrame(detectCurrent); });
  // Make deep links work on GitHub Pages and local file:// URLs.
  requestAnimationFrame(() => goTo(targetFromHash(), false));
})();
