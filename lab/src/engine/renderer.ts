import type { BlendMode, Layer, Slide, TransitionType } from '../model/types';
import { animTotal, layerState, schedule } from './anim';
import { CONTENT_GLSL, MAIN, PRELUDE, VERT } from './glsl';
import { getAssetVersion, rasterise } from './raster';
import { kind } from './registry';

const BLEND_INDEX: Record<BlendMode, number> = {
  normal: 0, multiply: 1, screen: 2, overlay: 3, softLight: 4, hardLight: 5, darken: 6, lighten: 7,
  colorDodge: 8, colorBurn: 9, difference: 10, exclusion: 11, add: 12,
};
const TRANSITION_INDEX: Record<TransitionType, number> = {
  none: 0, fade: 1, push: 2, zoom: 3, ripple: 4, dissolve: 5, wipe: 6, pixelate: 7, blur: 8,
};

const COPY_FRAG = PRELUDE + `void main() { outColor = textureLod(uBelow, vUv, 0.0); }`;

const TRANSITION_FRAG = PRELUDE + /* glsl */ `
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uP;
uniform int uType;
uniform float uDir;
vec3 SA(vec2 uv, float l) { if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec3(0.0); return textureLod(uA, vec2(uv.x, 1.0 - uv.y), l).rgb; }
vec3 SB(vec2 uv, float l) { if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec3(0.0); return textureLod(uB, vec2(uv.x, 1.0 - uv.y), l).rgb; }
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float p = uP;
  vec3 c;
  if (uType == 1) {
    c = mix(SA(uv, 0.0), SB(uv, 0.0), p);
  } else if (uType == 2) {
    float x = uv.x + p * uDir;
    vec3 a = SA(vec2(uv.x + p * uDir, uv.y), 0.0);
    vec3 b = SB(vec2(uv.x + (p - 1.0) * uDir, uv.y), 0.0);
    bool inB = uDir > 0.0 ? x > 1.0 : x < 0.0;
    float edge = uDir > 0.0 ? x - 1.0 : -x;
    c = inB ? b * (0.85 + 0.15 * smoothstep(0.0, 0.08, edge)) : a * (1.0 - 0.35 * p);
  } else if (uType == 3) {
    vec3 a = SA((uv - 0.5) / (1.0 + p * 0.35) + 0.5, 0.0);
    vec3 b = SB((uv - 0.5) / (0.88 + 0.12 * p) + 0.5, 0.0);
    c = mix(a, b, smoothstep(0.15, 0.85, p));
  } else if (uType == 4) {
    vec2 as = aspect();
    vec2 d = (uv - 0.5) * as;
    float r = length(d);
    float R = p * 1.25;
    float env = sin(p * PI);
    vec2 off = (r > 1e-4 ? d / r : vec2(0.0)) * sin((r - R) * 38.0) * 0.022 * env * exp(-abs(r - R) * 5.0) / as;
    float m = smoothstep(R + 0.04, R - 0.04, r);
    c = mix(SA(uv + off, 0.0), SB(uv + off, 0.0), m);
  } else if (uType == 5) {
    float n = fbm(uv * aspect() * 3.0 + uSeed) * 0.5 + 0.5;
    float th = p * 1.3 - 0.15;
    float m = smoothstep(th + 0.03, th - 0.03, n);
    float e = smoothstep(0.06, 0.0, abs(n - th)) * (1.0 - p) * step(0.001, p);
    c = mix(SA(uv, 0.0), SB(uv, 0.0), m) + vec3(1.0, 0.45, 0.2) * e * 1.4;
  } else if (uType == 6) {
    float x = uDir > 0.0 ? uv.x + (uv.y - 0.5) * 0.2 : 1.0 - uv.x + (uv.y - 0.5) * 0.2;
    float m = smoothstep(p * 1.3 - 0.15 + 0.06, p * 1.3 - 0.15 - 0.06, x);
    c = mix(SA(uv, 0.0), SB(uv, 0.0), m);
  } else if (uType == 7) {
    float s = mix(1.0, 64.0, sin(p * PI));
    vec2 q = (floor(uv * uRes / s) + 0.5) * s / uRes;
    c = p < 0.5 ? SA(q, 0.0) : SB(q, 0.0);
  } else if (uType == 8) {
    float l = sin(p * PI) * 5.0;
    c = mix(SA(uv, l), SB(uv, l), smoothstep(0.3, 0.7, p));
  } else {
    c = SB(uv, 0.0);
  }
  outColor = vec4(c, 1.0);
}`;

