(function () {
  const plans = window.__PLANS__ || [];
  const DATE_KEY = 'valentines_date_filter';
  const UTM_KEY = 'valentines_utm_params';
  const CONSENT_KEY = 'cookie_consent';
  const GA_ID = 'G-6G4HKV9NV7';
  const DEFAULT_START = '2027-02-07';
  const DEFAULT_END = '2027-02-15';

  let priceFilter = { all: true, min: 0, max: Infinity };
  let dateFilter = { start: DEFAULT_START, end: DEFAULT_END, all: false };

  function readStoredUtm() {
    try {
      return JSON.parse(localStorage.getItem(UTM_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  try {
    const params = new URLSearchParams(location.search);
    const keep = { ...readStoredUtm() };
    ['utm_source', 'utm_medium', 'utm_content'].forEach((k) => {
      if (params.get(k)) keep[k] = params.get(k);
    });
    if (Object.keys(keep).length) localStorage.setItem(UTM_KEY, JSON.stringify(keep));
  } catch (_) {}

  function applyUtmToPlanLinks() {
    const stored = readStoredUtm();
    if (!stored.utm_source && !stored.utm_medium && !stored.utm_content) return;
    document.querySelectorAll('a[href*="feverup.com"][data-plan-id]').forEach((a) => {
      try {
        const url = new URL(a.href);
        if (stored.utm_source) url.searchParams.set('utm_source', stored.utm_source);
        if (stored.utm_medium) url.searchParams.set('utm_medium', stored.utm_medium);
        if (stored.utm_content) url.searchParams.set('utm_content', stored.utm_content);
        a.href = url.toString();
      } catch (_) {}
    });
  }
  applyUtmToPlanLinks();

  try {
    const saved = localStorage.getItem(DATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.start && parsed.end) {
        dateFilter = { start: parsed.start, end: parsed.end, all: false };
      }
    }
  } catch (_) {}

  const langSelect = document.querySelector('[data-lang-select]');
  if (langSelect) {
    langSelect.addEventListener('change', () => {
      if (langSelect.value) location.href = langSelect.value;
    });
  }
  const citySelect = document.querySelector('[data-city-select]');
  if (citySelect) {
    citySelect.addEventListener('change', () => {
      if (citySelect.value) location.href = citySelect.value;
    });
  }

  const searchForm = document.querySelector('[data-city-search]');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = searchForm.querySelector('input');
      const q = ((input && input.value) || '').trim().toLowerCase();
      const opts = [...document.querySelectorAll('#city-list option')];
      const hit =
        opts.find((o) => o.value.toLowerCase() === q) ||
        opts.find((o) => o.value.toLowerCase().includes(q));
      if (hit) {
        const cities = window.__CITIES__ || (plans[0] && plans[0].url ? plans : []);
        const match = cities.find(
          (c) => c.name && c.name.toLowerCase() === hit.value.toLowerCase()
        );
        if (match) location.href = match.url;
        else {
          const slug = hit.value.toLowerCase().replace(/\s+/g, '-');
          const locale = location.pathname.split('/')[1] || 'en';
          location.href = `/${locale}/${slug}/`;
        }
      }
    });
  }

  function inDateRange(isoDates) {
    if (dateFilter.all) return true;
    if (!isoDates || !isoDates.length) return true;
    const start = dateFilter.start;
    const end = dateFilter.end;
    return isoDates.some((d) => d >= start && d <= end);
  }

  function applyFilters() {
    document.querySelectorAll('[data-plan-id]').forEach((el) => {
      const id = el.getAttribute('data-plan-id');
      const plan = plans.find((p) => String(p.id) === String(id));
      if (!plan) return;
      let ok = true;
      if (!priceFilter.all) {
        const v = Number(plan.priceValue) || 0;
        if (v > 0) {
          if (priceFilter.max === Infinity) ok = v >= priceFilter.min;
          else ok = v >= priceFilter.min && v < priceFilter.max;
        }
      }
      if (ok && !inDateRange(plan.eventDatesIso || [])) ok = false;
      el.classList.toggle('is-hidden', !ok);
    });
  }

  function syncDateChips() {
    const row = document.querySelector('[data-date-filter]');
    if (!row) return;
    row.querySelectorAll('.chip').forEach((c) => {
      const preset = c.getAttribute('data-date-preset');
      const active =
        (preset === 'all' && dateFilter.all) ||
        (preset === 'peak' && !dateFilter.all);
      c.classList.toggle('is-active', active);
    });
  }

  const priceRow = document.querySelector('[data-price-filters]');
  if (priceRow) {
    priceRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn || !priceRow.contains(btn)) return;
      priceRow.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (btn.getAttribute('data-price') === 'all') {
        priceFilter = { all: true, min: 0, max: Infinity };
      } else {
        const min = Number(btn.getAttribute('data-price-min') || 0);
        const maxRaw = btn.getAttribute('data-price-max');
        const max = maxRaw === 'Infinity' ? Infinity : Number(maxRaw);
        priceFilter = { all: false, min, max };
      }
      applyFilters();
    });
  }

  const dateRow = document.querySelector('[data-date-filter]');
  if (dateRow) {
    dateRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn || !dateRow.contains(btn)) return;
      const preset = btn.getAttribute('data-date-preset');
      if (preset === 'all') {
        dateFilter = { start: DEFAULT_START, end: DEFAULT_END, all: true };
        try {
          localStorage.removeItem(DATE_KEY);
        } catch (_) {}
      } else {
        dateFilter = { start: DEFAULT_START, end: DEFAULT_END, all: false };
        try {
          localStorage.setItem(
            DATE_KEY,
            JSON.stringify({ start: DEFAULT_START, end: DEFAULT_END })
          );
        } catch (_) {}
      }
      syncDateChips();
      applyFilters();
    });
    syncDateChips();
  }

  // Sticky category scroll offset + spy
  document.querySelectorAll('.cat-bar a.chip[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top, behavior: 'smooth' });
      history.replaceState(null, '', `#${id}`);
    });
  });

  function loadGa() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
  }

  const banner = document.querySelector('[data-cookie-banner]');
  const accept = document.querySelector('[data-cookie-accept]');
  const reject = document.querySelector('[data-cookie-reject]');
  try {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent && banner) banner.classList.add('is-visible');
    if (consent === 'accept') loadGa();
  } catch (_) {}
  if (accept)
    accept.addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, 'accept');
      if (banner) banner.classList.remove('is-visible');
      loadGa();
    });
  if (reject)
    reject.addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, 'reject');
      if (banner) banner.classList.remove('is-visible');
    });

  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[data-plan-id]');
    if (!a || !window.gtag) return;
    const planId = a.getAttribute('data-plan-id');
    if (!planId) return;
    try {
      window.gtag('event', 'select_plan', {
        plan_id: planId,
        link_url: a.href,
      });
    } catch (_) {}
  });

  applyFilters();
})();
