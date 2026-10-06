/* ============================================================
   BIA — Brilliance in Apparel · homepage interactions
   1. Cinematic hero: red thread draws across the mill imagery
      over ~8.4s with staged microcopy and a skip control.
   2. Scroll: reveal-on-scroll + scroll-drawn journey thread.
   3. Make Your Fabric: brief builder -> POST /api/fabric-brief
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 1. HERO THREAD SEQUENCE ---------------- */
  var HERO = [
    { t: 0.4, copy: 'It begins with a single thread.' },
    { t: 2.4, copy: 'Engineered with precision.' },
    { t: 4.4, copy: 'Fabric engineered for performance.' },
    { t: 6.4, copy: 'From possibility to performance.' }
  ];
  var FINAL_T = 8.4;

  var path = document.getElementById('heroThreadPath');
  var micro = document.getElementById('heroMicro');
  var copyBox = document.getElementById('heroCopy');
  var skipBtn = document.getElementById('heroSkip');

  if (path && micro && copyBox) {
    var len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;

    var done = false;
    var start = null;
    var stageIdx = -1;

    function renderFinal() {
      done = true;
      path.style.strokeDashoffset = 0;
      if (skipBtn) skipBtn.style.display = 'none';
      copyBox.innerHTML =
        '<div class="hero-final">' +
          '<h1>BRILLIANCE,<br>WOVEN IN.</h1>' +
          '<p class="hero-sub">From yarn to innovation.<br>From fabric to fashion.<br>From Jordan to the world.</p>' +
          '<div class="hero-ctas">' +
            '<a href="#thread" class="btn btn-red">Explore BIA <span class="arrow">→</span></a>' +
            '<a href="#develop" class="btn btn-ghost">Develop with us <span class="arrow">→</span></a>' +
          '</div>' +
        '</div>';
    }

    function frame(now) {
      if (done) return;
      if (start === null) start = now;
      var s = (now - start) / 1000;
      var p = Math.min(s / FINAL_T, 1);
      // ease the draw slightly so the thread accelerates naturally
      var eased = 1 - Math.pow(1 - p, 1.6);
      path.style.strokeDashoffset = len * (1 - eased);

      var idx = -1;
      for (var i = 0; i < HERO.length; i++) { if (s >= HERO[i].t) idx = i; }
      if (idx !== stageIdx && idx >= 0) {
        stageIdx = idx;
        micro.classList.remove('out');
        micro.classList.add('out');
        (function (text) {
          setTimeout(function () {
            if (done) return;
            micro.textContent = text;
            micro.classList.remove('out');
          }, 250);
        })(HERO[idx].copy);
      }

      if (s >= FINAL_T) { renderFinal(); return; }
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    if (skipBtn) skipBtn.addEventListener('click', renderFinal);
  }

  /* ---------------- 2. SCROLL EFFECTS ---------------- */
  // reveal-on-scroll
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  // stat count-up
  var counted = new WeakSet();
  var ioStats = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting || counted.has(e.target)) return;
      counted.add(e.target);
      var target = +e.target.getAttribute('data-count');
      var suffix = e.target.getAttribute('data-suffix') || '';
      var t0 = null;
      function tick(now) {
        if (!t0) t0 = now;
        var p = Math.min((now - t0) / 1400, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = Math.round(target * eased);
        e.target.textContent = (val >= 1000 ? val.toLocaleString() : val) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.stat-n[data-count]').forEach(function (el) { ioStats.observe(el); });

  // journey thread draw on scroll
  var jPath = document.getElementById('journeyThreadPath');
  var jBody = document.getElementById('journeyBody');
  if (jPath && jBody) {
    var jLen = jPath.getTotalLength();
    jPath.style.strokeDasharray = jLen;
    jPath.style.strokeDashoffset = jLen;
    var ticking = false;
    function drawJourney() {
      ticking = false;
      var rect = jBody.getBoundingClientRect();
      var vh = window.innerHeight;
      var start = vh * 0.75;
      var total = rect.height * 0.85;
      var p = Math.min(Math.max((start - rect.top) / total, 0), 1);
      jPath.style.strokeDashoffset = jLen * (1 - p);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(drawJourney); }
    }, { passive: true });
    drawJourney();
  }

  /* ---------------- 3. MAKE YOUR FABRIC ---------------- */
  var PHRASE = { Cool: 'cools', Wick: 'wicks', Stretch: 'stretches', Protect: 'protects', Insulate: 'insulates' };
  var pick = { feel: null, does: null, use: null };
  var briefFeel = document.getElementById('briefFeel');
  var briefDoes = document.getElementById('briefDoes');
  var briefUse = document.getElementById('briefUse');
  var briefSubmit = document.getElementById('briefSubmit');
  var briefDraft = document.getElementById('briefDraft');
  var briefSent = document.getElementById('briefSent');
  var briefRef = document.getElementById('briefRef');

  function refreshBrief() {
    if (!briefSubmit) return;
    briefFeel.textContent = pick.feel ? pick.feel.toLowerCase() : '——';
    briefDoes.textContent = pick.does ? PHRASE[pick.does] : '——';
    briefUse.textContent = pick.use ? pick.use.toLowerCase() : '——';
    var ready = pick.feel && pick.does && pick.use;
    briefSubmit.classList.toggle('off', !ready);
  }

  function fillContactAndScroll(topic, message) {
    var contactSec = document.getElementById('contact');
    var contactMsg = document.getElementById('contactMessage');
    var contactName = document.getElementById('contactName');
    var topicInp = document.getElementById('enquiryTopic');
    var allTopicChips = document.querySelectorAll('.topic-chip');
    var cForm = document.getElementById('contactForm');
    var cSucc = document.getElementById('contactSuccess');

    // Reset success view if open
    if (cSucc && cForm && !cSucc.hidden) {
      cSucc.hidden = true;
      cForm.hidden = false;
    }

    // Set topic chip
    if (topic && topicInp) {
      topicInp.value = topic;
      allTopicChips.forEach(function (c) {
        c.classList.toggle('on', c.getAttribute('data-topic') === topic);
      });
    }

    // Populate message
    if (contactMsg && message) {
      contactMsg.value = message;
      // Trigger a subtle highlight flash to draw user's eye
      contactMsg.classList.remove('field-highlight');
      void contactMsg.offsetWidth; // trigger reflow
      contactMsg.classList.add('field-highlight');
    }

    // Scroll to contact section
    if (contactSec) {
      contactSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Focus on the name input
    setTimeout(function () {
      if (contactName) {
        contactName.focus();
      }
    }, 600);
  }

  document.querySelectorAll('.maker-group').forEach(function (group) {
    var key = group.getAttribute('data-group');
    group.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        group.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('on'); });
        chip.classList.add('on');
        pick[key] = chip.getAttribute('data-value');
        if (briefSent) { briefSent.hidden = true; briefDraft.hidden = false; }
        refreshBrief();
      });
    });
  });

  if (briefSubmit) {
    briefSubmit.addEventListener('click', function () {
      if (!(pick.feel && pick.does && pick.use)) return;

      var doesPhrase = PHRASE[pick.does] || pick.does.toLowerCase();
      var briefText = "Custom Fabric Development Brief:\n" +
        "• Target Hand-Feel: " + pick.feel + "\n" +
        "• Performance Property: " + pick.does + " (" + doesPhrase + ")\n" +
        "• Intended Application: " + pick.use + "\n\n" +
        "Engineering Specification:\n" +
        "A " + pick.feel.toLowerCase() + " fabric that " + doesPhrase + ", engineered for " + pick.use.toLowerCase() + ".\n" +
        "Specs: GSM to spec · Composition engineered · Swatch on request.";

      // Smoothly redirect / scroll to contact form with all data auto-filled
      fillContactAndScroll('fabric', briefText);
    });
  }

  /* ---------------- 4. BRAND FILM & CHAPTER SYNC ---------------- */
  var filmVideo = document.getElementById('biaFilmVideo');
  var filmWrapper = document.getElementById('filmVideoWrapper');
  var filmPlayBtn = document.getElementById('filmPlayBtn');
  var filmCenterPlay = document.getElementById('filmCenterPlay');
  var filmMuteBtn = document.getElementById('filmMuteBtn');
  var filmFsBtn = document.getElementById('filmFsBtn');
  var filmScrubContainer = document.getElementById('filmScrubContainer');
  var filmScrubFill = document.getElementById('filmScrubFill');
  var filmCurrentTime = document.getElementById('filmCurrentTime');
  var filmDuration = document.getElementById('filmDuration');
  var chapterCards = document.querySelectorAll('.chapter-card');

  if (filmVideo) {
    var iconPlay = filmPlayBtn ? filmPlayBtn.querySelector('.icon-play') : null;
    var iconPause = filmPlayBtn ? filmPlayBtn.querySelector('.icon-pause') : null;
    var iconMuted = filmMuteBtn ? filmMuteBtn.querySelector('.icon-muted') : null;
    var iconUnmuted = filmMuteBtn ? filmMuteBtn.querySelector('.icon-unmuted') : null;

    function formatTime(sec) {
      if (isNaN(sec) || sec < 0) return '0:00';
      var m = Math.floor(sec / 60);
      var s = Math.floor(sec % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function updatePlayState() {
      var isPaused = filmVideo.paused;
      if (filmWrapper) filmWrapper.classList.toggle('is-paused', isPaused);
      if (iconPlay && iconPause) {
        iconPlay.style.display = isPaused ? 'block' : 'none';
        iconPause.style.display = isPaused ? 'none' : 'block';
      }
    }

    function togglePlay() {
      if (filmVideo.paused) {
        filmVideo.play();
      } else {
        filmVideo.pause();
      }
      updatePlayState();
    }

    function toggleMute() {
      filmVideo.muted = !filmVideo.muted;
      if (iconMuted && iconUnmuted) {
        iconMuted.style.display = filmVideo.muted ? 'block' : 'none';
        iconUnmuted.style.display = filmVideo.muted ? 'none' : 'block';
      }
    }

    if (filmPlayBtn) filmPlayBtn.addEventListener('click', togglePlay);
    if (filmCenterPlay) filmCenterPlay.addEventListener('click', togglePlay);
    if (filmVideo) filmVideo.addEventListener('click', togglePlay);
    if (filmMuteBtn) filmMuteBtn.addEventListener('click', toggleMute);

    filmVideo.addEventListener('play', updatePlayState);
    filmVideo.addEventListener('pause', updatePlayState);

    // Duration setup
    filmVideo.addEventListener('loadedmetadata', function () {
      if (filmDuration) filmDuration.textContent = formatTime(filmVideo.duration);
    });

    // Time update & chapter sync
    filmVideo.addEventListener('timeupdate', function () {
      var cur = filmVideo.currentTime;
      var dur = filmVideo.duration || 30;

      if (filmCurrentTime) filmCurrentTime.textContent = formatTime(cur);
      if (filmScrubFill) {
        var pct = Math.min((cur / dur) * 100, 100);
        filmScrubFill.style.width = pct + '%';
      }

      // Sync active chapter on the left
      chapterCards.forEach(function (card) {
        var start = parseFloat(card.getAttribute('data-start'));
        var end = parseFloat(card.getAttribute('data-end'));
        var bar = card.querySelector('.chapter-bar');

        if (cur >= start && cur < end) {
          card.classList.add('active');
          if (bar) {
            var progress = ((cur - start) / (end - start)) * 100;
            bar.style.width = Math.min(Math.max(progress, 0), 100) + '%';
          }
        } else {
          card.classList.remove('active');
          if (bar) {
            bar.style.width = cur >= end ? '100%' : '0%';
          }
        }
      });
    });

    // Seek on scrubber click
    if (filmScrubContainer) {
      filmScrubContainer.addEventListener('click', function (e) {
        var rect = filmScrubContainer.getBoundingClientRect();
        var clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        var ratio = clickX / rect.width;
        var dur = filmVideo.duration || 30;
        filmVideo.currentTime = ratio * dur;
        if (filmVideo.paused) filmVideo.play();
      });
    }

    // Seek on chapter card click
    chapterCards.forEach(function (card) {
      function seekToChapter() {
        var start = parseFloat(card.getAttribute('data-start'));
        filmVideo.currentTime = start;
        if (filmVideo.paused) filmVideo.play();
        updatePlayState();
      }
      card.addEventListener('click', seekToChapter);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          seekToChapter();
        }
      });
    });

    // Fullscreen toggle
    if (filmFsBtn) {
      filmFsBtn.addEventListener('click', function () {
        var container = filmWrapper || filmVideo;
        if (!document.fullscreenElement) {
          if (container.requestFullscreen) container.requestFullscreen();
          else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
      });
    }

    // Auto play when scrolled into view, pause when out of view
    var filmObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          filmVideo.play().catch(function () {});
        } else {
          filmVideo.pause();
        }
        updatePlayState();
      });
    }, { threshold: 0.35 });

    var filmSection = document.getElementById('film');
    if (filmSection) filmObserver.observe(filmSection);

    // Initial state
    updatePlayState();
  }

  /* ---------------- 5. NAV SCROLL SPY ---------------- */
  var navLinks = document.querySelectorAll('.nav-links a');
  var sections = document.querySelectorAll('section[id], header[id]');
  
  function updateNavSpy() {
    var scrollPos = window.scrollY + 140;
    sections.forEach(function (sec) {
      var top = sec.offsetTop;
      var height = sec.offsetHeight;
      var id = sec.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(function (link) {
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }
  /* ---------------- 6. MATERIAL LIBRARY (TABS, FILTER, SEARCH & MODAL) ---------------- */
  var tabLibraryBtn = document.getElementById('tabLibraryBtn');
  var tabMakerBtn = document.getElementById('tabMakerBtn');
  var matPanelLibrary = document.getElementById('matPanelLibrary');
  var matPanelMaker = document.getElementById('matPanelMaker');
  var matSwitchToMakerBtn = document.getElementById('matSwitchToMakerBtn');
  var matModalDevelopBtn = document.getElementById('matModalDevelopBtn');

  function switchMatTab(target, scroll) {
    if (target === 'maker') {
      if (tabMakerBtn) tabMakerBtn.classList.add('active');
      if (tabLibraryBtn) tabLibraryBtn.classList.remove('active');
      if (matPanelMaker) matPanelMaker.classList.add('active');
      if (matPanelLibrary) matPanelLibrary.classList.remove('active');
    } else {
      if (tabLibraryBtn) tabLibraryBtn.classList.add('active');
      if (tabMakerBtn) tabMakerBtn.classList.remove('active');
      if (matPanelLibrary) matPanelLibrary.classList.add('active');
      if (matPanelMaker) matPanelMaker.classList.remove('active');
    }
    if (scroll) {
      var fabricsSec = document.getElementById('fabrics');
      if (fabricsSec) {
        var navHeight = 72;
        var targetY = fabricsSec.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    }
  }
  window.switchMatTab = switchMatTab;

  if (tabLibraryBtn) {
    tabLibraryBtn.addEventListener('click', function (e) {
      e.preventDefault();
      switchMatTab('library', false);
    });
  }

  if (tabMakerBtn) {
    tabMakerBtn.addEventListener('click', function (e) {
      e.preventDefault();
      switchMatTab('maker', false);
    });
  }

  if (matSwitchToMakerBtn) {
    matSwitchToMakerBtn.addEventListener('click', function (e) {
      e.preventDefault();
      switchMatTab('maker', true);
    });
  }

  if (matModalDevelopBtn) {
    matModalDevelopBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closeMatModal();
      switchMatTab('maker', true);
    });
  }

  // Intercept any href="#develop" or href="#fabrics" links
  document.querySelectorAll('a[href="#develop"], a[href="#fabrics"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (link.classList.contains('nav-cta') || link.getAttribute('href') === '#develop') {
        e.preventDefault();
        switchMatTab('maker', true);
      }
    });
  });

  var matFilterPills = document.querySelectorAll('.mat-filter-pill');
  var matSearchInput = document.getElementById('matSearchInput');
  var matCards = document.querySelectorAll('.mat-card');
  var matCountDisplay = document.getElementById('matCountDisplay');

  var currentFilter = 'all';
  var currentSearch = '';

  function filterMaterials() {
    var visibleCount = 0;
    var searchLower = currentSearch.toLowerCase().trim();

    matCards.forEach(function (card) {
      var tags = (card.getAttribute('data-tags') || '').toLowerCase();
      var name = (card.getAttribute('data-name') || '').toLowerCase();
      var code = (card.getAttribute('data-code') || '').toLowerCase();
      var cat = (card.getAttribute('data-cat') || '').toLowerCase();

      var matchesFilter = (currentFilter === 'all') || tags.indexOf(currentFilter) !== -1;
      var matchesSearch = !searchLower || (name.indexOf(searchLower) !== -1 || code.indexOf(searchLower) !== -1 || cat.indexOf(searchLower) !== -1);

      if (matchesFilter && matchesSearch) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (matCountDisplay) {
      matCountDisplay.textContent = visibleCount + (visibleCount === 1 ? ' material' : ' materials');
    }
  }

  matFilterPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      matFilterPills.forEach(function (p) { p.classList.remove('on'); });
      pill.classList.add('on');
      currentFilter = pill.getAttribute('data-filter') || 'all';
      filterMaterials();
    });
  });

  if (matSearchInput) {
    matSearchInput.addEventListener('input', function (e) {
      currentSearch = e.target.value;
      filterMaterials();
    });
  }

  // Modal logic
  var matModal = document.getElementById('matModal');
  var matModalBackdrop = document.getElementById('matModalBackdrop');
  var matModalClose = document.getElementById('matModalClose');
  var matModalCloseBtn = document.getElementById('matModalCloseBtn');
  var matModalImg = document.getElementById('matModalImg');
  var matModalCode = document.getElementById('matModalCode');
  var matModalCat = document.getElementById('matModalCat');
  var matModalTitle = document.getElementById('matModalTitle');
  var matModalComp = document.getElementById('matModalComp');
  var matModalGsm = document.getElementById('matModalGsm');
  var matModalTags = document.getElementById('matModalTags');

  function openMatModal(card) {
    if (!matModal) return;
    var name = card.getAttribute('data-name');
    var code = card.getAttribute('data-code');
    var cat = card.getAttribute('data-cat');
    var comp = card.getAttribute('data-comp');
    var gsm = card.getAttribute('data-gsm');
    var img = card.getAttribute('data-img');
    var tags = (card.getAttribute('data-tags') || '').split(' ').map(function (t) {
      return t.charAt(0).toUpperCase() + t.slice(1);
    }).join(' · ');

    if (matModalTitle) matModalTitle.textContent = name;
    if (matModalCode) matModalCode.textContent = code;
    if (matModalCat) matModalCat.textContent = cat;
    if (matModalComp) matModalComp.textContent = comp;
    if (matModalGsm) matModalGsm.textContent = gsm;
    if (matModalTags) matModalTags.textContent = tags;
    if (matModalImg) {
      matModalImg.src = img;
      matModalImg.alt = code + ' ' + name;
    }

    matModal.classList.add('is-open');
    matModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMatModal() {
    if (!matModal) return;
    matModal.classList.remove('is-open');
    matModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  matCards.forEach(function (card) {
    card.addEventListener('click', function (e) {
      openMatModal(card);
    });
  });

  if (matModalClose) matModalClose.addEventListener('click', closeMatModal);
  if (matModalCloseBtn) matModalCloseBtn.addEventListener('click', closeMatModal);
  if (matModalBackdrop) matModalBackdrop.addEventListener('click', closeMatModal);
  
  var matModalDevelopBtn = document.getElementById('matModalDevelopBtn');
  if (matModalDevelopBtn) {
    matModalDevelopBtn.addEventListener('click', function () {
      var name = matModalTitle ? matModalTitle.textContent : 'Fabric Development';
      var code = matModalCode ? matModalCode.textContent : '';
      var cat = matModalCat ? matModalCat.textContent : '';
      var comp = matModalComp ? matModalComp.textContent : '';
      var gsm = matModalGsm ? matModalGsm.textContent : '';
      var tags = matModalTags ? matModalTags.textContent : '';

      var modalMsg = "Fabric Development & Swatch Request for " + name + " (" + code + "):\n" +
        "• Category: " + cat + "\n" +
        "• Target Composition: " + comp + "\n" +
        "• Weight / GSM: " + gsm + "\n" +
        "• Performance Attributes: " + tags + "\n\n" +
        "Please provide physical swatches and bulk engineering options for this material.";

      closeMatModal();
      fillContactAndScroll('fabric', modalMsg);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && matModal && matModal.classList.contains('is-open')) {
      closeMatModal();
    }
  });

  /* ---------------- 7. CONTACT ENQUIRY FORM ---------------- */
  var contactForm = document.getElementById('contactForm');
  var contactSuccess = document.getElementById('contactSuccess');
  var contactRefCode = document.getElementById('contactRefCode');
  var contactSubmitBtn = document.getElementById('contactSubmitBtn');
  var contactResetBtn = document.getElementById('contactResetBtn');
  var enquiryTopicInput = document.getElementById('enquiryTopic');
  var topicChips = document.querySelectorAll('.topic-chip');

  topicChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      topicChips.forEach(function (c) { c.classList.remove('on'); });
      chip.classList.add('on');
      var topic = chip.getAttribute('data-topic');
      if (enquiryTopicInput) enquiryTopicInput.value = topic;
    });
  });

  var enquiryModal = document.getElementById('enquirySuccessModal');
  var enquiryModalBackdrop = document.getElementById('enquiryModalBackdrop');
  var enquiryModalClose = document.getElementById('enquiryModalClose');
  var enquiryModalDoneBtn = document.getElementById('enquiryModalDoneBtn');
  var enquiryModalRef = document.getElementById('enquiryModalRef');

  function openEnquiryModal(ref) {
    if (!enquiryModal) return;
    if (enquiryModalRef) enquiryModalRef.textContent = ref;
    enquiryModal.classList.add('is-open');
    enquiryModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeEnquiryModal() {
    if (!enquiryModal) return;
    enquiryModal.classList.remove('is-open');
    enquiryModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (enquiryModalClose) enquiryModalClose.addEventListener('click', closeEnquiryModal);
  if (enquiryModalDoneBtn) enquiryModalDoneBtn.addEventListener('click', closeEnquiryModal);
  if (enquiryModalBackdrop) enquiryModalBackdrop.addEventListener('click', closeEnquiryModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && enquiryModal && enquiryModal.classList.contains('is-open')) {
      closeEnquiryModal();
    }
  });

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameInput = document.getElementById('contactName');
      var emailInput = document.getElementById('contactEmail');
      var companyInput = document.getElementById('contactCompany');
      var phoneInput = document.getElementById('contactPhone');
      var messageInput = document.getElementById('contactMessage');

      var name = nameInput ? nameInput.value.trim() : '';
      var email = emailInput ? emailInput.value.trim() : '';
      var company = companyInput ? companyInput.value.trim() : '';
      var phone = phoneInput ? phoneInput.value.trim() : '';
      var message = messageInput ? messageInput.value.trim() : '';
      var topic = enquiryTopicInput ? enquiryTopicInput.value : 'fabric';

      if (!name) {
        if (nameInput) nameInput.focus();
        return;
      }
      if (!email || email.indexOf('@') === -1) {
        if (emailInput) emailInput.focus();
        return;
      }

      var fullMessage = message;
      if (phone) {
        fullMessage = (fullMessage ? fullMessage + '\n\n' : '') + '[Phone/WhatsApp: ' + phone + ']';
      }

      if (contactSubmitBtn) {
        contactSubmitBtn.disabled = true;
        contactSubmitBtn.querySelector('span').textContent = 'Sending...';
      }

      fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          name: name,
          email: email,
          company: company || null,
          message: fullMessage || null
        })
      })
        .then(function (r) {
          return r.json().then(function (data) {
            return { ok: r.ok, body: data };
          });
        })
        .then(function (res) {
          var ref = (res.ok && res.body.reference) ? res.body.reference : ('ENQ-' + Math.random().toString(36).substring(2, 8).toUpperCase());
          if (contactRefCode) contactRefCode.textContent = ref;
          
          // Open Success Popup Modal
          openEnquiryModal(ref);

          // Reset form fields for next use
          contactForm.reset();
          topicChips.forEach(function (c, idx) {
            c.classList.toggle('on', idx === 0);
          });
          if (enquiryTopicInput) enquiryTopicInput.value = 'fabric';
        })
        .catch(function () {
          var fallbackRef = 'ENQ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          if (contactRefCode) contactRefCode.textContent = fallbackRef;
          
          // Open Success Popup Modal
          openEnquiryModal(fallbackRef);

          contactForm.reset();
        })
        .finally(function () {
          if (contactSubmitBtn) {
            contactSubmitBtn.disabled = false;
            contactSubmitBtn.querySelector('span').textContent = 'Send Enquiry';
          }
        });
    });
  }

  if (contactResetBtn && contactForm && contactSuccess) {
    contactResetBtn.addEventListener('click', function () {
      contactForm.reset();
      topicChips.forEach(function (c, idx) {
        c.classList.toggle('on', idx === 0);
      });
      if (enquiryTopicInput) enquiryTopicInput.value = 'fabric';
      contactSuccess.hidden = true;
      contactForm.hidden = false;
    });
  }
})();


