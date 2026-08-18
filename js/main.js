/* ============================================================
   Shinkatô — site vitrine
   1) Fond vidéo GLOBAL : la tête de lecture, c'est le scroll de la page
   2) Territoire hexagonal jouable (investir des PM → révéler un hexagone)
   3) Combat « battle de phrases » contre TAMERAI — La Peur de se lancer
      (texte et mécanique repris de l'application : combat_obstacles /
       obstacle_phrase_pools, usePhraseCombat, PhraseCombatModal)
   4) Révélations au scroll
   ============================================================ */

(function () {
  'use strict';

  var byId = function (id) { return document.getElementById(id); };

  var floatReward = function (host, text) {
    var el = document.createElement('span');
    el.className = 'float-reward';
    el.textContent = text;
    host.appendChild(el);
    window.setTimeout(function () { el.remove(); }, 1200);
  };

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* =========================================================
     PARTIE 1 — Fond vidéo piloté par le scroll de TOUTE la page
     Le scroll ne lance pas la vidéo : il EST la tête de lecture.
     ========================================================= */

  (function initFilmBackground() {
    var video = byId('filmbg-video');
    var fill  = byId('filmbg-progressfill');
    var cue   = byId('hero-cue');
    if (!video) { return; }

    /* ⚠️ DÉCISION 16/08/2026 — LA VIDÉO TOURNE EN BOUCLE, le scroll ne la pilote plus.
       Le pilotage au scroll existait et fonctionnait, mais il a été abandonné après test :

         · à l'ARRIVÉE sur la page, il donne une image FIGÉE — or c'est le moment qui
           décide si le visiteur reste. Un jeu ne doit pas paraître immobile là ;
         · il exige que la vidéo soit ENTIÈREMENT chargée (`fullyBuffered`) : en 4G, les
           5,3 Mo mettent du temps, et pendant ce temps c'était la boucle de toute façon ;
         · sur mobile on scrolle vite, l'effet passait en un éclair ;
         · il fallait une consigne à l'écran pour que le visiteur comprenne qu'il le
           pilotait — un effet qui s'explique a déjà perdu.

       Le code des trois modes est CONSERVÉ intact : repasser au pilotage au scroll ne
       demande que de remettre `PILOTAGE_AU_SCROLL` à true.

         'wait'  — état initial, la vidéo tourne en boucle
         'scrub' — le scroll est la tête de lecture (désactivé, voir ci-dessus)
         'loop'  — mode retenu
       Reduced-motion : image figée, aucun mouvement de fond. */
    var PILOTAGE_AU_SCROLL = false;
    var mode = 'wait';
    var duration = 0;
    var target = 0;
    var eased = 0;
    var raf = null;
    var probed = false;

    var pageProgress = function () {
      var span = document.documentElement.scrollHeight - window.innerHeight;
      if (span <= 0) { return 0; }
      var p = window.scrollY / span;
      return p < 0 ? 0 : (p > 1 ? 1 : p);
    };

    var tick = function () {
      raf = null;
      eased += (target - eased) * 0.16;   // lissage : pas d'à-coups image par image
      /* ⚠️ On n'empile PAS les demandes de positionnement : tant que la précédente
         n'est pas honorée (`video.seeking`), en redemander une autre fait décrocher
         les décodeurs mobiles — c'était la vraie cause des saccades sur téléphone. */
      if (!video.seeking && Math.abs(video.currentTime - eased) > 0.012) {
        try { video.currentTime = eased; } catch (e) { /* positionnement refusé */ }
      }
      if (eased !== target) { raf = window.requestAnimationFrame(tick); }
    };

    var onScroll = function () {
      var p = pageProgress();
      if (fill) { fill.style.width = (p * 100).toFixed(2) + '%'; }
      if (cue) { cue.classList.toggle('is-hidden', window.scrollY > 80); }
      if (mode !== 'scrub') { return; }
      target = p * (duration || video.duration || 0);
      if (raf === null) { raf = window.requestAnimationFrame(tick); }
    };

    var play = function () {
      var pr = video.play();
      if (pr && typeof pr.then === 'function') { pr.catch(function () {}); }
    };

    var enterScrub = function () {
      mode = 'scrub';
      video.loop = false;
      video.pause();
      onScroll();
    };

    var enterLoop = function () {
      mode = 'loop';
      video.loop = true;
      play();
    };

    /* La vidéo est-elle ENTIÈREMENT en mémoire ? Se positionner dans une portion non
       téléchargée déclenche une attente réseau à chaque pixel de scroll — c'est ce qui
       rendait l'effet inutilisable en 4G. */
    var fullyBuffered = function () {
      try {
        var b = video.buffered;
        return b.length > 0 && b.end(b.length - 1) >= (video.duration || 0) - 0.25;
      } catch (e) { return false; }
    };

    /* Test réel : on demande un positionnement et on vérifie qu'il est honoré.
       C'est ce qui remplace la devinette « petit écran = pas de scrub ». */
    var probeSeek = function (done) {
      var goal = Math.min(0.6, (video.duration || 1) * 0.1);
      var settled = false;
      var finish = function (ok) {
        if (settled) { return; }
        settled = true;
        video.removeEventListener('seeked', onSeeked);
        window.clearTimeout(timeout);
        done(ok);
      };
      var onSeeked = function () { finish(Math.abs(video.currentTime - goal) < 0.35); };
      var timeout = window.setTimeout(function () { finish(false); }, 2000);
      video.addEventListener('seeked', onSeeked);
      try { video.currentTime = goal; } catch (e) { finish(false); }
    };

    var tryUpgrade = function () {
      if (probed || mode === 'scrub' || prefersReduced.matches) { return; }
      // Pilotage au scroll désactivé : on reste en boucle, sans même sonder le navigateur.
      // (Le sondage `probeSeek` coûtait un positionnement + une attente pour rien.)
      if (!PILOTAGE_AU_SCROLL) { probed = true; enterLoop(); return; }
      if (!video.duration || !fullyBuffered()) { return; }
      probed = true;
      // Une lecture doit avoir eu lieu avant de se positionner (prérequis iOS Safari) :
      // le mode 'wait' l'a déjà assurée en jouant la vidéo en boucle.
      video.pause();
      probeSeek(function (ok) { if (ok) { enterScrub(); } else { enterLoop(); } });
    };

    var applyMode = function () {
      if (prefersReduced.matches) {           // aucun mouvement de fond
        mode = 'reduced';
        video.loop = false;
        video.pause();
        try { video.currentTime = 0; } catch (e) { /* ignore */ }
        return;
      }
      if (mode === 'reduced') { mode = 'wait'; }
      if (mode === 'wait') { video.loop = true; play(); }
      tryUpgrade();
    };

    var onMeta = function () { duration = video.duration || 0; applyMode(); };
    if (video.readyState >= 1) { onMeta(); }
    video.addEventListener('loadedmetadata', onMeta);
    // `progress` se déclenche à chaque tranche téléchargée → on retente dès que possible.
    video.addEventListener('progress', tryUpgrade);
    video.addEventListener('canplaythrough', tryUpgrade);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    if (prefersReduced.addEventListener) { prefersReduced.addEventListener('change', applyMode); }
    else if (prefersReduced.addListener) { prefersReduced.addListener(applyMode); }

    /* Si la lecture automatique a été refusée (économiseur de batterie…), le premier
       contact de l'utilisateur la débloque et relance la tentative de scrub. */
    var kick = function () { if (video.paused && mode === 'wait') { play(); } probed = false; tryUpgrade(); };
    document.addEventListener('touchstart', kick, { once: true, passive: true });
    document.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('load', function () { applyMode(); tryUpgrade(); }, { once: true });

    /* Onglet masqué → on met la vidéo en pause. Elle est en `position: fixed` et reste
       donc visible sur TOUTE la page : la mettre en pause au scroll figerait le décor.
       Mais la lire pendant que le visiteur est sur un autre onglet ne sert à personne et
       consomme batterie et processeur — sur mobile, ça se sent. */
    document.addEventListener('visibilitychange', function () {
      if (mode === 'reduced') { return; }
      if (document.hidden) { video.pause(); }
      else if (mode === 'loop' || mode === 'wait') { play(); }
    });

    applyMode();
    onScroll();
  })();

  /* =========================================================
     PARTIE 2 — Territoire hexagonal
     Boucle réelle du jeu : habitude validée → PM → investis sur un
     hexagone de la FRONTIÈRE → il se révèle (coffre / parchemin /
     baies / relique / écho).
     ========================================================= */

  var goToCombat = null;   // renseigné par la partie 3 (embuscade → combat)

  /* ---------------------------------------------------------
     ANIMATION DE RAMASSAGE — mêmes frames que l'app
     (SpriteOverlay.tsx : 100 ms par frame, dernière frame tenue 150 ms).
     C'est L'ANIMATION qui annonce la récompense : un « +10 PE » écrit à sa
     place ne raconte pas le geste.
     --------------------------------------------------------- */

  var playSprite = null;   // renseigné juste en dessous

  (function initSprites() {
    var layer = byId('sprite-layer');
    var stage = byId('sprite-stage');
    if (!layer || !stage) { return; }

    var FRAME_MS = 100;
    var END_HOLD = 150;

    var SETS = {
      chest:  ['chest_grass1', 'chest_grass2', 'chest_grass3', 'chest_grass4', 'chest_grass5'],
      scroll: ['scroll_1', 'scroll_2', 'scroll_3', 'scroll_4', 'scroll_5'],
      eat:    ['eat_1', 'eat_2', 'eat_3', 'eat_4', 'eat_5', 'eat_6']
    };

    var src = function (name) { return 'assets/anim/' + name + '.png'; };

    // Décodage à l'avance : au clic, plus rien ne doit se télécharger.
    Object.keys(SETS).forEach(function (type) {
      SETS[type].forEach(function (n) { var im = new Image(); im.src = src(n); });
    });

    var built = {};      // type → tableau d'éléments <img> montés
    var busy = false;

    var build = function (type) {
      if (built[type]) { return built[type]; }
      var imgs = SETS[type].map(function (n) {
        var im = document.createElement('img');
        im.src = src(n);
        im.alt = '';
        return im;
      });
      built[type] = imgs;
      return imgs;
    };

    playSprite = function (type, done) {
      var frames = SETS[type] ? build(type) : null;
      if (!frames || busy) { if (done) { done(); } return; }
      busy = true;

      stage.innerHTML = '';
      frames.forEach(function (im) { im.classList.remove('is-on'); stage.appendChild(im); });
      layer.hidden = false;

      var i = 0;
      frames[0].classList.add('is-on');

      // Reduced-motion : on ne SUPPRIME pas l'animation (c'est elle qui explique ce
      // qui se passe), on la joue plus vite.
      var step = prefersReduced.matches ? 45 : FRAME_MS;

      var advance = function () {
        if (i >= frames.length - 1) {
          window.setTimeout(function () {
            layer.hidden = true;
            busy = false;
            if (done) { done(); }
          }, END_HOLD);
          return;
        }
        frames[i].classList.remove('is-on');
        i += 1;
        frames[i].classList.add('is-on');
        window.setTimeout(advance, step);
      };
      window.setTimeout(advance, step);
    };
  })();

  /* ---------------------------------------------------------
     Lecteur de PARCHEMIN — premier parchemin d'histoire du jeu
     (story_01 « L'Appel », texte identique à la base de données).
     Le parchemin ramassé sur la carte se LIT : sans ça, l'objet
     annonçait une histoire qu'il ne racontait jamais.
     --------------------------------------------------------- */

  var openStoryScroll = null;   // renseigné juste en dessous
  var playStorySplash = null;   // illustration tenue 2 s APRÈS la lecture (conclusion de la scène)

  /* Plan fixe sur la scène du parchemin : le récit s'achève, l'image s'installe, on la
     laisse 2 s, elle s'efface. C'est la dernière chose que le joueur voit du parchemin —
     l'illustration de ce qu'il vient de lire, jamais son affiche. */
  (function initStorySplash() {
    var splash = byId('story-splash');
    if (!splash) { return; }

    var HOLD_MS = 2000;
    var FADE_MS = 330;

    playStorySplash = function (done) {
      var hold = prefersReduced.matches ? 900 : HOLD_MS;
      splash.hidden = false;
      // La classe doit arriver au tour de rendu SUIVANT, sinon le fondu ne joue pas.
      window.requestAnimationFrame(function () { splash.classList.add('is-on'); });
      window.setTimeout(function () {
        splash.classList.remove('is-on');
        window.setTimeout(function () {
          splash.hidden = true;
          if (done) { done(); }
        }, FADE_MS);
      }, hold + FADE_MS);
    };
  })();

  (function initStoryScroll() {
    var layer = byId('scroll-layer');
    if (!layer) { return; }

    var SCENES = [
      { type: 'narration', text: 'Dans la **Forêt des Illusions**, un vieux sanctuaire que plus personne n\'approchait depuis quatre ans.' },
      { type: 'dialogue', name: 'Kaen', text: '« Quelque chose m\'**appelle** ici. Je le sens depuis des jours. »' },
      { type: 'narration', text: 'Au centre, posée sur la pierre, une **lame** courte. Rien d\'autre.' },
      { type: 'dialogue', name: 'Kaen', text: '« Elle vibre quand j\'approche la **main**. »' },
      { type: 'narration', text: 'Il la saisit. Une colonne de **lumière** monta de la lame et perça le ciel.' }
    ];

    var elText    = byId('scroll-text');
    var elPortCol = byId('scroll-portrait-col');
    var elSpeaker = byId('scroll-speaker');
    var elDots    = byId('scroll-dots');
    var btnNext   = byId('scroll-next');
    var btnClose  = byId('scroll-close');
    var scrim     = byId('scroll-scrim');

    var step = 0;
    var onClosed = null;

    /* `**mot**` → gras rouge. On échappe AVANT de poser le balisage : le texte
       vient de la base, il n'a jamais à pouvoir injecter du HTML. */
    var rich = function (raw) {
      var safe = raw
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return safe.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    };

    var render = function () {
      var scene = SCENES[step];
      var isDialogue = scene.type === 'dialogue';

      elPortCol.hidden = !isDialogue;
      if (isDialogue) { elSpeaker.textContent = scene.name.toUpperCase(); }

      elText.innerHTML = rich(scene.text);
      elText.classList.remove('is-new');
      void elText.offsetWidth;
      elText.classList.add('is-new');

      elDots.innerHTML = '';
      SCENES.forEach(function (_, i) {
        var dot = document.createElement('i');
        if (i === step) { dot.className = 'is-on'; }
        elDots.appendChild(dot);
      });

      btnNext.textContent = step < SCENES.length - 1 ? 'Suivant' : 'Fermer';
    };

    var close = function () {
      layer.hidden = true;
      document.removeEventListener('keydown', onKey);
      var cb = onClosed;
      onClosed = null;
      if (cb) { cb(); }
    };

    var onKey = function (e) { if (e.key === 'Escape') { close(); } };

    var advance = function () {
      if (step < SCENES.length - 1) { step += 1; render(); return; }
      close();
    };

    btnNext.addEventListener('click', advance);
    btnClose.addEventListener('click', close);
    scrim.addEventListener('click', close);

    openStoryScroll = function (done) {
      step = 0;
      onClosed = done || null;
      render();
      layer.hidden = false;
      document.addEventListener('keydown', onKey);
      btnNext.focus();
    };
  })();

  (function initTerritory() {
    var map = byId('terr-map');
    if (!map) { return; }

    // Rayon 1 = 7 hexagones (centre + 6). Assez petit pour se lire d'un coup d'œil, et
    // CHAQUE case révélable porte un contenu → aucune découverte à vide dans la démo.
    var RADIUS   = 1;
    var COST     = 3;    // PM par hexagone
    var HABIT_PM = 3;    // PM gagnés par habitude validée

    var elPm     = byId('terr-pm');
    var elPe     = byId('terr-pe');
    var elPv     = byId('terr-pv');
    var elOwned  = byId('terr-owned');
    var elHint   = byId('terr-hint');
    var elTip    = byId('terr-tip');
    var elLog    = byId('terr-log');
    var elBurst  = byId('terr-burst');
    var btnHabit = byId('terr-habit');
    var btnFight = byId('terr-tocombat');
    var ambush   = byId('terr-ambush');

    var CONTENT = {
      '1,-1':  { kind: 'chest',   img: 'assets/game/chest.png',   label: 'Coffre',    reward: '+15 PE', apply: function (s) { s.pe += 15; },
                 say:  'Un coffre ! +15 PE — de quoi débloquer une nouvelle habitude.',
                 line: 'Un <b>coffre</b> : +15 PE. Les PE débloquent de nouvelles habitudes.' },
      '-1,0':  { kind: 'berries', img: 'assets/game/berries.png', label: 'Baies',     reward: '+2 PV',  apply: function (s) { s.pv = Math.min(5, s.pv + 2); },
                 say:  'Des baies. +2 PV — je reprends des forces.',
                 line: 'Des <b>baies</b> : +2 PV. On les récolte une fois par jour.' },
      '0,1':   { kind: 'scroll',  img: 'assets/game/scroll.png',  label: 'Parchemin', reward: 'Histoire', apply: function () {},
                 say:  'Un parchemin… un morceau de l\'histoire de ce monde me revient.',
                 line: 'Un <b>parchemin</b> : un morceau de l\'histoire de Shinkatô se dévoile.' },
      '0,-1':  { kind: 'relic',   img: 'assets/tanto_03.png',     label: 'Relique',   reward: 'Tantô',  apply: function () {},
                 say:  'Un éclat de lame. Mon tantô sera plus tranchant.',
                 line: 'Une <b>relique</b> : un éclat de lame pour forger ton tantô.' },
      '1,0':   { kind: 'chest',   img: 'assets/game/chest.png',   label: 'Coffre',    reward: '+10 PE', apply: function (s) { s.pe += 10; },
                 say:  'Encore un coffre. +10 PE.',
                 line: 'Encore un <b>coffre</b> : +10 PE.' },
      '-1,1':  { kind: 'echo',    img: 'assets/game/echo.png',    label: 'Écho',      reward: null,     apply: function () {},
                 say:  'C\'était donc ça, cette énergie… Il était là depuis le début.',
                 line: 'Un <b>Écho</b> se terrait ici. Il ne se ramasse pas : il attaque.' }
    };

    var state = { pm: 9, pe: 0, pv: 3, owned: 1, echoTriggered: false };
    var paid = {};                       // clé → PM déjà déposés
    var revealed = { '0,0': true };      // clé → révélée
    var cells = {};                      // clé → élément DOM

    var key = function (q, r) { return q + ',' + r; };
    var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

    var isRevealed = function (q, r) { return revealed[key(q, r)] === true; };

    /* Frontière = case NON révélée touchant au moins une case révélée */
    var isFrontier = function (q, r) {
      if (isRevealed(q, r)) { return false; }
      for (var i = 0; i < DIRS.length; i++) {
        if (isRevealed(q + DIRS[i][0], r + DIRS[i][1])) { return true; }
      }
      return false;
    };

    /* Le personnage PARLE : c'est le dialogue qui guide, pas une légende sous la carte. */
    var say = function (text) {
      elHint.textContent = text;
      elHint.classList.remove('is-new');
      void elHint.offsetWidth;
      elHint.classList.add('is-new');
    };

    /* Récompense annoncée EN GRAND au milieu de la carte (un « +3 PM » discret passait
       inaperçu : le joueur ne faisait pas le lien entre l'habitude et sa force). */
    var burst = function (text) {
      elBurst.innerHTML = '';
      var span = document.createElement('span');
      span.textContent = text;
      elBurst.appendChild(span);
      elBurst.hidden = false;
      window.setTimeout(function () { elBurst.hidden = true; elBurst.innerHTML = ''; }, 1300);
    };

    var log = function (html) {
      var p = document.createElement('p');
      p.innerHTML = html;
      elLog.appendChild(p);
      while (elLog.children.length > 4) { elLog.removeChild(elLog.firstChild); }
    };

    var refreshHud = function () {
      elPm.textContent = String(state.pm);
      elPe.textContent = String(state.pe);
      elPv.textContent = String(state.pv);
      elOwned.textContent = String(state.owned);
    };

    /* CONSIGNE — le dialogue fait parler le personnage, la consigne dit quoi faire.
       Trois états, et un seul endroit qui en décide : on peut cliquer / on n'a plus
       de PM (→ le bouton d'habitude est la sortie) / la carte est dégagée. */
    var TIP_PLAY  = 'Clique sur une case pour la révéler.';
    var TIP_NO_PM = 'Plus de PM — valide une habitude ci-dessous pour en récolter.';
    var TIP_DONE  = 'Territoire dégagé. L\'écho, lui, ne se ramasse pas : il s\'affronte.';

    var refreshTip = function () {
      if (!elTip) { return; }
      var frontierLeft = Object.keys(cells).some(function (k) {
        var cell = cells[k];
        return isFrontier(Number(cell.dataset.q), Number(cell.dataset.r));
      });
      var dry = frontierLeft && state.pm <= 0;
      elTip.textContent = !frontierLeft ? TIP_DONE : (dry ? TIP_NO_PM : TIP_PLAY);
      elTip.classList.toggle('is-warn', dry);
      btnHabit.classList.toggle('is-nudge', dry);
    };

    /* Un seul endroit décide de l'apparence d'une case : évite qu'un état
       (frontière / verrouillée / conquise) survive à un changement de carte. */
    var refreshCells = function () {
      Object.keys(cells).forEach(function (k) {
        var cell = cells[k];
        var q = Number(cell.dataset.q), r = Number(cell.dataset.r);
        var owned = isRevealed(q, r);
        var front = isFrontier(q, r);
        cell.classList.toggle('is-owned', owned);
        cell.classList.toggle('is-frontier', front);
        cell.classList.toggle('is-locked', !owned && !front);
        cell.disabled = !front;
        var tile = cell.querySelector('img.terr-tile');
        if (tile) { tile.src = owned ? 'assets/game/hex_grass.png' : 'assets/game/hex_locked.png'; }
        var cost = cell.querySelector('.terr-cost');
        if (cost) {
          var left = COST - (paid[k] || 0);
          cost.textContent = front ? left + ' PM' : '';
          cost.style.display = front ? '' : 'none';
        }
        cell.setAttribute('aria-label', owned
          ? 'Hexagone conquis'
          : (front ? 'Investir ' + (COST - (paid[k] || 0)) + ' PM pour révéler cet hexagone' : 'Hors de portée'));
      });
      refreshTip();
    };

    var runAmbush = function () {
      ambush.hidden = false;
      window.setTimeout(function () {
        ambush.hidden = true;
        say('Il me barre la route. Ici, on ne frappe pas d\'abord : on lui répond.');
        btnFight.hidden = false;
        if (goToCombat) { goToCombat(); }
      }, prefersReduced.matches ? 300 : 1400);
    };

    /* Rythme des petites mises en scène (ouverture, morsure…). En reduced-motion,
       on ne supprime pas l'étape — on la raccourcit : le joueur doit quand même
       voir le coffre s'ouvrir, sinon la récompense sort de nulle part. */
    var pace = function (ms) { return prefersReduced.matches ? 160 : ms; };

    var reveal = function (cell, q, r) {
      var k = key(q, r);
      revealed[k] = true;
      state.owned += 1;
      var def = CONTENT[k];

      if (!def) {
        log('Terre gagnée sur l\'ombre. Rien ici — mais la carte s\'ouvre.');
        say('Terrain repris à l\'ombre. La carte s\'ouvre un peu plus.');
        refreshHud();
        refreshCells();
        return;
      }

      var icon = document.createElement('img');
      icon.className = 'terr-content';
      icon.src = def.img;
      icon.alt = def.label;
      cell.appendChild(icon);
      // La classe arrive au tour de rendu suivant → la transition d'apparition joue.
      window.requestAnimationFrame(function () { cell.classList.add('has-content'); });
      log(def.line);

      /* La récompense tombe AU MOMENT du geste (coffre ouvert, baies croquées) —
         pas à l'instant où la case se révèle : c'est le geste qui la justifie.
         ⚠️ Plus de `burst()` ici : le « +10 PE » géant PRENAIT LA PLACE de
         l'animation. C'est l'animation qui annonce le gain ; le chiffre ne fait
         que le confirmer, en petit, au-dessus de la case. */
      var grant = function () {
        def.apply(state);
        if (def.reward) { floatReward(cell, def.reward); }
        refreshHud();
        refreshCells();
      };

      /* L'objet RAMASSÉ quitte la case (il est dans le sac, plus sur la carte). */
      var take = function () {
        icon.classList.add('is-taken');
        window.setTimeout(function () {
          icon.remove();
          cell.classList.remove('has-content');
        }, 420);
      };

      /* Objet ramassable : on le voit apparaître, l'animation joue, puis il
         disparaît de la case. Le `done` optionnel s'exécute à la toute fin. */
      var collectWith = function (sprite, done) {
        window.setTimeout(function () {
          var after = function () {
            grant();
            take();
            if (done) { done(); } else { say(def.say); }
          };
          if (sprite && playSprite) { playSprite(sprite, after); } else { after(); }
        }, pace(380));
      };

      if (def.kind === 'chest') {
        collectWith('chest');                      // le coffre s'ouvre

      } else if (def.kind === 'berries') {
        collectWith('eat');                        // on les mange

      } else if (def.kind === 'relic') {
        collectWith(null);                         // pas d'anim dédiée (comme dans l'app)

      } else if (def.kind === 'scroll') {
        // Le parchemin se ramasse → il se LIT → et SEULEMENT ENSUITE la scène s'affiche.
        //
        // ⚠️ Ordre inversé le 2026-08-16. L'illustration passait AVANT la lecture : on
        // voyait Kaen saisir la lame et percer le ciel — la chute du récit — avant d'avoir
        // lu la moindre ligne. Le texte se terminait donc sur une image déjà brûlée.
        // L'illustration est la CONCLUSION de la scène, pas son affiche.
        collectWith('scroll', function () {
          var splashThenSay = function () {
            if (playStorySplash) { playStorySplash(function () { say(def.say); }); }
            else { say(def.say); }
          };
          if (openStoryScroll) { openStoryScroll(splashThenSay); }
          else { splashThenSay(); }
        });

      } else if (def.kind === 'echo' && !state.echoTriggered) {
        // L'Écho, lui, NE se ramasse pas : il reste sur la case et il attaque.
        state.echoTriggered = true;
        grant();
        runAmbush();

      } else {
        grant();
        say(def.say);
      }
    };

    var invest = function (cell, q, r) {
      var k = key(q, r);
      if (!isFrontier(q, r)) { return; }
      if (state.pm <= 0) {
        say('Je n\'ai plus de force. Il faut que je tienne une habitude — dans la vraie vie.');
        refreshTip();
        return;
      }
      var left = COST - (paid[k] || 0);
      var spend = Math.min(state.pm, left);
      state.pm -= spend;
      paid[k] = (paid[k] || 0) + spend;
      floatReward(cell, '−' + spend + ' PM');

      if (paid[k] >= COST) {
        reveal(cell, q, r);
      } else {
        say('J\'y ai mis ce que j\'avais. Il manque encore ' + (COST - paid[k]) + ' PM pour percer cette ombre.');
        refreshHud();
        refreshCells();
      }
    };

    /* --- Construction du nid d'abeilles (hexagone axial de rayon 2) --- */
    for (var r = -RADIUS; r <= RADIUS; r++) {
      var row = document.createElement('div');
      row.className = 'terr-row';
      var qMin = Math.max(-RADIUS, -RADIUS - r);
      var qMax = Math.min(RADIUS, RADIUS - r);
      for (var q = qMin; q <= qMax; q++) {
        (function (q, r) {
          var cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'terr-hex';
          cell.dataset.q = String(q);
          cell.dataset.r = String(r);

          var tile = document.createElement('img');
          tile.className = 'terr-tile';
          tile.alt = '';
          tile.src = 'assets/game/hex_locked.png';
          cell.appendChild(tile);

          var cost = document.createElement('span');
          cost.className = 'terr-cost';
          cell.appendChild(cost);

          cell.addEventListener('click', function () { invest(cell, q, r); });
          cells[key(q, r)] = cell;
          row.appendChild(cell);
        })(q, r);
      }
      map.appendChild(row);
    }

    btnHabit.addEventListener('click', function () {
      state.pm += HABIT_PM;
      refreshHud();
      refreshTip();
      burst('+' + HABIT_PM + ' PM');
      log('Habitude validée dans la vraie vie : <b>+' + HABIT_PM + ' PM</b>.');
      say('Tenue. Cette habitude m\'a renforcé de ' + HABIT_PM + ' PM — assez pour arracher du terrain à l\'ombre.');
    });

    refreshHud();
    refreshCells();
  })();

  /* =========================================================
     PARTIE 3 — Combat « battle de phrases » : TAMERAI
     Contenu identique à la base du jeu (obstacle `peur_lancer`).
     ========================================================= */

  (function initFight() {
    var root = byId('fight');
    if (!root) { return; }

    /* --- Données réelles du jeu (combat_obstacles / obstacle_phrase_pools) --- */
    var POOLS = [
      {
        attack: 'Et si tu échoues ? Tu perdras tout, et tout le monde le verra.',
        responses: [
          { q: 'good',   text: 'Si j\'échoue, j\'apprends. On grandit ainsi.' },
          { q: 'medium', text: 'On verra bien. Je tenterai peut-être ma chance.' },
          { q: 'dodge',  text: 'Je n\'imagine pas la chute avant d\'avoir fait un pas.' }
        ]
      },
      {
        attack: 'À quoi bon commencer ? Les gens comme toi ne se lancent pas.',
        responses: [
          { q: 'good',   text: 'Je me lance : c\'est ma voie, pas la leur.' },
          { q: 'medium', text: 'Peut-être, mais j\'ai quand même envie d\'essayer.' },
          { q: 'dodge',  text: 'Je n\'écoute pas cette voix aujourd\'hui.' }
        ]
      },
      {
        attack: 'Tu n\'as jamais rien mené au bout. Pourquoi ce serait différent ?',
        responses: [
          { q: 'good',   text: 'Chaque habitude tenue prouve que je finis.' },
          { q: 'medium', text: 'C\'était avant. Je peux changer, non ?' },
          { q: 'dodge',  text: 'Ce refrain est usé. Je passe.' }
        ]
      },
      {
        attack: 'Sois honnête : tu n\'as pas l\'étoffe pour ça.',
        responses: [
          { q: 'good',   text: 'Débutant, pas incapable. J\'apprends.' },
          { q: 'medium', text: 'J\'en sais rien… mais je ne suis pas si nul.' },
          { q: 'dodge',  text: 'Cette phrase ne mérite pas ma réponse.' }
        ]
      }
    ];

    // Phrases positives du finisher — FINISHER_LINES de phraseCombatLogic.ts
    var FINISHER_LINES = [
      'Je n\'abandonnerai jamais.',
      'Chaque jour, je me renforce.',
      'Tu ne me définis plus.',
      'J\'avance, envers et contre tout.',
      'C\'est MOI qui choisis mon chemin.',
      'Je suis plus fort qu\'hier.',
      'Mon pourquoi est plus grand que ma peur.',
      'Je ne me compare qu\'à celui que j\'étais.'
    ];

    var QPOP = {
      good:   'assets/fight/bulle_parfait.png',   // PARFAIT
      medium: 'assets/fight/bulle_bon.png',       // BON
      dodge:  'assets/fight/bulle_reessaye.png'   // RÉESSAYE
    };

    /* ── RÈGLES DU COMBAT — recopiées de phraseCombatLogic.ts ─────────────
       Le site jouait ses propres chiffres (jauge en %, +34 / +24 / +14, deuxième
       phase déclenchée après 4 phrases QUOI QU'IL ARRIVE). Résultat : une barre
       jamais pleine et un finisher qui partait tout seul. Le modèle du jeu est
       une jauge de 5 POINTS, et elle seule ouvre le finisher.

         parfait  (good)   → +3 jauge ·  0 PV perdu
         bon      (medium) → +2 jauge · −1 PV
         réessaye (dodge)  →  0 jauge · −2 PV

       Jauge à 5/5 → finisher. PV à 0 → défaite. */
    var GAUGE_MAX  = 5;
    var GAUGE_GAIN = { good: 3, medium: 2, dodge: 0 };
    var HP_LOSS    = { good: 0, medium: 1, dodge: 2 };

    // Jauge de charge : une COULEUR par bande de 100 % (comme CHARGE_BAND_COLORS de l'app)
    var BAND_COLORS = ['#f2cd0f', '#12b6e6', '#e81f8c', '#35c14a', '#f5731b', '#9b4dff'];

    /* Finisher — valeurs de l'app pour un écho de territoire du 1er anneau :
       combatBalance.ts → PV = 18 + 8 × anneau = 26 ; PhraseCombatModal.tsx →
       6 taps pour une attaque, 11 s d'assaut, 5 dégâts par attaque (build de base).
       Le temps NE dépend PAS de la Libération : il est le même pour tous. */
    var MAX_HEARTS      = 5;       // PV du joueur, comme dans l'app
    var TAPS_PER_ATTACK = 6;
    var ECHO_HP         = 26;
    var HIT_DAMAGE      = 5;
    var FINISHER_MS     = 11000;

    /* --- Éléments --- */
    var scrIntro   = byId('fight-intro');
    var scrArena   = byId('fight-arena');
    var scrVictory = byId('fight-victory');
    var scrFailed  = byId('fight-failed');

    var elAttack   = byId('fight-attack');
    var elBubble   = byId('fight-bubble');
    var elAnswers  = byId('fight-answers');
    var elHearts   = byId('fight-hearts');
    var elEcho     = byId('fight-echo');
    var elEchoImg  = byId('fight-echo-img');
    var elEchoFl   = byId('fight-echo-flash');
    var elHero     = byId('fight-hero');
    var elHeroImg  = byId('fight-hero-img');
    var elSlash    = byId('fight-slash');
    var elQpop     = byId('fight-qpop');
    var elLiberFil = byId('fight-liber-fill');
    var elLiberPct = byId('fight-liber-pct');
    var elFin      = byId('fight-finisher');
    var elFinCall  = byId('fight-fin-callout');
    var elFinLine  = byId('fight-fin-line');
    var elTimeFill = byId('fight-time-fill');
    var elChgFill  = byId('fight-charge-fill');
    var elChgPct   = byId('fight-charge-pct');
    var btnAttack  = byId('fight-attack-btn');
    var elScene    = byId('fight-scene');

    /* --- Sprites animés (frames extraites de l'app) --- */
    var echoFrames = [];
    for (var i = 1; i <= 13; i++) { echoFrames.push('assets/fight/echo_' + (i < 10 ? '0' : '') + i + '.webp'); }
    var heroFrames = [];
    for (var j = 1; j <= 8; j++) { heroFrames.push('assets/fight/hero_' + (j < 10 ? '0' : '') + j + '.webp'); }
    echoFrames.concat(heroFrames).forEach(function (src) { var im = new Image(); im.src = src; });

    var timers = [];
    var later = function (fn, ms) { var t = window.setTimeout(fn, ms); timers.push(t); return t; };
    var clearTimers = function () { timers.forEach(clearTimeout); timers = []; };

    var loops = [];
    var startLoop = function (img, frames, ms) {
      var k = 0;
      var id = window.setInterval(function () {
        k = (k + 1) % frames.length;
        img.src = frames[k];
      }, ms);
      loops.push(id);
      return id;
    };
    var stopLoops = function () { loops.forEach(clearInterval); loops = []; };

    /* --- État --- */
    var st = null;

    var resetState = function () {
      st = {
        poolIdx: 0,
        lastPoolIdx: -1,
        hearts: MAX_HEARTS,
        gauge: 0,
        locked: false,
        finHp: ECHO_HP,
        taps: 0,
        tierShown: -1,
        finDone: false,
        finRaf: null,
        finEnd: 0
      };
    };

    /* Chaque bascule d'écran RECADRE la carte de combat : sans ça, le bouton ATTAQUER
       (finisher) ou l'étoile d'XP (victoire) tombent sous la ligne de flottaison — le
       joueur ne voit pas le moment fort.
       ⚠️ Pas de `scrollIntoView({block:'center'})` : le bandeau de navigation est
       COLLANT (sticky) et recouvre donc le haut de la fenêtre de combat. On vise le
       haut de la carte, moins la hauteur RÉELLE du bandeau (elle change quand il
       passe sur deux lignes), moins 16 px d'air. */
    var HEADER_GAP = 16;

    var frameFight = function () {
      var nav  = document.querySelector('.nav');
      var navH = nav ? nav.getBoundingClientRect().height : 0;
      var top  = window.scrollY + root.getBoundingClientRect().top - navH - HEADER_GAP;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: prefersReduced.matches ? 'auto' : 'smooth',
      });
    };

    var show = function (screen) {
      [scrIntro, scrArena, scrVictory, scrFailed].forEach(function (s) { s.hidden = s !== screen; });
      frameFight();
    };

    var renderHearts = function () {
      elHearts.innerHTML = '';
      for (var h = 0; h < MAX_HEARTS; h++) {
        var im = document.createElement('img');
        im.src = 'assets/game/pv.png';
        im.alt = '';
        if (h >= st.hearts) { im.className = 'is-lost'; }
        elHearts.appendChild(im);
      }
    };

    /* La jauge se compte en POINTS (0 → 5), comme dans le jeu. On l'affiche en
       « 3 / 5 » : un pourcentage laissait croire à un remplissage continu alors
       que chaque riposte vaut un nombre de points fixe. */
    var setGauge = function (v) {
      st.gauge = Math.max(0, Math.min(GAUGE_MAX, v));
      elLiberFil.style.width = (st.gauge / GAUGE_MAX * 100) + '%';
      elLiberPct.textContent = st.gauge + ' / ' + GAUGE_MAX;
    };

    var hitEcho = function () {
      elEcho.classList.remove('is-hit');
      void elEcho.offsetWidth;            // relance l'animation même en rafale
      elEcho.classList.add('is-hit');
      elSlash.hidden = false;
      later(function () { elSlash.hidden = true; }, 340);
    };

    var popQuality = function (quality) {
      elQpop.src = QPOP[quality] || QPOP.dodge;
      elQpop.hidden = false;
      void elQpop.offsetWidth;
      elQpop.style.animation = 'none';
      void elQpop.offsetWidth;
      elQpop.style.animation = '';
      later(function () { elQpop.hidden = true; }, 1100);
    };

    var hurtHero = function () {
      st.hearts -= 1;
      renderHearts();
      elHero.classList.remove('is-hurt');
      void elHero.offsetWidth;
      elHero.classList.add('is-hurt');
    };

    /* --- Phase 1 : duel de phrases --- */

    var shuffle = function (arr) {
      var a = arr.slice();
      for (var k = a.length - 1; k > 0; k--) {
        var m = Math.floor(Math.random() * (k + 1));
        var tmp = a[k]; a[k] = a[m]; a[m] = tmp;
      }
      return a;
    };

    /* Pool suivant : TIRÉ AU SORT, jamais deux fois le même d'affilée (pickNextPool
       de phraseCombatLogic.ts). Le duel dure tant que la jauge n'est pas pleine —
       il n'y a pas un nombre de phrases fixé d'avance. */
    var pickNextPool = function () {
      var n = POOLS.length;
      var idx = Math.floor(Math.random() * n);
      if (n > 1 && idx === st.lastPoolIdx) { idx = (idx + 1) % n; }
      st.poolIdx = idx;
      st.lastPoolIdx = idx;
    };

    var renderPool = function () {
      var pool = POOLS[st.poolIdx];
      elAttack.textContent = '« ' + pool.attack + ' »';
      elBubble.classList.remove('is-new');
      void elBubble.offsetWidth;
      elBubble.classList.add('is-new');

      elAnswers.innerHTML = '';
      shuffle(pool.responses).forEach(function (resp) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'answer-btn';
        b.textContent = resp.text;
        b.addEventListener('click', function () { answer(resp, b); });
        elAnswers.appendChild(b);
      });
      st.locked = false;
    };

    var answer = function (resp, btn) {
      if (st.locked) { return; }
      st.locked = true;
      Array.prototype.forEach.call(elAnswers.children, function (b) { b.disabled = true; });
      btn.style.borderLeftColor = resp.q === 'good' ? '#f2cd0f' : (resp.q === 'medium' ? '#c4a80c' : '#ad1919');

      hitEcho();
      popQuality(resp.q);
      setGauge(st.gauge + GAUGE_GAIN[resp.q]);

      // L'écho riposte selon la qualité : parfait 0 PV, bon −1 PV, réessaye −2 PV.
      var loss = HP_LOSS[resp.q];
      for (var d = 0; d < loss; d++) { later(hurtHero, 340 + d * 220); }

      later(function () {
        // Ordre de résolution du jeu (`resolveAnswer`) : la jauge pleine l'emporte sur
        // les PV à 0 — la riposte qui libère compte, même si elle coûte le dernier cœur.
        if (st.gauge >= GAUGE_MAX) { startFinisher(); return; }
        if (st.hearts <= 0) { endFailed(); return; }
        pickNextPool();
        renderPool();
      }, 1150);
    };

    /* --- Phase 2 : finisher (martèlement) --- */

    var showFinLine = function (tier) {
      st.tierShown = tier;
      elFinLine.textContent = '« ' + FINISHER_LINES[tier % FINISHER_LINES.length] + ' »';
      elFinLine.classList.remove('is-new');
      void elFinLine.offsetWidth;
      elFinLine.classList.add('is-new');
    };

    var startFinisher = function () {
      elAnswers.hidden = true;
      elFin.hidden = false;
      elAttack.textContent = '« Non… reste où tu es ! »';
      elBubble.classList.remove('is-new');
      void elBubble.offsetWidth;
      elBubble.classList.add('is-new');

      st.finHp = ECHO_HP;
      st.taps = 0;
      st.finDone = false;
      elChgFill.style.width = '0%';
      elChgFill.style.background = BAND_COLORS[0];
      elChgPct.textContent = '0 %';
      elChgPct.style.color = BAND_COLORS[0];
      showFinLine(0);

      // Durée d'assaut FIXE (11 s), comme dans l'app : la difficulté du finisher vient
      // des PV de l'écho et de la cadence de martèlement, pas d'un bonus de jauge.
      var total = FINISHER_MS;
      st.finEnd = Date.now() + total;

      var tickTime = function () {
        if (st.finDone) { return; }
        var left = st.finEnd - Date.now();
        var pct = Math.max(0, Math.min(1, left / total));
        elTimeFill.style.width = (pct * 100).toFixed(1) + '%';
        if (left <= 0) { endFailed(); return; }
        st.finRaf = window.requestAnimationFrame(tickTime);
      };
      tickTime();
    };

    var tapAttack = function () {
      if (st.finDone) { return; }
      st.taps += 1;

      var pctInBand = ((st.taps % TAPS_PER_ATTACK) || TAPS_PER_ATTACK) / TAPS_PER_ATTACK;
      var band = Math.floor((st.taps - 1) / TAPS_PER_ATTACK) % BAND_COLORS.length;
      var cumul = Math.round((st.taps / TAPS_PER_ATTACK) * 100);
      elChgFill.style.width = (pctInBand * 100) + '%';
      elChgFill.style.background = BAND_COLORS[band];
      elChgPct.textContent = cumul + ' %';
      elChgPct.style.color = BAND_COLORS[band];

      // Une attaque part seulement quand la jauge atteint 100 % (tous les TAPS_PER_ATTACK coups).
      if (st.taps % TAPS_PER_ATTACK !== 0) { return; }

      hitEcho();
      root.classList.remove('is-bam');
      void root.offsetWidth;
      root.classList.add('is-bam');

      st.finHp = Math.max(0, st.finHp - HIT_DAMAGE);
      var done = ECHO_HP - st.finHp;

      // Dégâts DE CE COUP (pas le cumul) — c'est ce que l'app affiche.
      var star = document.createElement('span');
      star.className = 'dmg-star';
      star.textContent = '−' + HIT_DAMAGE;
      elScene.appendChild(star);
      later(function () { star.remove(); }, 700);

      var tier = Math.min(2, Math.floor((done / ECHO_HP) * 3));
      if (tier > st.tierShown) { showFinLine(tier); }

      if (st.finHp <= 0) { endVictory(); }
    };

    /* --- Fins --- */

    var stopFinisher = function () {
      st.finDone = true;
      if (st.finRaf) { window.cancelAnimationFrame(st.finRaf); st.finRaf = null; }
    };

    var endVictory = function () {
      stopFinisher();
      elEcho.classList.add('is-down');
      elEchoImg.src = 'assets/game/defeated.png';
      elEchoFl.src = 'assets/game/defeated.png';
      later(function () { stopLoops(); show(scrVictory); }, 900);
    };

    var endFailed = function () {
      stopFinisher();
      clearTimers();
      stopLoops();
      show(scrFailed);
    };

    /* --- Démarrage / reprise --- */

    var startFight = function () {
      clearTimers();
      stopLoops();
      resetState();
      renderHearts();
      setGauge(0);
      elAnswers.hidden = false;
      elFin.hidden = true;
      elEcho.classList.remove('is-down');
      elEchoImg.src = echoFrames[0];
      elEchoFl.src = echoFrames[0];
      elHeroImg.src = heroFrames[0];
      // Cadences de l'app : écho 417 ms/frame (vidéo 24 fps décimée), héros 110 ms.
      startLoop(elEchoImg, echoFrames, 417);
      startLoop(elHeroImg, heroFrames, 110);
      show(scrArena);
      pickNextPool();
      renderPool();
    };

    var backToIntro = function () {
      clearTimers();
      stopLoops();
      show(scrIntro);
    };

    /* « Affronter l'écho » (carte du territoire) : le saut d'ancre natif poserait le
       haut de la section SOUS le bandeau collant. On fait la descente nous-mêmes,
       avec le même cadrage que les autres bascules. Le `href` reste en repli sans JS. */
    var toCombat = byId('terr-tocombat');
    if (toCombat) {
      toCombat.addEventListener('click', function (e) { e.preventDefault(); show(scrIntro); });
    }

    byId('fight-start').addEventListener('click', startFight);
    byId('fight-retry').addEventListener('click', startFight);
    byId('fight-replay').addEventListener('click', backToIntro);
    btnAttack.addEventListener('click', tapAttack);

    resetState();

    /* L'embuscade du territoire amène ici : on descend sur la fiche du boss. */
    goToCombat = function () { show(scrIntro); };   // show() recentre déjà la carte
  })();

  /* =========================================================
     PARTIE 4 — Révélations au scroll
     ========================================================= */

  var revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealables.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealables.forEach(function (el) { observer.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('visible'); });
  }

  /* =========================================================
     PARTIE 5 — Menu replié (téléphone)

     La barre collante occupait 122 px sur téléphone parce que les quatre liens
     passaient à la ligne. Ils vivent maintenant dans un panneau qu'on ouvre.

     Ce que ce bloc doit garantir, au-delà de l'ouverture :
       • `aria-expanded` suit l'état réel — c'est la seule chose qu'un lecteur
         d'écran entend ;
       • le menu se referme après un clic sur un lien, sinon il masque la section
         vers laquelle on vient de sauter ;
       • Échap referme et rend le focus au bouton, sinon le clavier reste piégé ;
       • un retour en grand écran referme aussi : le panneau n'existe plus en CSS
         au-delà de 860 px, un état « ouvert » oublié rouvrirait au redimensionnement.
     ========================================================= */

  var burger = document.getElementById('nav-burger');
  var menu = document.getElementById('nav-menu');

  if (burger && menu) {
    var basculerMenu = function (ouvrir) {
      menu.classList.toggle('is-open', ouvrir);
      burger.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
      burger.setAttribute('aria-label', ouvrir ? 'Fermer le menu' : 'Ouvrir le menu');
    };

    var menuOuvert = function () { return menu.classList.contains('is-open'); };

    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      basculerMenu(!menuOuvert());
    });

    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') basculerMenu(false);
    });

    document.addEventListener('click', function (e) {
      if (menuOuvert() && !menu.contains(e.target) && !burger.contains(e.target)) {
        basculerMenu(false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOuvert()) { basculerMenu(false); burger.focus(); }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && menuOuvert()) basculerMenu(false);
    });
  }
})();
