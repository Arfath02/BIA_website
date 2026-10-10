/* ============================================================
   BIA — Brilliance in Apparel · homepage interactions
   1. Cinematic hero: red thread draws across the mill imagery
      over ~8.4s with staged microcopy and a skip control.
   2. Scroll: reveal-on-scroll + scroll-drawn journey thread.
   3. Make Your Fabric: brief builder -> POST /api/fabric-brief
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 1. SCROLL EFFECTS ---------------- */
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
  window.fillContactAndScroll = fillContactAndScroll;

  // Challenge Pills Interactive Toggle
  var challengePills = document.querySelectorAll('.challenge-pills .c-pill');
  var challengeBtn = document.querySelector('.challenge-btn');
  if (challengePills.length > 0) {
    challengePills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        pill.classList.toggle('active');
        var activePills = [];
        challengePills.forEach(function (p) {
          if (p.classList.contains('active')) activePills.push(p.textContent.trim());
        });
        if (challengeBtn) {
          var briefMsg = "Custom Fabric Challenge Brief:\n" +
            "• Selected Parameters: " + (activePills.length > 0 ? activePills.join(' · ') : 'Performance Custom Spec') + "\n" +
            "• Application: High-Performance Technical Garments\n\n" +
            "Please formulate a development trial brief for our engineering parameters.";
          challengeBtn.setAttribute('onclick', "if(window.fillContactAndScroll){window.fillContactAndScroll('development', `" + briefMsg + "`);}");
        }
      });
    });
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

  /* ---------------- 4. BIA FABRIC LAB / MATERIAL DISCOVERY ---------------- */
  var dimTabs = document.querySelectorAll('.dim-tab');
  var dimGroups = document.querySelectorAll('.dim-pills-group');
  var allFilterPills = document.querySelectorAll('.mat-filter-pill');

  // Dimension Tabs Switcher
  dimTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var dim = tab.getAttribute('data-dim');
      dimTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');

      dimGroups.forEach(function (group) { group.classList.remove('active'); });
      var targetGroup = document.getElementById('dimGroup' + dim.charAt(0).toUpperCase() + dim.slice(1));
      if (targetGroup) {
        targetGroup.classList.add('active');
        // If no pill in target group is 'on', activate 'all'
        var onPill = targetGroup.querySelector('.mat-filter-pill.on');
        if (!onPill) {
          var allPill = targetGroup.querySelector('[data-filter="all"]');
          if (allPill) allPill.classList.add('on');
        }
      }
    });
  });

  function filterMaterials() {
    var visibleCount = 0;
    var searchLower = currentSearch.toLowerCase().trim();

    matCards.forEach(function (card) {
      var tags = (card.getAttribute('data-tags') || '').toLowerCase();
      var name = (card.getAttribute('data-name') || '').toLowerCase();
      var code = (card.getAttribute('data-code') || '').toLowerCase();
      var cat = (card.getAttribute('data-cat') || '').toLowerCase();
      var comp = (card.getAttribute('data-comp') || '').toLowerCase();

      var matchesFilter = (currentFilter === 'all') || tags.indexOf(currentFilter) !== -1;
      var matchesSearch = !searchLower || (name.indexOf(searchLower) !== -1 || code.indexOf(searchLower) !== -1 || cat.indexOf(searchLower) !== -1 || comp.indexOf(searchLower) !== -1);

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

  allFilterPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var parentGroup = pill.closest('.dim-pills-group');
      if (parentGroup) {
        parentGroup.querySelectorAll('.mat-filter-pill').forEach(function (p) { p.classList.remove('on'); });
      } else {
        allFilterPills.forEach(function (p) { p.classList.remove('on'); });
      }
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

  // Enhanced Fabric Product Modal logic
  var matModal = document.getElementById('matModal');
  var matModalBackdrop = document.getElementById('matModalBackdrop');
  var matModalClose = document.getElementById('matModalClose');
  var matModalImg = document.getElementById('matModalImg');
  var matModalCode = document.getElementById('matModalCode');
  var matModalCat = document.getElementById('matModalCat');
  var matModalTitle = document.getElementById('matModalTitle');
  var matModalComp = document.getElementById('matModalComp');
  var matModalGsm = document.getElementById('matModalGsm');
  var matModalGauge = document.getElementById('matModalGauge');
  var matModalWidth = document.getElementById('matModalWidth');
  var matModalPerf = document.getElementById('matModalPerf');
  var matModalTags = document.getElementById('matModalTags');

  function openMatModal(card) {
    if (!matModal) return;
    var name = card.getAttribute('data-name');
    var code = card.getAttribute('data-code');
    var cat = card.getAttribute('data-cat');
    var comp = card.getAttribute('data-comp');
    var gsm = card.getAttribute('data-gsm');
    var width = card.getAttribute('data-width') || '152 cm (60")';
    var gauge = card.getAttribute('data-gauge') || '32 Gauge Circular Knit';
    var perf = card.getAttribute('data-perf') || 'Performance Engineered';
    var img = card.getAttribute('data-img');
    var tagList = (card.getAttribute('data-tags') || '').split(' ').filter(Boolean);

    if (matModalTitle) matModalTitle.textContent = name;
    if (matModalCode) matModalCode.textContent = code;
    if (matModalCat) matModalCat.textContent = cat;
    if (matModalComp) matModalComp.textContent = comp;
    if (matModalGsm) matModalGsm.textContent = gsm;
    if (matModalWidth) matModalWidth.textContent = width;
    if (matModalGauge) matModalGauge.textContent = gauge;
    if (matModalPerf) matModalPerf.textContent = perf;
    
    if (matModalTags) {
      matModalTags.innerHTML = '';
      tagList.forEach(function (t) {
        var span = document.createElement('span');
        span.className = 'f-tag-pill';
        span.textContent = t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ');
        matModalTags.appendChild(span);
      });
    }

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
    card.addEventListener('click', function () {
      openMatModal(card);
    });
  });

  if (matModalClose) matModalClose.addEventListener('click', closeMatModal);
  if (matModalBackdrop) matModalBackdrop.addEventListener('click', closeMatModal);
  
  var matModalDevelopBtn = document.getElementById('matModalDevelopBtn');
  if (matModalDevelopBtn) {
    matModalDevelopBtn.addEventListener('click', function () {
      var name = matModalTitle ? matModalTitle.textContent : 'Fabric Development';
      var code = matModalCode ? matModalCode.textContent : '';
      var cat = matModalCat ? matModalCat.textContent : '';
      var comp = matModalComp ? matModalComp.textContent : '';
      var gsm = matModalGsm ? matModalGsm.textContent : '';
      var width = matModalWidth ? matModalWidth.textContent : '';
      var gauge = matModalGauge ? matModalGauge.textContent : '';

      var modalMsg = "SWATCH REQUEST & FABRIC DEVELOPMENT FOR: " + name + " (" + code + ")\n\n" +
        "• Material Category: " + cat + "\n" +
        "• Target Composition: " + comp + "\n" +
        "• Target Weight: " + gsm + "\n" +
        "• Cuttable Width: " + width + "\n" +
        "• Construction/Gauge: " + gauge + "\n\n" +
        "Please courier physical sample swatches & yarn lab dips to our design office.";

      closeMatModal();
      fillContactAndScroll('development', modalMsg);
    });
  }

  // Download Fabric Technical Spec Sheet
  window.downloadFabricSpec = function () {
    var name = matModalTitle ? matModalTitle.textContent : 'BIA Fabric';
    var code = matModalCode ? matModalCode.textContent : 'DEV-01';
    var comp = matModalComp ? matModalComp.textContent : '';
    var gsm = matModalGsm ? matModalGsm.textContent : '';
    var width = matModalWidth ? matModalWidth.textContent : '';
    var gauge = matModalGauge ? matModalGauge.textContent : '';
    var perf = matModalPerf ? matModalPerf.textContent : '';

    var specDoc = "<!DOCTYPE html><html><head><title>BIA Technical Data Sheet - " + code + "</title>" +
      "<style>body{font-family:Helvetica,Arial,sans-serif;padding:40px;color:#131014;line-height:1.6;}" +
      ".header{border-bottom:3px solid #c8102e;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center;}" +
      "h1{color:#c8102e;margin:0;font-size:24px;}h2{margin:5px 0 0;font-size:18px;color:#131014;}" +
      "table{width:100%;border-collapse:collapse;margin:24px 0;}th,td{padding:12px 16px;border:1px solid #ddd;text-align:left;}" +
      "th{background:#f4f1ec;font-weight:bold;width:35%;}.footer{margin-top:40px;font-size:12px;color:#777;border-top:1px solid #ddd;padding-top:15px;}</style></head>" +
      "<body><div class='header'><div><h1>BIA — BRILLIANCE IN APPAREL</h1><h2>TECHNICAL DATA SHEET</h2></div><div><strong>" + code + "</strong></div></div>" +
      "<h3>" + name + "</h3>" +
      "<table>" +
      "<tr><th>Item Code</th><td>" + code + "</td></tr>" +
      "<tr><th>Composition</th><td>" + comp + "</td></tr>" +
      "<tr><th>Weight / GSM</th><td>" + gsm + "</td></tr>" +
      "<tr><th>Cuttable Width</th><td>" + width + "</td></tr>" +
      "<tr><th>Knit Construction & Gauge</th><td>" + gauge + "</td></tr>" +
      "<tr><th>Performance Characteristics</th><td>" + perf + "</td></tr>" +
      "<tr><th>Audited Certifications</th><td>OEKO-TEX Standard 100 Class 1, GRS 4.0, ZDHC Level 3</td></tr>" +
      "<tr><th>Duty Tariff Advantage</th><td>0% US Import Tariff under Jordan-US Free Trade Agreement</td></tr>" +
      "</table>" +
      "<div class='footer'>BIA Fabric Engineering Division · Al-Tajamouat Industrial City, Amman, Jordan · develop@bia.jo</div>" +
      "<script>window.print();<\/script></body></html>";

    var printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(specDoc);
      printWindow.document.close();
    }
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && matModal && matModal.classList.contains('is-open')) {
      closeMatModal();
    }
  });

  /* ---------------- 7. DYNAMIC 6-PATHWAY CONTACT & ENQUIRY SYSTEM ---------------- */
  var pathwayCards = document.querySelectorAll('.pathway-card');
  var pathwayPanels = document.querySelectorAll('.pathway-form-panel');
  var currentFormTag = document.getElementById('currentFormTag');
  var currentFormTitle = document.getElementById('currentFormTitle');
  var currentPathwayName = document.getElementById('currentPathwayName');
  var submitBtnLabel = document.getElementById('submitBtnLabel');
  var enquiryTopicInput = document.getElementById('enquiryTopic');
  var contactForm = document.getElementById('contactForm');
  var contactSubmitBtn = document.getElementById('contactSubmitBtn');

  var pathwayConfig = {
    fabric: {
      tag: 'PATHWAY 01 · SWATCH & DISCOVERY',
      title: 'Request Fabric Swatches & Lab Hangers',
      name: 'I need a fabric',
      btn: 'Request Fabric Swatches',
      refPrefix: 'BIA-FAB'
    },
    development: {
      tag: 'PATHWAY 02 · CUSTOM ENGINEERING',
      title: 'Submit Technical Development Brief',
      name: 'I have a development brief',
      btn: 'Submit Technical Brief',
      refPrefix: 'BIA-DEV'
    },
    capacity: {
      tag: 'PATHWAY 03 · SCALE & PRODUCTION TONNAGE',
      title: 'Reserve Mill Production Capacity',
      name: 'I need production capacity',
      btn: 'Request Capacity Allocation',
      refPrefix: 'BIA-CAP'
    },
    mill_visit: {
      tag: 'PATHWAY 04 · AMMAN MILL DELEGATION TOUR',
      title: 'Schedule a Guided Factory Tour in Amman',
      name: 'I want to visit BIA',
      btn: 'Book Mill Tour Delegation',
      refPrefix: 'BIA-VIS'
    },
    supplier: {
      tag: 'PATHWAY 05 · SUPPLY CHAIN PARTNERSHIP',
      title: 'Submit Raw Material / Supplier Profile',
      name: 'I want to become a supplier',
      btn: 'Submit Supplier Profile',
      refPrefix: 'BIA-SUP'
    },
    careers: {
      tag: 'PATHWAY 06 · CAREERS & CULTURE',
      title: 'Apply to Join the BIA Textiles Team',
      name: 'I\'m looking for a career',
      btn: 'Submit Career Application',
      refPrefix: 'BIA-CAR'
    }
  };

  function selectPathway(pathwayKey, scroll) {
    if (!pathwayConfig[pathwayKey]) pathwayKey = 'fabric';
    var conf = pathwayConfig[pathwayKey];

    // Highlight active card
    pathwayCards.forEach(function (card) {
      card.classList.toggle('active', card.getAttribute('data-pathway') === pathwayKey);
    });

    // Show matching form panel
    pathwayPanels.forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'panel-' + pathwayKey);
    });

    // Update labels and tags
    if (currentFormTag) currentFormTag.textContent = conf.tag;
    if (currentFormTitle) currentFormTitle.textContent = conf.title;
    if (currentPathwayName) currentPathwayName.textContent = conf.name;
    if (submitBtnLabel) submitBtnLabel.textContent = conf.btn;
    if (enquiryTopicInput) enquiryTopicInput.value = pathwayKey;

    if (scroll) {
      var container = document.getElementById('contactFormContainer');
      if (container) {
        var y = container.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }
  window.selectPathway = selectPathway;

  pathwayCards.forEach(function (card) {
    card.addEventListener('click', function () {
      var p = card.getAttribute('data-pathway');
      selectPathway(p, false);
    });
  });

  // Multi-chip selector toggles
  document.querySelectorAll('.multi-chips').forEach(function (wrap) {
    wrap.querySelectorAll('.f-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        chip.classList.toggle('active');
      });
    });
  });

  // Parse URL query parameter (e.g. ?pathway=mill_visit or ?topic=development)
  var urlParams = new URLSearchParams(window.location.search);
  var initialPath = urlParams.get('pathway') || urlParams.get('topic') || urlParams.get('path');
  if (initialPath && pathwayConfig[initialPath]) {
    selectPathway(initialPath, false);
  }

  // Success Modal
  var enquiryModal = document.getElementById('enquirySuccessModal');
  var enquiryModalBackdrop = document.getElementById('enquiryModalBackdrop');
  var enquiryModalClose = document.getElementById('enquiryModalClose');
  var enquiryModalDoneBtn = document.getElementById('enquiryModalDoneBtn');
  var enquiryModalRef = document.getElementById('enquiryModalRef');
  var enquirySuccessTitle = document.getElementById('enquirySuccessTitle');
  var enquirySuccessDesc = document.getElementById('enquirySuccessDesc');

  function openEnquiryModal(ref, pathway) {
    if (!enquiryModal) return;
    var conf = pathwayConfig[pathway] || pathwayConfig.fabric;
    if (enquiryModalRef) enquiryModalRef.textContent = ref;
    if (enquirySuccessTitle) enquirySuccessTitle.textContent = conf.name + ' — Transmitted';
    if (enquirySuccessDesc) enquirySuccessDesc.textContent = 'Thank you for reaching out. Your ' + conf.name.toLowerCase() + ' submission has been logged and assigned to our textile specialists in Amman, Jordan.';

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

  // Handle Form Submission
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var activePathway = enquiryTopicInput ? enquiryTopicInput.value : 'fabric';
      var conf = pathwayConfig[activePathway] || pathwayConfig.fabric;

      var nameInput = document.getElementById('contactName');
      var emailInput = document.getElementById('contactEmail');
      var companyInput = document.getElementById('contactCompany');
      var phoneInput = document.getElementById('contactPhone');
      var messageInput = document.getElementById('contactMessage');

      var name = nameInput ? nameInput.value.trim() : '';
      var email = emailInput ? emailInput.value.trim() : '';
      var company = companyInput ? companyInput.value.trim() : '';
      var phone = phoneInput ? phoneInput.value.trim() : '';
      var userMsg = messageInput ? messageInput.value.trim() : '';

      if (!name) {
        if (nameInput) nameInput.focus();
        alert('Please provide your full name.');
        return;
      }
      if (!email || email.indexOf('@') === -1) {
        if (emailInput) emailInput.focus();
        alert('Please provide a valid work email.');
        return;
      }

      // Collect pathway-specific parameters
      var lines = ['[' + conf.tag + ']'];
      
      if (activePathway === 'fabric') {
        var constr = [];
        document.querySelectorAll('#panel-fabric [data-target="fabric_construction"] .f-chip.active').forEach(function (c) { constr.push(c.getAttribute('data-val')); });
        var gsms = [];
        document.querySelectorAll('#panel-fabric [data-target="fabric_gsm"] .f-chip.active').forEach(function (c) { gsms.push(c.getAttribute('data-val')); });
        var pkgs = [];
        document.querySelectorAll('#panel-fabric [data-target="fabric_package"] .f-chip.active').forEach(function (c) { pkgs.push(c.getAttribute('data-val')); });
        var addr = document.getElementById('swatchAddress') ? document.getElementById('swatchAddress').value.trim() : '';

        if (constr.length) lines.push('• Target Constructions: ' + constr.join(', '));
        if (gsms.length) lines.push('• Target Weight: ' + gsms.join(', '));
        if (pkgs.length) lines.push('• Package Type: ' + pkgs.join(', '));
        if (addr) lines.push('• Courier Dispatch Address: ' + addr);
      } else if (activePathway === 'development') {
        var app = document.getElementById('devApplication') ? document.getElementById('devApplication').value : '';
        var season = document.getElementById('devSeason') ? document.getElementById('devSeason').value : '';
        var benchs = [];
        document.querySelectorAll('#panel-development [data-target="dev_benchmarks"] .f-chip.active').forEach(function (c) { benchs.push(c.getAttribute('data-val')); });
        var specs = document.getElementById('devSpecs') ? document.getElementById('devSpecs').value.trim() : '';

        if (app) lines.push('• Garment Application: ' + app);
        if (season) lines.push('• Target Season: ' + season);
        if (benchs.length) lines.push('• Benchmarks & Standards: ' + benchs.join(', '));
        if (specs) lines.push('• Fiber & Technical Specs:\n  ' + specs);
      } else if (activePathway === 'capacity') {
        var vol = document.getElementById('capVolume') ? document.getElementById('capVolume').value : '';
        var model = document.getElementById('capModel') ? document.getElementById('capModel').value : '';
        var mkts = [];
        document.querySelectorAll('#panel-capacity [data-target="cap_markets"] .f-chip.active').forEach(function (c) { mkts.push(c.getAttribute('data-val')); });
        var timeline = document.getElementById('capTimeline') ? document.getElementById('capTimeline').value.trim() : '';

        if (vol) lines.push('• Monthly Volume: ' + vol);
        if (model) lines.push('• Integration Model: ' + model);
        if (mkts.length) lines.push('• Target Export Markets: ' + mkts.join(', '));
        if (timeline) lines.push('• Ramp-Up Window / Terms: ' + timeline);
      } else if (activePathway === 'mill_visit') {
        var vDates = document.getElementById('visitDates') ? document.getElementById('visitDates').value.trim() : '';
        var vDel = document.getElementById('visitDelegation') ? document.getElementById('visitDelegation').value : '';
        var focus = [];
        document.querySelectorAll('#panel-mill_visit [data-target="visit_focus"] .f-chip.active').forEach(function (c) { focus.push(c.getAttribute('data-val')); });
        var assist = [];
        document.querySelectorAll('#panel-mill_visit [data-target="visit_assistance"] .f-chip.active').forEach(function (c) { assist.push(c.getAttribute('data-val')); });

        if (vDates) lines.push('• Preferred Visit Dates: ' + vDates);
        if (vDel) lines.push('• Delegation Size: ' + vDel);
        if (focus.length) lines.push('• Facility Focus: ' + focus.join(', '));
        if (assist.length) lines.push('• Logistics Support: ' + assist.join(', '));
      } else if (activePathway === 'supplier') {
        var sCat = document.getElementById('supCategory') ? document.getElementById('supCategory').value : '';
        var sOrig = document.getElementById('supOrigin') ? document.getElementById('supOrigin').value.trim() : '';
        var certs = [];
        document.querySelectorAll('#panel-supplier [data-target="sup_certs"] .f-chip.active').forEach(function (c) { certs.push(c.getAttribute('data-val')); });
        var innov = document.getElementById('supInnovation') ? document.getElementById('supInnovation').value.trim() : '';

        if (sCat) lines.push('• Supply Category: ' + sCat);
        if (sOrig) lines.push('• Origin: ' + sOrig);
        if (certs.length) lines.push('• Compliance Certs: ' + certs.join(', '));
        if (innov) lines.push('• Product Proposition:\n  ' + innov);
      } else if (activePathway === 'careers') {
        var cDept = document.getElementById('carDepartment') ? document.getElementById('carDepartment').value : '';
        var cExp = document.getElementById('carExperience') ? document.getElementById('carExperience').value : '';
        var cLink = document.getElementById('carLinkedin') ? document.getElementById('carLinkedin').value.trim() : '';
        var cReloc = document.getElementById('carRelocation') ? document.getElementById('carRelocation').value : '';
        var cSumm = document.getElementById('carSummary') ? document.getElementById('carSummary').value.trim() : '';

        if (cDept) lines.push('• Desired Department: ' + cDept);
        if (cExp) lines.push('• Experience: ' + cExp);
        if (cLink) lines.push('• LinkedIn/Portfolio: ' + cLink);
        if (cReloc) lines.push('• Relocation: ' + cReloc);
        if (cSumm) lines.push('• Summary:\n  ' + cSumm);
      }

      if (phone) lines.push('• Phone/WhatsApp: ' + phone);
      if (userMsg) lines.push('• Additional Notes:\n  ' + userMsg);

      var fullMessage = lines.join('\n');

      if (contactSubmitBtn) {
        contactSubmitBtn.disabled = true;
        if (submitBtnLabel) submitBtnLabel.textContent = 'Transmitting...';
      }

      var generatedRef = (conf.refPrefix || 'BIA-REQ') + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: activePathway,
          name: name,
          email: email,
          company: company || null,
          message: fullMessage
        })
      })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, body: data };
        });
      })
      .then(function (res) {
        var ref = (res.ok && res.body.reference) ? res.body.reference : generatedRef;
        openEnquiryModal(ref, activePathway);
        contactForm.reset();
        selectPathway(activePathway, false);
      })
      .catch(function () {
        openEnquiryModal(generatedRef, activePathway);
        contactForm.reset();
        selectPathway(activePathway, false);
      })
      .finally(function () {
        if (contactSubmitBtn) {
          contactSubmitBtn.disabled = false;
          if (submitBtnLabel) submitBtnLabel.textContent = conf.btn;
        }
      });
    });
  }

  /* ---------------- 8. OUR STORY POPUP MODAL ---------------- */
  var storyModal = document.getElementById('storyModal');
  var storyModalBackdrop = document.getElementById('storyModalBackdrop');
  var storyModalClose = document.getElementById('storyModalClose');
  var storyModalCloseBtn = document.getElementById('storyModalCloseBtn');
  var storyModalVisitBtn = document.getElementById('storyModalVisitBtn');
  var openStoryTriggers = document.querySelectorAll('.open-story-trigger, #openStoryBtn');

  function openStoryModal() {
    if (!storyModal) return;
    storyModal.classList.add('is-open');
    storyModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeStoryModal() {
    if (!storyModal) return;
    storyModal.classList.remove('is-open');
    storyModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  window.openStoryModal = openStoryModal;
  window.closeStoryModal = closeStoryModal;

  openStoryTriggers.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openStoryModal();
    });
  });

  if (storyModalClose) {
    storyModalClose.addEventListener('click', closeStoryModal);
  }
  if (storyModalCloseBtn) {
    storyModalCloseBtn.addEventListener('click', closeStoryModal);
  }
  if (storyModalBackdrop) {
    storyModalBackdrop.addEventListener('click', closeStoryModal);
  }
  if (storyModalVisitBtn) {
    storyModalVisitBtn.addEventListener('click', function () {
      closeStoryModal();
      var visitChip = document.querySelector('.topic-chip[data-topic="visit"]');
      if (visitChip) visitChip.click();
    });
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && storyModal && storyModal.classList.contains('is-open')) {
      closeStoryModal();
    }
  });

  /* ---------------- 9. FABRIC STORIES ARTICLE READER MODAL ---------------- */
  var STORY_ARTICLES = {
    'quick-dry': {
      tag: 'MATERIAL SCIENCE · FLUID DYNAMICS',
      title: 'What Actually Makes a Fabric Quick-Dry?',
      readTime: '5 MIN READ',
      img: '/static/assets/fabric_product_01.jpg',
      body: '<p class="article-lead">Contrary to common belief, quick-dry performance is not achieved by applying a chemical coating. Topical finishes wash out after 10 to 15 home launderings. True, permanent quick-dry performance is a triumph of polymer physics and cross-sectional micro-capillary engineering.</p>' +
            '<h4>1. Capillary Action & Micro-Groove Geometry</h4>' +
            '<p>Standard synthetic filaments are extruded in smooth cylindrical cross-sections. When liquid sweat hits them, it gathers in bulky droplet reservoirs between yarns. At BIA, our quick-dry filaments are engineered with cloverleaf, trilobal, and multi-channel cross-sections. These longitudinal micro-grooves generate rapid capillary pressure, pulling sweat along the filament axis and spreading it across a 300% wider surface area in under 1.2 seconds.</p>' +
            '<div class="article-quote">“Quick-dry is not just how fast water evaporates from a clothesline; it is the velocity at which moisture is transported away from human skin before sensory discomfort begins.”</div>' +
            '<h4>2. Dual-Face Differential Hydrophilic Gradients</h4>' +
            '<p>We engineer dual-face circular knits with hydrophobic micro-polyester filaments on the inner skin face and hydrophilic micro-filaments on the outer face. This creates a directional moisture gradient: sweat cannot flow backward toward the body, locking the skin-contact face completely dry while ambient air drives rapid outer evaporation.</p>' +
            '<h4>3. AATCC 197 & AATCC 195 Empirical Validation</h4>' +
            '<p>Every lot is tested in our in-house accredited laboratory using AATCC 197 (Vertical Wicking Rate) and AATCC 195 (Liquid Moisture Management Tester). Our high-performance running knits exceed 150mm vertical wicking in 10 minutes with a Grade 5 One-Way Transport Index.</p>'
    },
    'stretch-recovery': {
      tag: 'KNIT ENGINEERING · ELASTICITY & HYSTERESIS',
      title: 'The Science Behind Stretch & Recovery',
      readTime: '5 MIN READ',
      img: '/static/assets/fabric_product_03.jpg',
      body: '<p class="article-lead">In activewear sourcing, brands often assume that higher elastane percentage automatically means better performance. In reality, improper elastane management leads to bagging, high hysteresis power loss, and premature garment sagging.</p>' +
            '<h4>1. Understanding Hysteresis & Power Loss</h4>' +
            '<p>Hysteresis represents the energy lost when an elastic material stretches and returns to rest. Low-quality stretch fabrics exhibit high hysteresis: the fabric stretches easily but returns sluggishly, creating knee bagging and loose waistbands after a workout. BIA engineers elastane core-spinning and plating tension to keep hysteresis below 8%, ensuring instantaneous snap-back.</p>' +
            '<div class="article-quote">“Elastane provides elongation, but knitting loop geometry and heat-setting dwell time dictate true athletic recovery.”</div>' +
            '<h4>2. Mechanical Mono-Material Stretch (Zero Elastane)</h4>' +
            '<p>Through BIA Next R&D, we engineered 100% polyester mechanical stretch fabrics. By utilizing bicomponent polymers with helical molecular spring crimps, we achieve up to 35% 4-way stretch without a single strand of elastane. This allows garments to be 100% circular and recyclable back into filament yarn at end of life.</p>' +
            '<h4>3. ASTM D2594 Athletic Stretch Standards</h4>' +
            '<p>Our performance tights and training jerseys are tested under ASTM D2594 (Knitted Fabric Stretch & Recovery) with static 15-pound tension cycles, certifying recovery rates above 97.5% after repeated 60-minute stress holds.</p>'
    },
    'colour-lab': {
      tag: 'COLOR CHEMISTRY · SPECTROMETRY & ACCREDITATION',
      title: 'Inside the BIA Colour Lab: Zero Shade Variation',
      readTime: '4 MIN READ',
      img: '/static/assets/hero-option-lab.png',
      body: '<p class="article-lead">Color in high-performance synthetic textiles is not an aesthetic afterthought—it is a precise chemical and optical discipline. Inside BIA’s climate-controlled colorimetry lab, shade consistency is maintained to microscopic tolerances.</p>' +
            '<h4>1. Spectral Tolerances Below ΔE < 0.5</h4>' +
            '<p>Using Datacolor 1000 computerized spectrophotometers, our dye chemists measure reflectance curves from 360nm to 700nm. We hold bulk production to strict tolerances of Delta-E (CMC 2:1) &lt; 0.5 across D65 Daylight, TL84 Store Lighting, CWF Fluorescent, and Illuminant A.</p>' +
            '<div class="article-quote">“A navy blue must match flawlessly under gym fluorescents, stadium floodlights, and direct midday sunshine. We eliminate metameric flare before dye vats are loaded.”</div>' +
            '<h4>2. Automated Robotic Dye Kitchens</h4>' +
            '<p>Human dispensing errors are eliminated through our computerized dye kitchens. Liquid dyestuff recipes are auto-pipetted to ±0.01g precision and transferred via closed-loop stainless conduits directly to our 28 low-liquor jet vessels.</p>' +
            '<h4>3. ZDHC Level 3 Input Verification</h4>' +
            '<p>Every color formulation is checked against ZDHC MRSL Level 3 restrictions, guaranteeing that vivid neon athletic shades and deep blacks are achieve without hazardous heavy metals or banned aromatic amines.</p>'
    },
    'gsm-story': {
      tag: 'MATERIAL SCIENCE · FABRIC ARCHITECTURE',
      title: 'Why GSM Doesn\'t Tell the Whole Fabric Story',
      readTime: '4 MIN READ',
      img: '/static/assets/fabric_product_04.jpg',
      body: '<p class="article-lead">Grams per Square Meter (GSM) is the universal metric in fabric sourcing, yet relying solely on GSM is like evaluating a car purely by its curb weight. Two 180 GSM jerseys can look identical on paper but feel and perform like completely different animals.</p>' +
            '<h4>1. Gauge Density vs. Yarn Bulk</h4>' +
            '<p>A 180 GSM single jersey knitted on a coarse 20-gauge machine uses heavy, low-twist yarns in loose loops. It feels spongy, catches wind, snags easily, and loses shape after 5 washes. Knitted on a 32-gauge ultra-fine European circular frame, that exact same 180 GSM is transformed into a dense, squat-proof, wind-resistant, silky second skin.</p>' +
            '<div class="article-quote">“Performance is governed by filament multiplicity, machine gauge, and thermal stenter stabilization—GSM is simply the number on the scale.”</div>' +
            '<h4>2. Filament Multiplicity & Micro-Denier Fibers</h4>' +
            '<p>By employing micro-denier yarns (e.g., 75D/144F—where 144 individual filaments form a single thread), BIA creates lightweight 130 GSM running fabrics that provide higher opacity, burst strength, and UPF 50+ sun protection than standard 200 GSM commodity jerseys.</p>' +
            '<h4>3. Engineering for End-Garment Function</h4>' +
            '<p>When co-developing with global brand partners, BIA evaluates modulus of elasticity, thermal air permeability, and vertical draping coefficient to deliver the precise garment feel desired.</p>'
    },
    'yarn-to-performance': {
      tag: 'MANUFACTURING · VALUE CHAIN ARCHITECTURE',
      title: 'From Yarn to Performance: The Unbroken Journey',
      readTime: '6 MIN READ',
      img: '/static/assets/hero-sample-yarn-warping.jpg',
      body: '<p class="article-lead">High-performance athletic apparel is forged through a synchronized series of micro-decisions across spinning, warping, knitting, low-liquor dyeing, and finishing. At BIA, this entire value chain is integrated under one roof in Amman, Jordan.</p>' +
            '<h4>1. Precision Warping & Positive Yarn Feeding</h4>' +
            '<p>The journey begins with electronic creeling, where yarn cones are fed under active tension sensors calibrated to ±0.5 cN. Constant yarn delivery ensures that loop length remains identical across all 120+ knitting feeds, eliminating fabric spirality.</p>' +
            '<h4>2. 35 RPM Circular Knitting with Laser Inspection</h4>' +
            '<p>Our German Mayer &amp; Cie and Italian Terrot circular knitting frames operate with 3,000 needles turning simultaneously. Optical laser defect scanners monitor needle latch integrity, stopping the machine in milliseconds if a microscopic needle flaw is detected.</p>' +
            '<div class="article-quote">“Synchronizing knitting and dyeing under one roof cuts development lead times from months to days while guaranteeing zero batch drift.”</div>' +
            '<h4>3. Bruckner 8-Chamber Stenter Stabilization</h4>' +
            '<p>Greige fabric is heat-set on Bruckner stenter lines with automated width control and chamber moisture exhaust, curing moisture-wicking polymers into the fiber core before direct transfer to Classic Fashion’s automated cutting suites.</p>'
    },
    'sustainability-performance': {
      tag: 'CIRCULARITY · POLYMER SCIENCE',
      title: 'Can Performance and Sustainability Coexist?',
      readTime: '5 MIN READ',
      img: '/static/assets/fabric_product_05.jpg',
      body: '<p class="article-lead">For years, sourcing directors faced a difficult compromise: choose virgin synthetic fibers for maximum tensile strength and wicking velocity, or choose recycled fibers and accept lower durability. At BIA, empirical testing proves this compromise is obsolete.</p>' +
            '<h4>1. Molecular Purity of GRS rPET Filaments</h4>' +
            '<p>Modern solid-state polymerization (SSP) processes purify post-consumer PET bottles down to intrinsic viscosity levels identical to virgin polymer chips. Our GRS-certified recycled polyester achieves tensile tenacity of 4.8 cN/dtex—matching virgin athletic benchmarks.</p>' +
            '<div class="article-quote">“Sustainability without performance is a compromise brands cannot afford. Our recycled fabrics pass the exact same Olympic-grade bursting and abrasion tests as virgin lines.”</div>' +
            '<h4>2. 85% Closed-Loop Water Recycling in Jordan</h4>' +
            '<p>Operating in Amman, Jordan—one of the world\'s most water-conscious nations—our facility recycles 85% of industrial wastewater through advanced membrane bioreactors (MBR) and industrial reverse osmosis (RO), returning demineralized water directly back to dye jet vessels.</p>' +
            '<h4>3. Verified HIGG FEM 4.0 Benchmarking</h4>' +
            '<p>Our environmental and carbon reductions are third-party audited annually via the HIGG Facility Environmental Module (FEM), providing global brands with verified ESG disclosures for their sustainability reports.</p>'
    },
    'meet-the-engineer': {
      tag: 'HUMAN MASTERY · MILL CULTURE',
      title: 'Meet the Engineer Behind the Fabric: Tariq on Precision at 35 RPM',
      readTime: '4 MIN READ',
      img: '/static/assets/hero-sample-roller-precision.jpg',
      body: '<p class="article-lead">Machines provide speed, but human craftsmanship provides possibility. Meet Tariq, Production &amp; Automation Engineer at BIA, whose daily mission is synchronizing European circular knitting frames to zero-defect tolerances in Amman, Jordan.</p>' +
            '<h4>1. The Feel of Micron-Level Tension</h4>' +
            '<p>“When you walk into Hall 01 with 120 circular knitters running, you don’t just watch the dials—you listen to the hum of the machines,” says Tariq. “A slight change in plant ambient humidity alters yarn friction. Our electronic positive feeders make continuous micro-adjustments, but an engineer’s eye is what guarantees perfection.”</p>' +
            '<div class="article-quote">“People think textile manufacturing is just pushing a start button. In reality, it is mechatronics, material physics, and daily problem-solving.”</div>' +
            '<h4>2. Bridging Laboratory Innovation to 100 Tonnes Daily Output</h4>' +
            '<p>Tariq works directly with BIA’s R&amp;D lab to translate novel knit structures—from 3D textured jacquards to cooling body-mapped meshes—into scalable industrial production without sacrificing machine cycle efficiency.</p>' +
            '<h4>3. Mentoring Jordan’s Next Generation of Makers</h4>' +
            '<p>As an instructor at the BIA Technical Training Academy, Tariq trains young apprentices from Jordanian engineering universities, building domestic high-tech manufacturing expertise in the kingdom.</p>'
    },
    'innovations-watching': {
      tag: 'FUTURE CONCEPTS · BIA NEXT R&D',
      title: '5 Textile Innovations We\'re Watching at BIA Next',
      readTime: '6 MIN READ',
      img: '/static/assets/fabric_product_02.jpg',
      body: '<p class="article-lead">The future of technical apparel will be defined by materials that dynamically adapt to the wearer\'s physiology while leaving zero trace on the planet. Here are five breakthrough innovations currently under active R&amp;D at BIA Next.</p>' +
            '<h4>1. Phase-Change Microcapsule Thermoregulation</h4>' +
            '<p>Bio-based phase change materials (PCMs) embedded directly into synthetic polymers absorb latent body heat when skin temperature rises during intense cardio, and release stored warmth as the athlete cools down.</p>' +
            '<h4>2. Algae & Microbe-Derived Bio-Pigments</h4>' +
            '<p>Replacing synthetic chemical dyestuffs with pigments synthesized from spirulina and bacterial fermentation, eliminating heavy metals and dramatically lowering dyeing liquor temperatures.</p>' +
            '<div class="article-quote">“The future of fabric is intelligent, circular, and biologically regenerative. We are transitioning from passive coverings to responsive interfaces.”</div>' +
            '<h4>3. Mono-Material Circular Recycling Architectures</h4>' +
            '<p>Eliminating blended elastane by engineering mechanical stretch polyester with helical molecular crimp springs, enabling 100% garment-to-garment recyclability without downcycling.</p>' +
            '<h4>4. Waterless Supercritical CO₂ Dyeing</h4>' +
            '<p>Using pressurized carbon dioxide in a closed loop as the fluid dye carrier, completely eliminating process freshwater consumption and wastewater effluent.</p>' +
            '<h4>5. Sensor-Embedded Conductive Knits</h4>' +
            '<p>Knitting conductive silver-coated micro-filaments directly into athletic garments to monitor heart rate, muscle activation, and respiration without bulky external chest straps.</p>'
    }
  };

  var storyArticleModal = document.getElementById('storyArticleModal');
  var articleModalBackdrop = document.getElementById('articleModalBackdrop');
  var articleModalClose = document.getElementById('articleModalClose');
  var articleModalCloseBtn = document.getElementById('articleModalCloseBtn');
  var articleModalImg = document.getElementById('articleModalImg');
  var articleModalTag = document.getElementById('articleModalTag');
  var articleModalTitle = document.getElementById('articleModalTitle');
  var articleModalReadTime = document.getElementById('articleModalReadTime');
  var articleModalBody = document.getElementById('articleModalBody');
  var storyCardBtns = document.querySelectorAll('.story-card-btn, .story');
  var exploreAllStoriesBtn = document.getElementById('exploreAllStoriesBtn');

  function openArticleModal(storyId) {
    if (!storyArticleModal) return;
    var story = STORY_ARTICLES[storyId] || STORY_ARTICLES['quick-dry'];

    if (articleModalTitle) articleModalTitle.textContent = story.title;
    if (articleModalTag) articleModalTag.textContent = story.tag;
    if (articleModalReadTime) articleModalReadTime.textContent = story.readTime;
    if (articleModalImg) {
      articleModalImg.src = story.img;
      articleModalImg.alt = story.title;
    }
    if (articleModalBody) articleModalBody.innerHTML = story.body;

    storyArticleModal.classList.add('is-open');
    storyArticleModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeArticleModal() {
    if (!storyArticleModal) return;
    storyArticleModal.classList.remove('is-open');
    storyArticleModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  window.openArticleModal = openArticleModal;
  window.closeArticleModal = closeArticleModal;

  storyCardBtns.forEach(function (card) {
    card.addEventListener('click', function (e) {
      e.preventDefault();
      var id = card.getAttribute('data-story-id') || 'quick-dry';
      openArticleModal(id);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var id = card.getAttribute('data-story-id') || 'quick-dry';
        openArticleModal(id);
      }
    });
  });

  if (exploreAllStoriesBtn) {
    exploreAllStoriesBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openArticleModal('quick-dry');
    });
  }

  if (articleModalClose) articleModalClose.addEventListener('click', closeArticleModal);
  if (articleModalCloseBtn) articleModalCloseBtn.addEventListener('click', closeArticleModal);
  if (articleModalBackdrop) articleModalBackdrop.addEventListener('click', closeArticleModal);

  /* Topic filter buttons on Fabric Stories page */
  var storyFilterBtns = document.querySelectorAll('.story-filter-btn');
  var editorialStoryCards = document.querySelectorAll('.stories-editorial-grid .story-card');
  if (storyFilterBtns.length && editorialStoryCards.length) {
    storyFilterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        storyFilterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var filter = btn.getAttribute('data-filter') || 'all';

        editorialStoryCards.forEach(function (card) {
          var cat = card.getAttribute('data-category');
          if (filter === 'all' || cat === filter) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }
  /* ---------------- 10. NAVBAR CATEGORY DROPDOWNS ---------------- */
  var navItems = document.querySelectorAll('.nav-item.has-dropdown');

  navItems.forEach(function (item) {
    var btn = item.querySelector('.nav-link-btn');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = item.classList.contains('is-open');
        navItems.forEach(function (other) { other.classList.remove('is-open'); });
        if (!isOpen) {
          item.classList.add('is-open');
        }
      });
    }

    item.querySelectorAll('.dropdown-item').forEach(function (link) {
      link.addEventListener('click', function () {
        item.classList.remove('is-open');
      });
    });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-item')) {
      navItems.forEach(function (item) { item.classList.remove('is-open'); });
    }
  });

  /* ---------------- 11. BIA NEXT · CHALLENGE US INTERACTIVE CONTROLLER ---------------- */
  var challengeForm = document.getElementById('biaChallengeForm');
  if (challengeForm) {
    // Single-select App chips
    var appChips = document.querySelectorAll('#appChips .c-select-chip');
    var challengeAppInput = document.getElementById('challengeApp');
    appChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        appChips.forEach(function (c) { c.classList.remove('selected'); });
        chip.classList.add('selected');
        if (challengeAppInput) challengeAppInput.value = chip.getAttribute('data-value');
      });
    });

    // Multi-select Performance chips
    var perfChips = document.querySelectorAll('#perfChips .c-select-chip');
    perfChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chip.classList.toggle('selected');
      });
    });

    // Single-select Composition chips
    var compChips = document.querySelectorAll('#compChips .c-select-chip');
    var challengeCompInput = document.getElementById('challengeComp');
    compChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        compChips.forEach(function (c) { c.classList.remove('selected'); });
        chip.classList.add('selected');
        if (challengeCompInput) challengeCompInput.value = chip.getAttribute('data-value');
      });
    });

    // File Upload Simulation
    var uploadZone = document.getElementById('uploadZone');
    var challengeFile = document.getElementById('challengeFile');
    var attachedFileCard = document.getElementById('attachedFileCard');
    var attachedFileName = document.getElementById('attachedFileName');
    var removeFileBtn = document.getElementById('removeFileBtn');

    if (challengeFile && uploadZone) {
      challengeFile.addEventListener('change', function () {
        if (challengeFile.files && challengeFile.files[0]) {
          var file = challengeFile.files[0];
          if (attachedFileName) attachedFileName.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
          if (attachedFileCard) attachedFileCard.style.display = 'flex';
          uploadZone.style.display = 'none';
        }
      });

      if (removeFileBtn) {
        removeFileBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          challengeFile.value = '';
          if (attachedFileCard) attachedFileCard.style.display = 'none';
          uploadZone.style.display = 'block';
        });
      }

      ['dragenter', 'dragover'].forEach(function (evt) {
        uploadZone.addEventListener(evt, function (e) {
          e.preventDefault();
          uploadZone.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (evt) {
        uploadZone.addEventListener(evt, function (e) {
          e.preventDefault();
          uploadZone.classList.remove('dragover');
        });
      });
    }

    // Modal elements
    var challengeSuccessModal = document.getElementById('challengeSuccessModal');
    var challengeModalBackdrop = document.getElementById('challengeModalBackdrop');
    var challengeModalClose = document.getElementById('challengeModalClose');
    var challengeModalDoneBtn = document.getElementById('challengeModalDoneBtn');
    var challengeModalRefCode = document.getElementById('challengeModalRefCode');
    var sumApp = document.getElementById('sumApp');
    var sumGsm = document.getElementById('sumGsm');
    var sumVol = document.getElementById('sumVol');
    var sumTime = document.getElementById('sumTime');

    function openChallengeModal(ref, summary) {
      if (challengeModalRefCode) challengeModalRefCode.textContent = ref;
      if (summary) {
        if (sumApp) sumApp.textContent = summary.application || 'Running & Track';
        if (sumGsm) sumGsm.textContent = summary.gsm || '140–180 GSM';
        if (sumVol) sumVol.textContent = summary.volume || 'Production Program';
        if (sumTime) sumTime.textContent = summary.timeline || 'SS27 Season';
      }
      if (challengeSuccessModal) {
        challengeSuccessModal.classList.add('open');
        challengeSuccessModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    }

    function closeChallengeModal() {
      if (challengeSuccessModal) {
        challengeSuccessModal.classList.remove('open');
        challengeSuccessModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    }

    if (challengeModalClose) challengeModalClose.addEventListener('click', closeChallengeModal);
    if (challengeModalBackdrop) challengeModalBackdrop.addEventListener('click', closeChallengeModal);
    if (challengeModalDoneBtn) challengeModalDoneBtn.addEventListener('click', closeChallengeModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && challengeSuccessModal && challengeSuccessModal.classList.contains('open')) {
        closeChallengeModal();
      }
    });

    // AJAX Submission
    challengeForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var nameInput = document.getElementById('challengeName');
      var emailInput = document.getElementById('challengeEmail');
      var companyInput = document.getElementById('challengeCompany');
      var gsmSelect = document.getElementById('challengeGsm');
      var priceInput = document.getElementById('challengePrice');
      var volumeSelect = document.getElementById('challengeVolume');
      var timelineSelect = document.getElementById('challengeTimeline');
      var notesText = document.getElementById('challengeNotes');
      var submitBtn = document.getElementById('challengeSubmitBtn');

      var name = nameInput ? nameInput.value.trim() : '';
      var email = emailInput ? emailInput.value.trim() : '';
      var company = companyInput ? companyInput.value.trim() : '';
      var app = challengeAppInput ? challengeAppInput.value : 'Running & Track';
      var comp = challengeCompInput ? challengeCompInput.value : '100% Recycled Polyester (GRS)';
      var gsm = gsmSelect ? gsmSelect.value : '140–180 GSM';
      var price = priceInput ? priceInput.value.trim() : '';
      var volume = volumeSelect ? volumeSelect.value : 'Production Program';
      var timeline = timelineSelect ? timelineSelect.value : 'SS27 Season';
      var notes = notesText ? notesText.value.trim() : '';

      // Collect selected performance features
      var selectedPerf = [];
      document.querySelectorAll('#perfChips .c-select-chip.selected').forEach(function (c) {
        selectedPerf.push(c.getAttribute('data-value'));
      });

      if (!name) {
        if (nameInput) nameInput.focus();
        alert('Please enter your full name.');
        return;
      }
      if (!email || !email.includes('@')) {
        if (emailInput) emailInput.focus();
        alert('Please enter a valid work email.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>REGISTERING BRIEF...</span>';
      }

      var payload = {
        name: name,
        email: email,
        company: company,
        application: app,
        performance: selectedPerf,
        composition: comp,
        gsm: gsm,
        target_price: price,
        volume: volume,
        timeline: timeline,
        notes: notes
      };

      fetch('/api/fabric-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>SUBMIT A FABRIC CHALLENGE</span> <span class="arrow">→</span>';
        }
        var ref = data.reference || 'BIA-NXT-' + Math.floor(1000 + Math.random() * 9000);
        openChallengeModal(ref, data.summary || payload);
        challengeForm.reset();
        if (attachedFileCard) attachedFileCard.style.display = 'none';
        if (uploadZone) uploadZone.style.display = 'block';
      })
      .catch(function (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>SUBMIT A FABRIC CHALLENGE</span> <span class="arrow">→</span>';
        }
        var fallbackRef = 'BIA-NXT-' + Math.floor(1000 + Math.random() * 9000);
        openChallengeModal(fallbackRef, payload);
      });
    });
  }

  /* ---------------- 8. PEOPLE & CULTURE: MEET THE MAKERS VIDEO MODAL ---------------- */
  var makerModal = document.getElementById('makerVideoModal');
  var makerModalClose = document.getElementById('makerModalClose');
  var makerModalBackdrop = document.getElementById('makerModalBackdrop');
  var modalDept = document.getElementById('modalDept');
  var modalName = document.getElementById('modalName');
  var modalRole = document.getElementById('modalRole');
  var modalLoc = document.getElementById('modalLoc');
  var modalQ = document.getElementById('modalQ');
  var modalA = document.getElementById('modalA');
  var modalBgVisual = document.getElementById('modalBgVisual');
  var simPlayPauseBtn = document.getElementById('simPlayPauseBtn');
  var simCenterPlay = document.getElementById('simCenterPlay');
  var simTimeProgress = document.getElementById('simTimeProgress');
  var simTimeCode = document.getElementById('simTimeCode');
  var modalReplayBtn = document.getElementById('modalReplayBtn');

  var makerBgMap = {
    rania: 'url("/static/assets/hero-option-lab.png")',
    ahmed: 'url("/static/assets/hero-circular-knit.jpg")',
    tariq: 'url("/static/assets/hero-sample-roller-precision.jpg")',
    sahar: 'url("/static/assets/ecosystem-wall-04-roller-precision.jpg")',
    yousef: 'url("/static/assets/hero-sample-yarn-warping.jpg")'
  };

  var videoTimer = null;
  var currentSec = 0;
  var isPlaying = false;
  var DURATION = 20;

  function updateVideoTime() {
    if (!isPlaying) return;
    currentSec += 0.25;
    if (currentSec > DURATION) {
      currentSec = DURATION;
      pauseVideo();
    }
    var pct = (currentSec / DURATION) * 100;
    if (simTimeProgress) simTimeProgress.style.width = pct + '%';
    if (simTimeCode) {
      var s = Math.floor(currentSec);
      simTimeCode.textContent = '0:' + (s < 10 ? '0' + s : s) + ' / 0:20';
    }
  }

  function playVideo() {
    if (currentSec >= DURATION) currentSec = 0;
    isPlaying = true;
    if (simPlayPauseBtn) simPlayPauseBtn.textContent = '❚❚';
    if (simCenterPlay) simCenterPlay.style.display = 'none';
    clearInterval(videoTimer);
    videoTimer = setInterval(updateVideoTime, 250);
  }

  function pauseVideo() {
    isPlaying = false;
    if (simPlayPauseBtn) simPlayPauseBtn.textContent = '▶';
    if (simCenterPlay) simCenterPlay.style.display = 'flex';
    clearInterval(videoTimer);
  }

  function openMakerModal(card) {
    if (!makerModal || !card) return;
    var id = card.getAttribute('data-maker-id') || 'rania';
    var name = card.getAttribute('data-maker-name') || '';
    var role = card.getAttribute('data-maker-role') || '';
    var dept = card.getAttribute('data-maker-dept') || '';
    var q = card.getAttribute('data-maker-q') || '';
    var a = card.getAttribute('data-maker-a') || '';
    var loc = card.getAttribute('data-maker-loc') || 'Sahab QA Laboratory';

    if (modalDept) modalDept.textContent = dept.toUpperCase();
    if (modalName) modalName.textContent = name;
    if (modalRole) modalRole.textContent = role;
    if (modalLoc) modalLoc.textContent = '📍 ' + loc;
    if (modalQ) modalQ.textContent = '“' + q + '”';
    if (modalA) modalA.textContent = '“' + a + '”';

    if (modalBgVisual) {
      modalBgVisual.style.backgroundImage = makerBgMap[id] || makerBgMap.rania;
    }

    currentSec = 0;
    if (simTimeProgress) simTimeProgress.style.width = '0%';
    if (simTimeCode) simTimeCode.textContent = '0:00 / 0:20';

    makerModal.classList.add('open');
    makerModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    playVideo();
  }

  function closeMakerModal() {
    if (!makerModal) return;
    pauseVideo();
    makerModal.classList.remove('open');
    makerModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.maker-video-card').forEach(function (card) {
    card.addEventListener('click', function () {
      openMakerModal(card);
    });
  });

  if (makerModalClose) makerModalClose.addEventListener('click', closeMakerModal);
  if (makerModalBackdrop) makerModalBackdrop.addEventListener('click', closeMakerModal);
  
  if (simPlayPauseBtn) {
    simPlayPauseBtn.addEventListener('click', function () {
      if (isPlaying) pauseVideo(); else playVideo();
    });
  }
  if (simCenterPlay) {
    simCenterPlay.addEventListener('click', function () {
      playVideo();
    });
  }
  if (modalReplayBtn) {
    modalReplayBtn.addEventListener('click', function () {
      currentSec = 0;
      playVideo();
    });
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && makerModal && makerModal.classList.contains('open')) {
      closeMakerModal();
    }
  });

  /* ---------------- 9. CAREER FILTER PILLS ---------------- */
  var careerPills = document.querySelectorAll('.c-pill');
  var careerCards = document.querySelectorAll('.career-card');

  if (careerPills.length && careerCards.length) {
    careerPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        careerPills.forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');

        var filter = pill.getAttribute('data-filter') || 'all';
        careerCards.forEach(function (card) {
          var cat = card.getAttribute('data-category');
          if (filter === 'all' || cat === filter) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  /* ---------------- 10. INTERACTIVE CERTIFICATIONS MODAL ---------------- */
  var certModal = document.getElementById('certDetailModal');
  var certModalClose = document.getElementById('certModalClose');
  var certModalBackdrop = document.getElementById('certModalBackdrop');
  var modalCertTag = document.getElementById('modalCertTag');
  var modalCertTitle = document.getElementById('modalCertTitle');
  var modalCertSub = document.getElementById('modalCertSub');
  var modalCertMeans = document.getElementById('modalCertMeans');
  var modalCertCovers = document.getElementById('modalCertCovers');
  var modalCertBody = document.getElementById('modalCertBody');
  var modalCertNumber = document.getElementById('modalCertNumber');
  var modalCertValidity = document.getElementById('modalCertValidity');
  var modalDownloadBtn = document.getElementById('modalDownloadBtn');
  var activeCertDownloadName = 'BIA_Accredited_Certificate.pdf';

  function openCertModal(card) {
    if (!certModal || !card) return;
    var title = card.getAttribute('data-cert-title') || '';
    var sub = card.getAttribute('data-cert-subtitle') || '';
    var tag = card.getAttribute('data-cert-tag') || 'ACCREDITED GLOBAL STANDARD';
    var means = card.getAttribute('data-cert-means') || '';
    var covers = card.getAttribute('data-cert-covers') || '';
    var body = card.getAttribute('data-cert-body') || 'Independent Auditing Body';
    var num = card.getAttribute('data-cert-number') || 'BIA-CERT-2026';
    var validity = card.getAttribute('data-cert-validity') || 'Active';
    activeCertDownloadName = card.getAttribute('data-cert-download-name') || 'BIA_Certificate.pdf';

    if (modalCertTag) modalCertTag.textContent = tag.toUpperCase();
    if (modalCertTitle) modalCertTitle.textContent = title;
    if (modalCertSub) modalCertSub.textContent = sub;
    if (modalCertMeans) modalCertMeans.textContent = means;
    if (modalCertCovers) modalCertCovers.textContent = covers;
    if (modalCertBody) modalCertBody.textContent = body;
    if (modalCertNumber) modalCertNumber.textContent = num;
    if (modalCertValidity) modalCertValidity.textContent = validity;

    certModal.classList.add('open');
    certModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCertModal() {
    if (!certModal) return;
    certModal.classList.remove('open');
    certModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.i-cert-card').forEach(function (card) {
    card.addEventListener('click', function () {
      openCertModal(card);
    });
  });

  if (certModalClose) certModalClose.addEventListener('click', closeCertModal);
  if (certModalBackdrop) certModalBackdrop.addEventListener('click', closeCertModal);

  if (modalDownloadBtn) {
    modalDownloadBtn.addEventListener('click', function () {
      var origText = modalDownloadBtn.innerHTML;
      modalDownloadBtn.innerHTML = '<span>PREPARING VERIFIED PDF...</span>';
      modalDownloadBtn.disabled = true;

      setTimeout(function () {
        // Trigger synthetic download or preview notification
        var dummyBlob = new Blob([
          "BIA TEXTILES — OFFICIAL ACCREDITED CERTIFICATE DOSSIER\n" +
          "====================================================\n\n" +
          "Document: " + (modalCertTitle ? modalCertTitle.textContent : "Accredited Certificate") + "\n" +
          "Scope: " + (modalCertSub ? modalCertSub.textContent : "Full Facility Operations") + "\n" +
          "Auditing Body: " + (modalCertBody ? modalCertBody.textContent : "Accredited Agency") + "\n" +
          "License / Certificate #: " + (modalCertNumber ? modalCertNumber.textContent : "VERIFIED") + "\n" +
          "Status: " + (modalCertValidity ? modalCertValidity.textContent : "Active") + "\n\n" +
          "COVERAGE SUMMARY:\n" +
          (modalCertCovers ? modalCertCovers.textContent : "All circular knit fabrics manufactured in Amman, Jordan.") + "\n\n" +
          "For technical verification inquiries: develop@bia.jo / compliance@bia.jo\n" +
          "BIA Textiles Complex, Sahab Industrial City, Amman, Jordan."
        ], { type: 'text/plain;charset=utf-8' });

        var link = document.createElement('a');
        link.href = URL.createObjectURL(dummyBlob);
        link.download = activeCertDownloadName.replace('.pdf', '.txt');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        modalDownloadBtn.innerHTML = '<span>✓ CERTIFICATE DOWNLOADED</span>';
        setTimeout(function () {
          modalDownloadBtn.disabled = false;
          modalDownloadBtn.innerHTML = origText;
        }, 2500);
      }, 700);
    });
  }

  /* ---------------- 11. GLOBAL TRADE MAP & MARKET SWITCHER ---------------- */
  var marketBtns = document.querySelectorAll('.map-market-btn');
  var tradeRoutes = document.querySelectorAll('.trade-route-path');
  var mInfoBadge = document.getElementById('mInfoBadge');
  var mInfoTitle = document.getElementById('mInfoTitle');
  var mInfoTariff = document.getElementById('mInfoTariff');
  var mInfoTransit = document.getElementById('mInfoTransit');
  var mInfoVolume = document.getElementById('mInfoVolume');

  var marketData = {
    usa: {
      badge: 'PRIMARY EXPORT CORRIDOR',
      title: 'North America & United States Market',
      tariff: '0% Import Duty (US-Jordan FTA)',
      transit: '14–16 Days Direct Sea to East Coast / Air Express 48h',
      volume: '500,000+ Finished Pieces Daily via Classic Fashion',
      routeClass: 'route-usa'
    },
    europe: {
      badge: 'RAPID REPLENISHMENT ZONE',
      title: 'United Kingdom & European Union Corridor',
      tariff: 'Preferential Rules of Origin (EU-Jordan Agreement)',
      transit: '7–10 Days Direct Mediterranean Sea Route',
      volume: '250,000+ Performance Garments Delivered Weekly',
      routeClass: 'route-europe'
    },
    'middle-east': {
      badge: 'DOMESTIC & REGIONAL HUB',
      title: 'Middle East & GCC Regional Market',
      tariff: '0% Duty (Greater Arab Free Trade Area - GAFTA)',
      transit: '24–48 Hours Land Freight across GCC',
      volume: 'Same-Week Swatch & Custom Development Turnaround',
      routeClass: 'route-middle-east'
    },
    asia: {
      badge: 'SPECIALIZED YARN NETWORK',
      title: 'Asia Global Raw Material & Sourcing Pipeline',
      tariff: 'Zero-Tariff Inward Processing & Global Sourcing',
      transit: 'Continuous Inbound High-Tenacity Filament & Spun Yarn Flows',
      volume: '100+ Metric Tonnes Daily Spinning Supply',
      routeClass: 'route-asia'
    }
  };

  if (marketBtns.length > 0) {
    marketBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var marketKey = btn.getAttribute('data-market');
        if (!marketKey || !marketData[marketKey]) return;

        // Active state on buttons
        marketBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        // Active state on SVG routes
        tradeRoutes.forEach(function (route) {
          route.classList.remove('active');
          if (route.classList.contains(marketData[marketKey].routeClass)) {
            route.classList.add('active');
          }
        });

        // Update Info Card with subtle fade animation
        var infoCard = document.getElementById('marketInfoCard');
        if (infoCard) {
          infoCard.style.opacity = '0.4';
          infoCard.style.transform = 'translateY(4px)';
          setTimeout(function () {
            var data = marketData[marketKey];
            if (mInfoBadge) mInfoBadge.textContent = data.badge;
            if (mInfoTitle) mInfoTitle.textContent = data.title;
            if (mInfoTariff) mInfoTariff.textContent = data.tariff;
            if (mInfoTransit) mInfoTransit.textContent = data.transit;
            if (mInfoVolume) mInfoVolume.textContent = data.volume;

            infoCard.style.opacity = '1';
            infoCard.style.transform = 'translateY(0)';
          }, 150);
        }
      });
    });
  }

  // --- VIRTUAL MILL TOUR STICKY NAV SCROLLSPY ---
  var tourNavLinks = document.querySelectorAll('.tour-nav-link');
  var tourStopCards = document.querySelectorAll('.tour-stop-card');

  if (tourNavLinks.length && tourStopCards.length && 'IntersectionObserver' in window) {
    var tourObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          tourNavLinks.forEach(function (link) {
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, { rootMargin: '-20% 0px -55% 0px' });

    tourStopCards.forEach(function (card) {
      tourObserver.observe(card);
    });
  }

})();



