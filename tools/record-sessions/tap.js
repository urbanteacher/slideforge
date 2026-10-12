/* Test-only init script for tools/record-sessions/record.mjs.
 *
 * Loaded into every page of the recording browser context with Playwright's
 * addInitScript, before any app script runs. It wraps the two transports the
 * classic host speaks over and reports every message to the recorder through
 * the exposed binding window.__sfRecord:
 *
 *   WebSocket         the host <-> relay socket (js/live.js)
 *   BroadcastChannel  the sf-manual-<key> teacher-entry channel (manual.html)
 *
 * Nothing is changed on the wire: send() forwards the same string, and the
 * listeners are passive. Payloads are parsed for readability only; a frame
 * that is not JSON is kept as `raw`. Nothing is normalised here. */
(function () {
  'use strict';
  if (window.__sfTapInstalled) return;
  window.__sfTapInstalled = true;

  var where = window === window.top ? 'top' : 'frame';
  var page = location.pathname.replace(/^.*\//, '') || 'index.html';
  var seq = 0;
  var buffer = [];

  function flush() {
    if (typeof window.__sfRecord !== 'function') return false;
    while (buffer.length) {
      try { window.__sfRecord(buffer.shift()); } catch (e) { /* page closing */ }
    }
    return true;
  }

  function emit(e) {
    e.at = Date.now();
    e.seq = ++seq;
    e.page = page;
    e.where = where;
    buffer.push(e);
    if (!flush()) setTimeout(flush, 0);
  }

  function payload(d) {
    if (typeof d !== 'string') return { raw: '[binary ' + (d && d.byteLength || 0) + ' bytes]' };
    try { return { data: JSON.parse(d) }; } catch (e) { return { raw: d }; }
  }

  var NativeWS = window.WebSocket;
  if (NativeWS) {
    var conns = 0;
    var Tapped = function (url, protocols) {
      var ws = protocols === undefined ? new NativeWS(url) : new NativeWS(url, protocols);
      var conn = ++conns;
      ws.__sfConn = conn;
      emit({ kind: 'ws', conn: conn, dir: 'connect', url: String(url) });
      ws.addEventListener('open', function () { emit({ kind: 'ws', conn: conn, dir: 'open' }); });
      ws.addEventListener('message', function (ev) {
        var p = payload(ev.data);
        emit(Object.assign({ kind: 'ws', conn: conn, dir: 'recv' }, p));
      });
      ws.addEventListener('close', function (ev) {
        emit({ kind: 'ws', conn: conn, dir: 'close', code: ev.code, reason: ev.reason, clean: ev.wasClean });
      });
      ws.addEventListener('error', function () { emit({ kind: 'ws', conn: conn, dir: 'error' }); });
      var send = ws.send;
      ws.send = function (d) {
        emit(Object.assign({ kind: 'ws', conn: conn, dir: 'send', state: ws.readyState }, payload(d)));
        return send.call(ws, d);
      };
      return ws;
    };
    Tapped.prototype = NativeWS.prototype;
    ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) { Tapped[k] = NativeWS[k]; });
    window.WebSocket = Tapped;
  }

  var NativeBC = window.BroadcastChannel;
  if (NativeBC) {
    var TappedBC = function (name) {
      var ch = new NativeBC(name);
      var recorded = /^sf-/.test(String(name));
      if (recorded) {
        ch.addEventListener('message', function (ev) {
          emit({ kind: 'channel', channel: String(name), dir: 'recv', data: ev.data });
        });
        var post = ch.postMessage;
        ch.postMessage = function (m) {
          emit({ kind: 'channel', channel: String(name), dir: 'post', data: m });
          return post.call(ch, m);
        };
      }
      return ch;
    };
    TappedBC.prototype = NativeBC.prototype;
    window.BroadcastChannel = TappedBC;
  }
})();
