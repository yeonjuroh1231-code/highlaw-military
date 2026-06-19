(function () {
  'use strict';

  /* ── Reduce motion check ── */
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Navbar scroll class + scroll-to-top button ── */
  const nav = document.getElementById('nav');
  const btnTop = document.getElementById('btn-top');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 48) { nav.classList.add('scrolled'); }
    else { nav.classList.remove('scrolled'); }
    if (btnTop) {
      btnTop.style.display = window.scrollY > 400 ? 'flex' : 'none';
    }
  }, { passive: true });

  /* ── IntersectionObserver: fade-up ── */
  var cinSelectors = '.fu, .cin-left, .cin-right, .cin-up, .cin-scale, .cin-blur, .cert-reveal, .num-cin, .hud-panel, .title-draw, .gl';
  var cinEls = document.querySelectorAll(cinSelectors);

  if (noMotion) {
    cinEls.forEach(function (el) { el.classList.add('vis'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('vis');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });
    cinEls.forEach(function (el) { io.observe(el); });
  }

  /* ── Price counter — countdown 8,800,000 → 390,000 ── */
  var counterDone = false;
  function runCounter(el, startVal, endVal, ms) {
    el.style.color = '#EF4444';
    var startTime = performance.now();
    function tick(now) {
      var p = Math.min((now - startTime) / ms, 1);
      /* ease-in-out: smooth deceleration near target */
      var ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var value = Math.round(startVal + (endVal - startVal) * ease);
      el.textContent = value.toLocaleString('ko-KR');
      /* 마지막 15%에서 빨강 → 골드로 전환 */
      if (p > 0.85) {
        var t = (p - 0.85) / 0.15;
        el.style.color = t > 0.9 ? '#B8CC2A' : '#EF4444';
      }
      if (p < 1) { requestAnimationFrame(tick); }
      else {
        el.textContent = endVal.toLocaleString('ko-KR');
        el.style.color = '#B8CC2A';
        el.classList.add('price-glitch');
        setTimeout(function () { el.classList.remove('price-glitch'); }, 600);
      }
    }
    requestAnimationFrame(tick);
  }

  /* ── Progress bars ── */
  var barsDone = false;
  function runBars() {
    var old = document.getElementById('bar-old');
    var nw  = document.getElementById('bar-new');
    var lbl = document.getElementById('bar-new-label');
    if (!old) return;
    setTimeout(function () {
      old.style.width = '100%';
      nw.style.width  = '10%';
      if (lbl) { lbl.style.opacity = '1'; }
    }, 200);
  }

  var priceEl = document.getElementById('price-counter');
  if (priceEl) {
    var po = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !counterDone) {
        counterDone = true;
        if (!noMotion) { runCounter(priceEl, 8800000, 390000, 2000); }
        else { priceEl.textContent = '390,000'; priceEl.style.color = '#B8CC2A'; }
      }
      if (entries[0].isIntersecting && !barsDone) {
        barsDone = true;
        if (!noMotion) { runBars(); }
        else {
          var old = document.getElementById('bar-old');
          var nw  = document.getElementById('bar-new');
          var lbl = document.getElementById('bar-new-label');
          if (old) { old.style.width = '100%'; nw.style.width = '10%'; }
          if (lbl) { lbl.style.opacity = '1'; }
        }
      }
    }, { threshold: 0.6, rootMargin: '0px 0px -80px 0px' });
    po.observe(priceEl);
  }
})();

/* ── 변호사 프로필 사진 포털 API 동기화 + 약력 모달 데이터 수집 ── */
var _lawyerApiData = {};  /* name → API 응답 객체 */

