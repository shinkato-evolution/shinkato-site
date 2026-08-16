/* ============================================================
   FORMULAIRES DE CONTACT — envoi direct vers Supabase

   Pourquoi pas un service de formulaire tiers (FormSubmit & co) :
   testé le 16/08/2026, jamais fait fonctionner. Le service est derrière Cloudflare,
   renvoie « Unable to submit form » sans expliquer pourquoi, et surtout il est
   IMPOSSIBLE à diagnostiquer — chaque essai demandait une manipulation manuelle à
   l'aveugle. Supabase, lui, se teste : insertion, refus de lecture et rejet d'un
   e-mail invalide ont été vérifiés avant même d'écrire ce fichier.

   Pourquoi pas un lien `mailto:` : il ouvre le logiciel de messagerie du visiteur.
   Sur ordinateur, une grande part des gens sont sur un webmail sans client configuré —
   pour eux le bouton ne fait RIEN. Et un site qui affiche « écrivez-nous à cette
   adresse » fait amateur.

   ⚠️ LA CLÉ CI-DESSOUS EST PUBLIQUE ET C'EST NORMAL.
   C'est une clé « publishable », conçue pour vivre dans du code visible de tous. Ce qui
   protège les données, ce n'est pas son secret, c'est la politique RLS de la table :
   `site_leads` autorise l'INSERTION et rien d'autre. Même avec cette clé en main,
   personne ne peut relire la liste des adresses collectées (vérifié : HTTP 401).
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://fyssbhkputuntjljxwbc.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_JndZhtJq5HHNC-ZKT59Ovg_I32cQkb8';
  var ENDPOINT = SUPABASE_URL + '/rest/v1/site_leads';

  /**
   * Envoie une ligne dans `site_leads`.
   * `Prefer: return=minimal` est INDISPENSABLE : sans lui, PostgREST tente de renvoyer
   * la ligne insérée, ce qui exige un droit de LECTURE que l'on refuse volontairement —
   * l'insertion réussirait mais la réponse partirait en 401.
   */
  function envoyer(donnees) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(donnees)
    }).then(function (r) {
      if (!r.ok) { return r.text().then(function (t) { throw new Error(r.status + ' ' + t); }); }
      return true;
    });
  }

  /* Message affiché à la place du formulaire : on ne renvoie pas le visiteur sur une
     autre page, il reste où il était et voit immédiatement que c'est parti. */
  function messageSucces(texte) {
    var d = document.createElement('div');
    d.className = 'form-ok';
    d.setAttribute('role', 'status');
    d.innerHTML = '<b>C\'est noté.</b><br>' + texte;
    return d;
  }

  function brancher(form, construireDonnees, texteSucces) {
    if (!form) { return; }
    var bouton = form.querySelector('button[type="submit"]');
    var libelle = bouton ? bouton.textContent : '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Piège à robots : rempli = robot, on fait comme si tout allait bien et on n'envoie rien.
      var honey = form.querySelector('[name="_honey"]');
      if (honey && honey.value) { form.replaceWith(messageSucces(texteSucces)); return; }

      var erreurPrecedente = form.querySelector('.form-erreur');
      if (erreurPrecedente) { erreurPrecedente.remove(); }

      if (bouton) { bouton.disabled = true; bouton.textContent = 'Envoi…'; }

      envoyer(construireDonnees(form))
        .then(function () { form.replaceWith(messageSucces(texteSucces)); })
        .catch(function (err) {
          // Jamais d'échec muet : le visiteur doit savoir que ça n'est pas parti, et
          // garder un moyen de nous joindre malgré tout.
          if (window.console) { console.error('[contact] envoi impossible :', err); }
          if (bouton) { bouton.disabled = false; bouton.textContent = libelle; }
          var p = document.createElement('p');
          p.className = 'form-erreur';
          p.setAttribute('role', 'alert');
          p.innerHTML = 'L\'envoi a échoué. Réessaie dans un instant, ou écris directement à '
            + '<a href="mailto:shinkato.contact@gmail.com">shinkato.contact@gmail.com</a>.';
          form.appendChild(p);
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    brancher(
      document.querySelector('.cta-form'),
      function (f) {
        return { kind: 'lancement', email: f.querySelector('[name="email"]').value.trim() };
      },
      'Tu seras prévenu dès l\'ouverture du Chapitre I — un seul message, le jour de la sortie.'
    );

    brancher(
      document.querySelector('.partners-form'),
      function (f) {
        return {
          kind: 'partenaire',
          email: f.querySelector('[name="email"]').value.trim(),
          marque: f.querySelector('[name="marque"]').value.trim()
        };
      },
      'Votre demande de partenariat est enregistrée. Nous revenons vers vous rapidement.'
    );
  });
})();
