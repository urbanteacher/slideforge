/* SlideForge — the teacher's account, for saving lessons online (docs/data-storage-plan.md, step 3).

   Teachers only, signing in with an email magic link (decided 14 Oct 2026). The relay says whether a Supabase
   project is set up (GET /api/cloud-config): when it is not, nothing here shows and the app saves in this browser
   only, exactly as before. When it is, the header gains a Sign in button; a teacher types their work email, Supabase
   emails a link, and the link brings them back signed in. Only an email at an allowed domain (the project's
   allowed_domains, nulondon.ac.uk) is offered a link; the database refuses everyone else anyway (Row Level Security,
   supabase/migrations/0001_lessons.sql).

   SF.Cloud
     ready()        a promise: true when online saving is set up here, false when it is not
     user()         the signed-in teacher ({ id, email }) or null
     onChange(fn)   fn(user) on every sign-in and sign-out (and once, now)
     signIn(email)  a promise: the link is sent, or it rejects with what to tell the teacher
     signOut()      a promise
     client()       the Supabase client, for step 4's sync (null when not set up) */
(function (global) {
  'use strict';
  /** @type {any} */
  var SF = global.SF = global.SF || {};

  /* Pinned, as every outside script is: a moving version could change under a lesson mid-term. */
  var LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

  /** @type {any} */ var client = null;
  /** @type {{ id: string, email: string } | null} */ var current = null;
  /** @type {string[]} */ var domains = [];
  /** @type {Array<(u: any) => void>} */ var listeners = [];
  /** @type {Promise<boolean> | null} */ var started = null;

  function loadLib() {
    var g = /** @type {any} */ (global);
    if (g.supabase && g.supabase.createClient) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = LIB;
      s.crossOrigin = 'anonymous';
      s.onload = function () { resolve(undefined); };
      s.onerror = function () { reject(new Error('The sign-in library could not be loaded.')); };
      document.head.appendChild(s);
    });
  }

  /** @param {any} u */
  function setUser(u) {
    var next = u && u.id ? { id: String(u.id), email: String(u.email || '') } : null;
    if ((next && next.id) === (current && current.id)) return;
    current = next;
    listeners.forEach(function (fn) { try { fn(current); } catch (e) { console.error(e); } });
  }

  /** The domain part of an email, lower case, or ''. @param {string} email */
  function domainOf(email) {
    var m = /^[^@\s]+@([^@\s]+\.[^@\s]+)$/.exec(String(email || '').trim().toLowerCase());
    return m ? m[1] : '';
  }

  function ready() {
    if (started) return started;
    started = fetch('/api/cloud-config', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
      .catch(function () { return { enabled: false }; })
      .then(function (/** @type {any} */ cfg) {
        if (!cfg || !cfg.enabled || !cfg.url || !cfg.anonKey) return false;
        return loadLib().then(function () {
          var g = /** @type {any} */ (global);
          client = g.supabase.createClient(cfg.url, cfg.anonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
          });
          client.auth.onAuthStateChange(function (/** @type {string} */ _e, /** @type {any} */ session) { setUser(session && session.user); });
          return Promise.all([
            client.auth.getSession().then(function (/** @type {any} */ r) { setUser(r && r.data && r.data.session && r.data.session.user); }),
            client.from('allowed_domains').select('domain').then(function (/** @type {any} */ r) {
              domains = ((r && r.data) || []).map(function (/** @type {any} */ d) { return String(d.domain).toLowerCase(); });
            })
          ]).then(function () { return true; });
        });
      })
      .catch(function (/** @type {any} */ e) { console.error('Online saving is unavailable:', e); client = null; return false; });
    return started;
  }

  /** @param {string} email */
  function signIn(email) {
    return ready().then(function (on) {
      if (!on || !client) throw new Error('Online saving is not set up on this server.');
      var d = domainOf(email);
      if (!d) throw new Error('That is not an email address.');
      if (domains.length && domains.indexOf(d) < 0) throw new Error('Sign in with your work email (' + domains.map(function (x) { return '@' + x; }).join(' or ') + ').');
      return client.auth.signInWithOtp({
        email: String(email).trim(),
        options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true }
      }).then(function (/** @type {any} */ r) {
        if (r && r.error) throw new Error(r.error.message || 'The link could not be sent. Try again in a minute.');
        return true;
      });
    });
  }

  function signOut() {
    return client ? client.auth.signOut().then(function () { setUser(null); }) : Promise.resolve();
  }

  SF.Cloud = {
    ready: ready,
    user: function () { return current; },
    onChange: function (/** @type {(u: any) => void} */ fn) { listeners.push(fn); fn(current); },
    signIn: signIn,
    signOut: signOut,
    client: function () { return client; },
    domainOf: domainOf
  };

  /* ------------------------------------------------------------ the header's Sign in button and its dialog */
  function wire() {
    var dlg = /** @type {HTMLDialogElement | null} */ (document.getElementById('accountDialog'));
    var btnAccount = document.getElementById('btnAccount');
    if (!btnAccount || !dlg) return;
    var btn = btnAccount;
    var input = /** @type {HTMLInputElement} */ (dlg.querySelector('#accountEmail'));
    var say = /** @type {HTMLElement} */ (dlg.querySelector('#accountSay'));
    var who = /** @type {HTMLElement} */ (dlg.querySelector('#accountWho'));
    var signedOut = /** @type {HTMLElement} */ (dlg.querySelector('.account-out'));
    var signedIn = /** @type {HTMLElement} */ (dlg.querySelector('.account-in'));
    btnAccount.onclick = function () { say.textContent = ''; dlg.showModal(); if (!current) input.focus(); };

    var accountSend = /** @type {HTMLButtonElement} */ (document.getElementById('accountSend')), send = accountSend;
    var sendLink = function () {
      send.disabled = true; say.textContent = 'Sending\u2026';
      signIn(input.value).then(function () {
        say.textContent = 'Check your email: the link signs you in here. It works once, for an hour.';
      }, function (/** @type {any} */ err) {
        say.textContent = err && err.message ? err.message : 'The link could not be sent.';
      }).then(function () { send.disabled = false; });
    };
    accountSend.onclick = sendLink;
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); sendLink(); } });

    var out = /** @type {HTMLButtonElement} */ (document.getElementById('accountOut'));
    out.addEventListener('click', function () { signOut().then(function () { dlg.close(); if (SF.toast) SF.toast('Signed out. Lessons save in this browser only.'); }); });

    ready().then(function (on) {
      if (!on) return;
      btn.hidden = false;
      SF.Cloud.onChange(function (/** @type {any} */ u) {
        btn.textContent = u ? u.email.split('@')[0] : 'Sign in';
        btn.title = u ? 'Signed in as ' + u.email + ': your lessons save to your account' : 'Sign in with your work email to keep your lessons on every device';
        btn.classList.toggle('signed-in', !!u);
        signedOut.hidden = !!u; signedIn.hidden = !u;
        who.textContent = u ? u.email : '';
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})(window);