(function () {
  function applyFallbacks() {
    document.querySelectorAll('img[data-fallback]').forEach(function (img) {
      if (!img.src || img.src === window.location.href) {
        img.src = img.getAttribute('data-fallback');
      }
    });
  }

  fetch('/api/lawyers')
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (body) {
      if (!body || !Array.isArray(body.data)) { applyFallbacks(); return; }
      var found = {};
      body.data.forEach(function (lawyer) {
        if (!lawyer.name) return;
        /* 모달용 데이터 저장 */
        _lawyerApiData[lawyer.name] = lawyer;
        var imgs = document.querySelectorAll('img[data-lawyer-name="' + lawyer.name + '"]');
        imgs.forEach(function (img) {
          var url = lawyer.photoUrl || img.getAttribute('data-fallback');
          if (url) { img.src = url; found[lawyer.name] = true; }
        });
      });
      /* API에 없는 항목은 fallback 적용 */
      document.querySelectorAll('img[data-lawyer-name]').forEach(function (img) {
        var n = img.getAttribute('data-lawyer-name');
        if (!found[n] && (!img.src || img.src === window.location.href)) {
          var fb = img.getAttribute('data-fallback');
          if (fb) img.src = fb;
        }
      });
    })
    .catch(applyFallbacks);
})();

/* ── 변호사 약력 모달 ── */

/**
 * DB 포맷: [{period:"...", title:"...", detail:"..."}] 또는 줄바꿈 문자열
 * period/title 중 내용 있는 것만 합쳐 문자열 배열로 반환
 */
function _parseItems(val) {
  if (!val) return [];
  try {
    var p = JSON.parse(val);
    if (!Array.isArray(p)) return [String(val)].filter(Boolean);
    return p.map(function(item) {
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'object' && item !== null) {
        var parts = [item.period, item.title]
          .map(function(s) { return (s || '').trim(); })
          .filter(Boolean);
        return parts.join(' ');
      }
      return '';
    }).filter(Boolean);
  } catch (e) {
    return val.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
  }
}

function openLawyerModal(name) {
  var overlay = document.getElementById('lawyer-modal-overlay');
  var data = _lawyerApiData[name] || {};

  /* 사진: API sync 스크립트가 이미 img.src를 올바르게 세팅해 두었으므로 그것을 사용 */
  var photoEl = document.getElementById('modal-photo');
  var imgEl   = document.querySelector('img[data-lawyer-name="' + name + '"]');
  var photoUrl = (imgEl && imgEl.src && imgEl.src !== window.location.href)
    ? imgEl.src
    : (imgEl && imgEl.getAttribute('data-fallback')) || '';
  photoEl.src = photoUrl;
  photoEl.alt = name + ' 변호사';
  photoEl.style.display = photoUrl ? 'block' : 'none';

  /* 이름·직함 */
  document.getElementById('modal-name').textContent = name + ' ' + (data.title || '변호사');
  document.getElementById('modal-tagline').textContent = data.tagline || '';

  /* 학력 */
  var eduList = _parseItems(data.education);
  var eduSection = document.getElementById('modal-edu-section');
  var eduUl = document.getElementById('modal-edu-list');
  if (eduList.length) {
    eduUl.innerHTML = eduList.map(function(e) { return '<li>' + e + '</li>'; }).join('');
    eduSection.style.display = 'block';
  } else {
    eduSection.style.display = 'none';
  }

  /* 경력 */
  var careerList = _parseItems(data.career);
  var careerSection = document.getElementById('modal-career-section');
  var careerUl = document.getElementById('modal-career-list');
  if (careerList.length) {
    careerUl.innerHTML = careerList.map(function(c) { return '<li>' + c + '</li>'; }).join('');
    careerSection.style.display = 'block';
  } else {
    careerSection.style.display = 'none';
  }

  /* 전문 분야 */
  var specList = _parseItems(data.specialties);
  var specSec  = document.getElementById('modal-spec-section');
  if (specList.length) {
    document.getElementById('modal-spec-list').innerHTML = specList.map(function(i) { return '<li>' + i + '</li>'; }).join('');
    specSec.style.display = 'block';
  } else {
    specSec.style.display = 'none';
  }

  /* 자격 */
  var qualList = _parseItems(data.qualifications);
  var qualSec  = document.getElementById('modal-qual-section');
  if (qualList.length) {
    document.getElementById('modal-qual-list').innerHTML = qualList.map(function(i) { return '<li>' + i + '</li>'; }).join('');
    qualSec.style.display = 'block';
  } else {
    qualSec.style.display = 'none';
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('modal-close-btn').focus();
}

function closeLawyerModal() {
  document.getElementById('lawyer-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* 오버레이 클릭으로 닫기 */
document.getElementById('lawyer-modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeLawyerModal();
});

/* ESC 키로 닫기 */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeLawyerModal();
});
