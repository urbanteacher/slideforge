/* Minimal RFC 6455 WebSocket server for Node's http server.
   Deliberately dependency-free so SlideForge needs no npm install.
   Handles text frames, ping/pong, close, fragmentation and masking —
   which is all the live quiz relay needs. */
'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const OP = { CONT: 0x0, TEXT: 0x1, BIN: 0x2, CLOSE: 0x8, PING: 0x9, PONG: 0xA };

class Socket extends EventEmitter {
  constructor(raw) {
    super();
    this.raw = raw;
    this.open = true;
    this.buf = Buffer.alloc(0);
    this.fragments = [];
    this.fragOp = null;

    raw.on('data', (chunk) => {
      this.buf = Buffer.concat([this.buf, chunk]);
      try {
        this._drain();
      } catch (err) {
        this.close(1002, 'protocol error');
      }
    });
    raw.on('close', () => this._dead());
    raw.on('error', () => this._dead());
    raw.setTimeout(0);
    raw.setNoDelay(true);
  }

  _dead() {
    if (!this.open) return;
    this.open = false;
    this.emit('close');
  }

  _drain() {
    for (;;) {
      const frame = decode(this.buf);
      if (!frame) return;
      this.buf = this.buf.slice(frame.size);

      switch (frame.opcode) {
        case OP.PING:
          this._frame(OP.PONG, frame.payload);
          break;
        case OP.PONG:
          break;
        case OP.CLOSE:
          this.close(1000, '');
          return;
        case OP.CONT:
          if (this.fragOp == null) throw new Error('stray continuation');
          this.fragments.push(frame.payload);
          if (frame.fin) this._finish();
          break;
        case OP.TEXT:
        case OP.BIN:
          if (frame.fin) {
            if (frame.opcode === OP.TEXT) this.emit('message', frame.payload.toString('utf8'));
          } else {
            this.fragOp = frame.opcode;
            this.fragments = [frame.payload];
          }
          break;
        default:
          throw new Error('bad opcode ' + frame.opcode);
      }
    }
  }

  _finish() {
    const whole = Buffer.concat(this.fragments);
    const op = this.fragOp;
    this.fragments = [];
    this.fragOp = null;
    if (op === OP.TEXT) this.emit('message', whole.toString('utf8'));
  }

  _frame(opcode, payload) {
    if (!this.open) return;
    const len = payload.length;
    let head;
    if (len < 126) {
      head = Buffer.alloc(2);
      head[1] = len;
    } else if (len < 65536) {
      head = Buffer.alloc(4);
      head[1] = 126;
      head.writeUInt16BE(len, 2);
    } else {
      head = Buffer.alloc(10);
      head[1] = 127;
      head.writeUInt32BE(0, 2);
      head.writeUInt32BE(len, 6);
    }
    head[0] = 0x80 | opcode;
    try {
      this.raw.write(Buffer.concat([head, payload]));
    } catch (e) {
      this._dead();
    }
  }

  send(text) {
    this._frame(OP.TEXT, Buffer.from(String(text), 'utf8'));
  }

  json(obj) {
    this.send(JSON.stringify(obj));
  }

  close(code, reason) {
    if (!this.open) return;
    const body = Buffer.alloc(2 + Buffer.byteLength(reason || ''));
    body.writeUInt16BE(code || 1000, 0);
    if (reason) body.write(reason, 2);
    this._frame(OP.CLOSE, body);
    this.open = false;
    try { this.raw.end(); } catch (e) {}
    this.emit('close');
  }
}

function decode(buf) {
  if (buf.length < 2) return null;
  const b0 = buf[0], b1 = buf[1];
  const fin = (b0 & 0x80) !== 0;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let len = b1 & 0x7f;
  let off = 2;

  if (len === 126) {
    if (buf.length < off + 2) return null;
    len = buf.readUInt16BE(off);
    off += 2;
  } else if (len === 127) {
    if (buf.length < off + 8) return null;
    const hi = buf.readUInt32BE(off);
    const lo = buf.readUInt32BE(off + 4);
    if (hi !== 0) throw new Error('frame too large');
    len = lo;
    off += 8;
  }

  if (len > 4 * 1024 * 1024) throw new Error('frame too large');

  let mask = null;
  if (masked) {
    if (buf.length < off + 4) return null;
    mask = buf.slice(off, off + 4);
    off += 4;
  }

  if (buf.length < off + len) return null;
  const payload = Buffer.from(buf.slice(off, off + len));
  if (mask) {
    for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
  }
  return { fin, opcode, payload, size: off + len };
}

/** Attach to an http.Server; calls onConnection(socket, request). */
function attach(server, onConnection) {
  server.on('upgrade', (req, raw) => {
    const key = req.headers['sec-websocket-key'];
    if (String(req.headers.upgrade || '').toLowerCase() !== 'websocket' || !key) {
      raw.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    raw.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
    );
    onConnection(new Socket(raw), req);
  });
}

module.exports = { attach, Socket };