interface FBO { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }
interface Prog { prog: WebGLProgram; loc: Map<string, WebGLUniformLocation | null> }
interface TexEntry {
  tex: WebGLTexture; rect: [number, number, number, number];
  params: unknown; w: number; h: number; asset: number; textT: number;
}

export interface FrameOpts {
  time: number; // global clock, drives ambient motion
  mouse: [number, number]; // slide uv
  t: number; // slide clock; Infinity = fully built / static
  clicks: number[]; // slide-clock times of each build click
  interactive?: boolean; // apply parallax + hover
  hover?: Map<string, number>;
  hidden?: Set<string>;
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function seedOf(id: string) {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 131 + id.charCodeAt(i)) % 10007;
  return h / 10007;
}

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  private progs = new Map<string, Prog>();
  private failed = new Set<string>();
  private ping: FBO[] = [];
  private slots: FBO[] = [];
  private tex = new Map<string, TexEntry>();
  private vao: WebGLVertexArrayObject;
  pw = 0;
  ph = 0;

  constructor(readonly canvas: HTMLCanvasElement | OffscreenCanvas, public deckW = 1920, public deckH = 1080) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false }) as WebGL2RenderingContext | null;
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    this.gl = gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.vao = vao;
  }

  setSize(w: number, h: number) {
    w = Math.max(2, Math.round(w));
    h = Math.max(2, Math.round(h));
    if (w === this.pw && h === this.ph) return;
    this.pw = w;
    this.ph = h;
    this.canvas.width = w;
    this.canvas.height = h;
    for (const f of [...this.ping, ...this.slots]) this.freeFbo(f);
    this.ping = [this.makeFbo(w, h), this.makeFbo(w, h)];
    this.slots = [this.makeFbo(w, h), this.makeFbo(w, h)];
  }

  private makeFbo(w: number, h: number): FBO {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const levels = Math.floor(Math.log2(Math.max(w, h))) + 1;
    gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }

  private freeFbo(f: FBO) {
    this.gl.deleteFramebuffer(f.fb);
    this.gl.deleteTexture(f.tex);
  }

  private program(key: string, frag: () => string): Prog {
    let p = this.progs.get(key);
    if (p) return p;
    if (this.failed.has(key)) throw new Error(`Shader ${key} unavailable`);
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        console.error(`[SlideForge] shader "${key}" failed:\n${log}`);
        if (!gl.isContextLost()) this.failed.add(key);
        throw new Error(`Shader ${key}: ${log}`);
      }
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag()));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`Link ${key}: ${gl.getProgramInfoLog(prog)}`);
    p = { prog, loc: new Map() };
    this.progs.set(key, p);
    return p;
  }

  private u(p: Prog, name: string) {
    let l = p.loc.get(name);
    if (l === undefined) {
      l = this.gl.getUniformLocation(p.prog, name);
      p.loc.set(name, l);
    }
    return l;
  }

  private layerProgram(layer: Layer): Prog {
    const k = kind(layer.kind);
    if (k.content) return this.program('content', () => PRELUDE + CONTENT_GLSL + MAIN);
    return this.program(k.id, () => PRELUDE + (k.glsl ?? 'vec4 effect(vec2 uv){return vec4(0.0);}') + MAIN);
  }

  /** Pre-compile every shader so the first frame of a transition never hitches. */
  warm(kinds: string[]) {
    for (const id of kinds) {
      try { this.layerProgram({ kind: id } as Layer); } catch { /* reported in console */ }
    }
    this.program('copy', () => COPY_FRAG);
    this.program('transition', () => TRANSITION_FRAG);
  }

  private texture(layer: Layer, textT: number): TexEntry | null {
    const box = layer.box!;
    const asset = getAssetVersion();
    const e = this.tex.get(layer.id);
    if (e && e.params === layer.params && e.w === box.w && e.h === box.h && e.asset === asset && e.textT === textT) return e;
    const r = rasterise(layer, textT);
    if (!r) return e ?? null;
    const gl = this.gl;
    const tex = e?.tex ?? gl.createTexture()!;
    // Upload on a scratch unit so we never clobber the uBelow binding on unit 0.
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, r.canvas as TexImageSource);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const entry: TexEntry = { tex, rect: r.rect, params: layer.params, w: box.w, h: box.h, asset, textT };
    this.tex.set(layer.id, entry);
    return entry;
  }

  /** Drop textures for layers that no longer exist. */
  prune(keep: Set<string>) {
    for (const [id, e] of this.tex) if (!keep.has(id)) { this.gl.deleteTexture(e.tex); this.tex.delete(id); }
  }

  private bindTarget(f: FBO | null) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, f ? f.fb : null);
    gl.viewport(0, 0, this.pw, this.ph);
  }

  private common(p: Prog, opts: FrameOpts, belowTex: WebGLTexture) {
    const gl = this.gl;
    gl.useProgram(p.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, belowTex);
    gl.uniform1i(this.u(p, 'uBelow'), 0);
    gl.uniform2f(this.u(p, 'uRes'), this.deckW, this.deckH);
    gl.uniform2f(this.u(p, 'uPx'), this.pw, this.ph);
    gl.uniform1f(this.u(p, 'uTime'), opts.time);
    gl.uniform2f(this.u(p, 'uMouse'), opts.mouse[0], opts.mouse[1]);
  }

  /** Composite a slide into `target` (null = the canvas). */
  drawSlide(slide: Slide, opts: FrameOpts, target: FBO | null = null) {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);
    const sched = schedule(slide, opts.clicks);
    const [br, bg, bb] = hexToRgb(slide.background || '#000000');

    type Pass = { layer: Layer; run: (p: Prog) => boolean };
    const passes: Pass[] = [];
    for (const layer of slide.layers) {
      if (!layer.visible || opts.hidden?.has(layer.id)) continue;
      const k = kind(layer.kind);
      const st = layerState(layer, sched.start.get(layer.id), opts.t, opts.time);
      if (!st.visible || st.opacity <= 0.001 || layer.opacity <= 0.001) continue;

      if (k.content) {
        const box = layer.box!;
        const total = animTotal(layer);
        const textT = st.textT < total ? st.textT : Infinity;
        if (opts.interactive) {
          if (layer.interact.parallax) {
            st.dx += (opts.mouse[0] - 0.5) * layer.interact.parallax * 90;
            st.dy += (opts.mouse[1] - 0.5) * layer.interact.parallax * 60;
          }
          const hv = opts.hover?.get(layer.id) ?? 0;
          if (hv > 0.001) {
            const hov = layer.interact.hover;
            if (hov === 'lift') { st.dy -= 12 * hv; st.scale *= 1 + 0.02 * hv; }
            else if (hov === 'grow') st.scale *= 1 + 0.07 * hv;
            else if (hov === 'glow') st.glow = hv;
            else if (hov === 'tilt') {
              const cx = (box.x + box.w / 2) / this.deckW;
              st.rot += (opts.mouse[0] - cx) * 18 * hv;
              st.scale *= 1 + 0.03 * hv;
            }
          }
        }
        passes.push({
          layer,
          run: (p) => {
            const te = this.texture(layer, textT);
            if (!te) return false;
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, te.tex);
            gl.uniform1i(this.u(p, 'uTex'), 1);
            gl.uniform4f(this.u(p, 'uBox'), box.x, box.y, box.w, box.h);
            gl.uniform4f(this.u(p, 'uTexRect'), ...te.rect);
            gl.uniform1f(this.u(p, 'uRot'), ((box.rot + st.rot) * Math.PI) / 180);
            gl.uniform2f(this.u(p, 'uScale'), st.scale, st.scale);
            gl.uniform2f(this.u(p, 'uOffset'), st.dx, st.dy);
            gl.uniform1f(this.u(p, 'uBlur'), st.blur);
            gl.uniform4f(this.u(p, 'uClip'), ...st.clip);
            gl.uniform1f(this.u(p, 'uGlow'), st.glow);
            gl.uniform1f(this.u(p, 'uOpacity'), layer.opacity * st.opacity);
            return true;
          },
        });
      } else {
        passes.push({
          layer,
          run: (p) => {
            for (const d of k.params) {
              let v = layer.params[d.key] ?? d.default;
              if (d.type === 'vec2' && k.mouseParam === d.key && layer.interact.followMouse) v = opts.mouse;
              const loc = this.u(p, 'u_' + d.key);
              if (!loc) continue;
              if (d.type === 'number') gl.uniform1f(loc, Number(v));
              else if (d.type === 'color') gl.uniform3f(loc, ...hexToRgb(String(v)));
              else if (d.type === 'bool') gl.uniform1f(loc, v ? 1 : 0);
              else if (d.type === 'vec2') gl.uniform2f(loc, (v as number[])[0], (v as number[])[1]);
              else if (d.type === 'select') gl.uniform1f(loc, Math.max(0, d.options.findIndex((o) => o.value === v)));
            }
            gl.uniform1f(this.u(p, 'uOpacity'), layer.opacity * st.opacity);
            return true;
          },
        });
      }
    }

    // Clear the first buffer to the slide background, then ping-pong through the passes.
    this.bindTarget(this.ping[0]);
    gl.clearColor(br, bg, bb, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    let cur = 0;
    let wrote = false;
    for (let i = 0; i < passes.length; i++) {
      const { layer, run } = passes[i];
      const k = kind(layer.kind);
      const src = this.ping[cur];
      if (k.needsMips) {
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, src.tex);
        gl.generateMipmap(gl.TEXTURE_2D);
      }
      const isLast = i === passes.length - 1;
      const dst = isLast ? target : this.ping[1 - cur];
      let p: Prog;
      try { p = this.layerProgram(layer); } catch { continue; }
      this.bindTarget(dst);
      this.common(p, opts, src.tex);
      gl.uniform1i(this.u(p, 'uBlend'), BLEND_INDEX[layer.blend] ?? 0);
      gl.uniform1f(this.u(p, 'uSeed'), seedOf(layer.id));
      if (!run(p)) continue;
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (isLast) wrote = true;
      else cur = 1 - cur;
    }
    if (!wrote) this.copy(this.ping[cur], target, opts);
  }

  private copy(src: FBO, target: FBO | null, opts: FrameOpts) {
    const p = this.program('copy', () => COPY_FRAG);
    this.bindTarget(target);
    this.common(p, opts, src.tex);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  /** Render two slides and blend them with a shader transition. p: 0..1 eased. */
  drawTransition(from: Slide, fromOpts: FrameOpts, to: Slide, toOpts: FrameOpts, type: TransitionType, p: number, dir: 1 | -1) {
    const gl = this.gl;
    this.drawSlide(from, fromOpts, this.slots[0]);
    this.drawSlide(to, toOpts, this.slots[1]);
    if (type === 'blur') {
      gl.activeTexture(gl.TEXTURE3);
      for (const s of this.slots) { gl.bindTexture(gl.TEXTURE_2D, s.tex); gl.generateMipmap(gl.TEXTURE_2D); }
    }
    const prog = this.program('transition', () => TRANSITION_FRAG);
    this.bindTarget(null);
    this.common(prog, toOpts, this.slots[0].tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.slots[0].tex);
    gl.uniform1i(this.u(prog, 'uA'), 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.slots[1].tex);
    gl.uniform1i(this.u(prog, 'uB'), 2);
    gl.uniform1f(this.u(prog, 'uP'), p);
    gl.uniform1i(this.u(prog, 'uType'), TRANSITION_INDEX[type] ?? 1);
    gl.uniform1f(this.u(prog, 'uDir'), dir);
    gl.uniform1f(this.u(prog, 'uSeed'), 0.37);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** @param lose also release the GL context (skip when the canvas will be reused, e.g. hot reload). */
  dispose(lose = true) {
    const gl = this.gl;
    for (const e of this.tex.values()) gl.deleteTexture(e.tex);
    for (const f of [...this.ping, ...this.slots]) this.freeFbo(f);
    for (const p of this.progs.values()) gl.deleteProgram(p.prog);
    this.tex.clear();
    this.progs.clear();
    if (lose) gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
