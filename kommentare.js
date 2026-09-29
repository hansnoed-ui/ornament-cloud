/*
  Rückmeldungen auf der Startseite: Kommentare über giscus (https://giscus.app)
  ------------------------------------------------------------------------------
  Die Kommentare liegen als GitHub-Discussion in diesem Repository und erscheinen ohne Prüfung.
  Löschen oder sperren: auf GitHub unter Discussions. Alle Kommentare der Startseite stehen in
  einer Discussion (TERM). Das Skript von giscus.app wird erst geladen, wenn der Abschnitt in die
  Nähe des Bildschirms kommt; solange CATEGORY_ID leer ist, bleibt es ganz aus.

  Einrichten (einmalig): Discussions im Repository einschalten, die giscus-App installieren
  (https://github.com/apps/giscus), auf https://giscus.app die Kategorie wählen und die dort
  angezeigte data-category-id hier eintragen.
*/
(function () {
  'use strict';
  var REPO = 'hansnoed-ui/ornament-cloud';
  var REPO_ID = 'R_kgDOUqqcJQ';
  var CATEGORY = 'Announcements';
  var CATEGORY_ID = '';
  var TERM = 'Startseite: Rückmeldungen';

  var box = document.getElementById('kommentare');
  if (!box || !CATEGORY_ID) return;
  var hinweis = box.parentNode.querySelector('.kommentare-hinweis');
  if (hinweis) hinweis.hidden = false;

  function laden() {
    var s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    var d = {
      repo: REPO, repoId: REPO_ID, category: CATEGORY, categoryId: CATEGORY_ID,
      mapping: 'specific', term: TERM, strict: '1', reactionsEnabled: '0', emitMetadata: '0',
      inputPosition: 'top', theme: 'preferred_color_scheme', lang: 'de', loading: 'lazy'
    };
    // data-repo-id usw.: giscus liest die Einstellungen aus den data-Attributen des Skripts
    Object.keys(d).forEach(function (k) {
      s.setAttribute('data-' + k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }), d[k]);
    });
    box.classList.add('giscus');
    box.appendChild(s);
  }

  if (!('IntersectionObserver' in window)) return laden();
  var io = new IntersectionObserver(function (e) {
    if (e[0].isIntersecting) { io.disconnect(); laden(); }
  }, { rootMargin: '600px 0px' });
  io.observe(box);
})();
