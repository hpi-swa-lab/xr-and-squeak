// The MIT License (MIT)
// 
// Copyright (c) 2018-2023 Max Brunsfeld
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var Module = void 0 !== Module ? Module : {},
  TreeSitter = (function () {
    var e;
    class Parser {
      constructor() {
        this.initialize();
      }
      initialize() {
        throw new Error("cannot construct a Parser before calling `init()`");
      }
      static init(t) {
        return (
          e ||
          ((Module = Object.assign({}, Module, t)),
          (e = new Promise((e) => {
            var t,
              r = {};
            for (t in Module) Module.hasOwnProperty(t) && (r[t] = Module[t]);
            var n,
              s,
              o = [],
              _ = "./this.program",
              a = function (e, t) {
                throw t;
              },
              u = !1,
              i = !1;
            (u = "object" == typeof window),
              (i = "function" == typeof importScripts),
              (n =
                "object" == typeof process &&
                "object" == typeof process.versions &&
                "string" == typeof process.versions.node),
              (s = !u && !n && !i);
            var l,
              d,
              c,
              m,
              f,
              p = "";
            n
              ? ((p = i ? require("path").dirname(p) + "/" : __dirname + "/"),
                (l = function (e, t) {
                  return (
                    m || (m = require("fs")),
                    f || (f = require("path")),
                    (e = f.normalize(e)),
                    m.readFileSync(e, t ? null : "utf8")
                  );
                }),
                (c = function (e) {
                  var t = l(e, !0);
                  return t.buffer || (t = new Uint8Array(t)), P(t.buffer), t;
                }),
                process.argv.length > 1 &&
                  (_ = process.argv[1].replace(/\\/g, "/")),
                (o = process.argv.slice(2)),
                "undefined" != typeof module && (module.exports = Module),
                (a = function (e) {
                  process.exit(e);
                }),
                (Module.inspect = function () {
                  return "[Emscripten Module object]";
                }))
              : s
              ? ("undefined" != typeof read &&
                  (l = function (e) {
                    return read(e);
                  }),
                (c = function (e) {
                  var t;
                  return "function" == typeof readbuffer
                    ? new Uint8Array(readbuffer(e))
                    : (P("object" == typeof (t = read(e, "binary"))), t);
                }),
                "undefined" != typeof scriptArgs
                  ? (o = scriptArgs)
                  : void 0 !== arguments && (o = arguments),
                "function" == typeof quit &&
                  (a = function (e) {
                    quit(e);
                  }),
                "undefined" != typeof print &&
                  ("undefined" == typeof console && (console = {}),
                  (console.log = print),
                  (console.warn = console.error =
                    "undefined" != typeof printErr ? printErr : print)))
              : (u || i) &&
                (i
                  ? (p = self.location.href)
                  : "undefined" != typeof document &&
                    document.currentScript &&
                    (p = document.currentScript.src),
                (p =
                  0 !== p.indexOf("blob:")
                    ? p.substr(0, p.lastIndexOf("/") + 1)
                    : ""),
                (l = function (e) {
                  var t = new XMLHttpRequest();
                  return t.open("GET", e, !1), t.send(null), t.responseText;
                }),
                i &&
                  (c = function (e) {
                    var t = new XMLHttpRequest();
                    return (
                      t.open("GET", e, !1),
                      (t.responseType = "arraybuffer"),
                      t.send(null),
                      new Uint8Array(t.response)
                    );
                  }),
                (d = function (e, t, r) {
                  var n = new XMLHttpRequest();
                  n.open("GET", e, !0),
                    (n.responseType = "arraybuffer"),
                    (n.onload = function () {
                      200 == n.status || (0 == n.status && n.response)
                        ? t(n.response)
                        : r();
                    }),
                    (n.onerror = r),
                    n.send(null);
                }));
            Module.print || console.log.bind(console);
            var h = Module.printErr || console.warn.bind(console);
            for (t in r) r.hasOwnProperty(t) && (Module[t] = r[t]);
            (r = null),
              Module.arguments && (o = Module.arguments),
              Module.thisProgram && (_ = Module.thisProgram),
              Module.quit && (a = Module.quit);
            var g = 16;
            var w,
              y = [];
            function M(e, t) {
              if (!w) {
                w = new WeakMap();
                for (var r = 0; r < B.length; r++) {
                  var n = B.get(r);
                  n && w.set(n, r);
                }
              }
              if (w.has(e)) return w.get(e);
              var s = (function () {
                if (y.length) return y.pop();
                try {
                  B.grow(1);
                } catch (e) {
                  if (!(e instanceof RangeError)) throw e;
                  throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
                }
                return B.length - 1;
              })();
              try {
                B.set(s, e);
              } catch (r) {
                if (!(r instanceof TypeError)) throw r;
                var o = (function (e, t) {
                  if ("function" == typeof WebAssembly.Function) {
                    for (
                      var r = { i: "i32", j: "i64", f: "f32", d: "f64" },
                        n = {
                          parameters: [],
                          results: "v" == t[0] ? [] : [r[t[0]]],
                        },
                        s = 1;
                      s < t.length;
                      ++s
                    )
                      n.parameters.push(r[t[s]]);
                    return new WebAssembly.Function(n, e);
                  }
                  var o = [1, 0, 1, 96],
                    _ = t.slice(0, 1),
                    a = t.slice(1),
                    u = { i: 127, j: 126, f: 125, d: 124 };
                  for (o.push(a.length), s = 0; s < a.length; ++s)
                    o.push(u[a[s]]);
                  "v" == _ ? o.push(0) : (o = o.concat([1, u[_]])),
                    (o[1] = o.length - 2);
                  var i = new Uint8Array(
                      [0, 97, 115, 109, 1, 0, 0, 0].concat(
                        o,
                        [2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0]
                      )
                    ),
                    l = new WebAssembly.Module(i);
                  return new WebAssembly.Instance(l, { e: { f: e } }).exports.f;
                })(e, t);
                B.set(s, o);
              }
              return w.set(e, s), s;
            }
            var b,
              v = function (e) {
                e;
              },
              E = Module.dynamicLibraries || [];
            Module.wasmBinary && (b = Module.wasmBinary);
            var I,
              A = Module.noExitRuntime || !0;
            function S(e, t, r, n) {
              switch (
                ("*" === (r = r || "i8").charAt(r.length - 1) && (r = "i32"), r)
              ) {
                case "i1":
                case "i8":
                  q[e >> 0] = t;
                  break;
                case "i16":
                  T[e >> 1] = t;
                  break;
                case "i32":
                  L[e >> 2] = t;
                  break;
                case "i64":
                  (ae = [
                    t >>> 0,
                    ((_e = t),
                    +Math.abs(_e) >= 1
                      ? _e > 0
                        ? (0 |
                            Math.min(
                              +Math.floor(_e / 4294967296),
                              4294967295
                            )) >>>
                          0
                        : ~~+Math.ceil((_e - +(~~_e >>> 0)) / 4294967296) >>> 0
                      : 0),
                  ]),
                    (L[e >> 2] = ae[0]),
                    (L[(e + 4) >> 2] = ae[1]);
                  break;
                case "float":
                  W[e >> 2] = t;
                  break;
                case "double":
                  O[e >> 3] = t;
                  break;
                default:
                  se("invalid type for setValue: " + r);
              }
            }
            function x(e, t, r) {
              switch (
                ("*" === (t = t || "i8").charAt(t.length - 1) && (t = "i32"), t)
              ) {
                case "i1":
                case "i8":
                  return q[e >> 0];
                case "i16":
                  return T[e >> 1];
                case "i32":
                case "i64":
                  return L[e >> 2];
                case "float":
                  return W[e >> 2];
                case "double":
                  return O[e >> 3];
                default:
                  se("invalid type for getValue: " + t);
              }
              return null;
            }
            "object" != typeof WebAssembly &&
              se("no native wasm support detected");
            var N = !1;
            function P(e, t) {
              e || se("Assertion failed: " + t);
            }
            var k = 1;
            var C,
              q,
              R,
              T,
              L,
              W,
              O,
              Z =
                "undefined" != typeof TextDecoder
                  ? new TextDecoder("utf8")
                  : void 0;
            function F(e, t, r) {
              for (var n = t + r, s = t; e[s] && !(s >= n); ) ++s;
              if (s - t > 16 && e.subarray && Z)
                return Z.decode(e.subarray(t, s));
              for (var o = ""; t < s; ) {
                var _ = e[t++];
                if (128 & _) {
                  var a = 63 & e[t++];
                  if (192 != (224 & _)) {
                    var u = 63 & e[t++];
                    if (
                      (_ =
                        224 == (240 & _)
                          ? ((15 & _) << 12) | (a << 6) | u
                          : ((7 & _) << 18) |
                            (a << 12) |
                            (u << 6) |
                            (63 & e[t++])) < 65536
                    )
                      o += String.fromCharCode(_);
                    else {
                      var i = _ - 65536;
                      o += String.fromCharCode(
                        55296 | (i >> 10),
                        56320 | (1023 & i)
                      );
                    }
                  } else o += String.fromCharCode(((31 & _) << 6) | a);
                } else o += String.fromCharCode(_);
              }
              return o;
            }
            function $(e, t) {
              return e ? F(R, e, t) : "";
            }
            function j(e, t, r, n) {
              if (!(n > 0)) return 0;
              for (var s = r, o = r + n - 1, _ = 0; _ < e.length; ++_) {
                var a = e.charCodeAt(_);
                if (a >= 55296 && a <= 57343)
                  a = (65536 + ((1023 & a) << 10)) | (1023 & e.charCodeAt(++_));
                if (a <= 127) {
                  if (r >= o) break;
                  t[r++] = a;
                } else if (a <= 2047) {
                  if (r + 1 >= o) break;
                  (t[r++] = 192 | (a >> 6)), (t[r++] = 128 | (63 & a));
                } else if (a <= 65535) {
                  if (r + 2 >= o) break;
                  (t[r++] = 224 | (a >> 12)),
                    (t[r++] = 128 | ((a >> 6) & 63)),
                    (t[r++] = 128 | (63 & a));
                } else {
                  if (r + 3 >= o) break;
                  (t[r++] = 240 | (a >> 18)),
                    (t[r++] = 128 | ((a >> 12) & 63)),
                    (t[r++] = 128 | ((a >> 6) & 63)),
                    (t[r++] = 128 | (63 & a));
                }
              }
              return (t[r] = 0), r - s;
            }
            function U(e, t, r) {
              return j(e, R, t, r);
            }
            function D(e) {
              for (var t = 0, r = 0; r < e.length; ++r) {
                var n = e.charCodeAt(r);
                n >= 55296 &&
                  n <= 57343 &&
                  (n =
                    (65536 + ((1023 & n) << 10)) | (1023 & e.charCodeAt(++r))),
                  n <= 127 ? ++t : (t += n <= 2047 ? 2 : n <= 65535 ? 3 : 4);
              }
              return t;
            }
            function z(e) {
              var t = D(e) + 1,
                r = De(t);
              return j(e, q, r, t), r;
            }
            function G(e) {
              (C = e),
                (Module.HEAP8 = q = new Int8Array(e)),
                (Module.HEAP16 = T = new Int16Array(e)),
                (Module.HEAP32 = L = new Int32Array(e)),
                (Module.HEAPU8 = R = new Uint8Array(e)),
                (Module.HEAPU16 = new Uint16Array(e)),
                (Module.HEAPU32 = new Uint32Array(e)),
                (Module.HEAPF32 = W = new Float32Array(e)),
                (Module.HEAPF64 = O = new Float64Array(e));
            }
            var H = Module.INITIAL_MEMORY || 33554432;
            (I = Module.wasmMemory
              ? Module.wasmMemory
              : new WebAssembly.Memory({
                  initial: H / 65536,
                  maximum: 32768,
                })) && (C = I.buffer),
              (H = C.byteLength),
              G(C);
            var B = new WebAssembly.Table({ initial: 13, element: "anyfunc" }),
              K = [],
              V = [],
              X = [],
              Q = [],
              J = !1;
            var Y = 0,
              ee = null,
              te = null;
            function re(e) {
              Y++,
                Module.monitorRunDependencies &&
                  Module.monitorRunDependencies(Y);
            }
            function ne(e) {
              if (
                (Y--,
                Module.monitorRunDependencies &&
                  Module.monitorRunDependencies(Y),
                0 == Y && (null !== ee && (clearInterval(ee), (ee = null)), te))
              ) {
                var t = te;
                (te = null), t();
              }
            }
            function se(e) {
              throw (
                (Module.onAbort && Module.onAbort(e),
                h((e += "")),
                (N = !0),
                1,
                (e =
                  "abort(" +
                  e +
                  "). Build with -s ASSERTIONS=1 for more info."),
                new WebAssembly.RuntimeError(e))
              );
            }
            (Module.preloadedImages = {}),
              (Module.preloadedAudios = {}),
              (Module.preloadedWasm = {});
            var oe,
              _e,
              ae,
              ue = "data:application/octet-stream;base64,";
            function ie(e) {
              return e.startsWith(ue);
            }
            function le(e) {
              return e.startsWith("file://");
            }
            function de(e) {
              try {
                if (e == oe && b) return new Uint8Array(b);
                if (c) return c(e);
                throw "both async and sync fetching of the wasm failed";
              } catch (e) {
                se(e);
              }
            }
            ie((oe = "tree-sitter.wasm")) ||
              (oe = (function (e) {
                return Module.locateFile ? Module.locateFile(e, p) : p + e;
              })(oe));
            var ce = {},
              me = {
                get: function (e, t) {
                  return (
                    ce[t] ||
                      (ce[t] = new WebAssembly.Global({
                        value: "i32",
                        mutable: !0,
                      })),
                    ce[t]
                  );
                },
              };
            function fe(e) {
              for (; e.length > 0; ) {
                var t = e.shift();
                if ("function" != typeof t) {
                  var r = t.func;
                  "number" == typeof r
                    ? void 0 === t.arg
                      ? B.get(r)()
                      : B.get(r)(t.arg)
                    : r(void 0 === t.arg ? null : t.arg);
                } else t(Module);
              }
            }
            function pe(e) {
              var t = 0;
              function r() {
                for (var r = 0, n = 1; ; ) {
                  var s = e[t++];
                  if (((r += (127 & s) * n), (n *= 128), !(128 & s))) break;
                }
                return r;
              }
              if (e instanceof WebAssembly.Module) {
                var n = WebAssembly.Module.customSections(e, "dylink");
                P(0 != n.length, "need dylink section"),
                  (e = new Int8Array(n[0]));
              } else {
                P(
                  1836278016 ==
                    new Uint32Array(
                      new Uint8Array(e.subarray(0, 24)).buffer
                    )[0],
                  "need to see wasm magic number"
                ),
                  P(0 === e[8], "need the dylink section to be first"),
                  (t = 9),
                  r(),
                  P(6 === e[t]),
                  P(e[++t] === "d".charCodeAt(0)),
                  P(e[++t] === "y".charCodeAt(0)),
                  P(e[++t] === "l".charCodeAt(0)),
                  P(e[++t] === "i".charCodeAt(0)),
                  P(e[++t] === "n".charCodeAt(0)),
                  P(e[++t] === "k".charCodeAt(0)),
                  t++;
              }
              var s = {};
              (s.memorySize = r()),
                (s.memoryAlign = r()),
                (s.tableSize = r()),
                (s.tableAlign = r());
              var o = r();
              s.neededDynlibs = [];
              for (var _ = 0; _ < o; ++_) {
                var a = r(),
                  u = e.subarray(t, t + a);
                t += a;
                var i = F(u, 0);
                s.neededDynlibs.push(i);
              }
              return s;
            }
            var he = 0;
            function ge() {
              return A || he > 0;
            }
            function we(e) {
              return 0 == e.indexOf("dynCall_") ||
                ["stackAlloc", "stackSave", "stackRestore"].includes(e)
                ? e
                : "_" + e;
            }
            function ye(e, t) {
              for (var r in e)
                if (e.hasOwnProperty(r)) {
                  Ze.hasOwnProperty(r) || (Ze[r] = e[r]);
                  var n = we(r);
                  Module.hasOwnProperty(n) || (Module[n] = e[r]);
                }
            }
            var Me = { nextHandle: 1, loadedLibs: {}, loadedLibNames: {} };
            function be(e, t, r) {
              return e.includes("j")
                ? (function (e, t, r) {
                    var n = Module["dynCall_" + e];
                    return r && r.length
                      ? n.apply(null, [t].concat(r))
                      : n.call(null, t);
                  })(e, t, r)
                : B.get(t).apply(null, r);
            }
            var ve = 5250816;
            function Ee(e) {
              return [
                "__cpp_exception",
                "__wasm_apply_data_relocs",
                "__dso_handle",
                "__set_stack_limits",
              ].includes(e);
            }
            function Ie(e, t) {
              var r = {};
              for (var n in e) {
                var s = e[n];
                "object" == typeof s && (s = s.value),
                  "number" == typeof s && (s += t),
                  (r[n] = s);
              }
              return (
                (function (e) {
                  for (var t in e)
                    if (!Ee(t)) {
                      var r = !1,
                        n = e[t];
                      t.startsWith("orig$") &&
                        ((t = t.split("$")[1]), (r = !0)),
                        ce[t] ||
                          (ce[t] = new WebAssembly.Global({
                            value: "i32",
                            mutable: !0,
                          })),
                        (r || 0 == ce[t].value) &&
                          ("function" == typeof n
                            ? (ce[t].value = M(n))
                            : "number" == typeof n
                            ? (ce[t].value = n)
                            : h(
                                "unhandled export type for `" +
                                  t +
                                  "`: " +
                                  typeof n
                              ));
                    }
                })(r),
                r
              );
            }
            function Ae(e, t) {
              var r, n;
              return (
                t && (r = Ze["orig$" + e]),
                r || (r = Ze[e]),
                r || (r = Module[we(e)]),
                !r &&
                  e.startsWith("invoke_") &&
                  ((n = e.split("_")[1]),
                  (r = function () {
                    var e = je();
                    try {
                      return be(
                        n,
                        arguments[0],
                        Array.prototype.slice.call(arguments, 1)
                      );
                    } catch (t) {
                      if ((Ue(e), t !== t + 0 && "longjmp" !== t)) throw t;
                      ze(1, 0);
                    }
                  })),
                r
              );
            }
            function Se(e, t) {
              var r = pe(e);
              function n() {
                var n = Math.pow(2, r.memoryAlign);
                n = Math.max(n, g);
                var s,
                  o,
                  _,
                  a =
                    ((s = (function (e) {
                      if (J) return Fe(e);
                      var t = ve,
                        r = (t + e + 15) & -16;
                      return (ve = r), (ce.__heap_base.value = r), t;
                    })(r.memorySize + n)),
                    (o = n) || (o = g),
                    Math.ceil(s / o) * o),
                  u = B.length;
                B.grow(r.tableSize);
                for (var i = a; i < a + r.memorySize; i++) q[i] = 0;
                for (i = u; i < u + r.tableSize; i++) B.set(i, null);
                var l = new Proxy(
                    {},
                    {
                      get: function (e, t) {
                        switch (t) {
                          case "__memory_base":
                            return a;
                          case "__table_base":
                            return u;
                        }
                        if (t in Ze) return Ze[t];
                        var r;
                        t in e ||
                          (e[t] = function () {
                            return (
                              r ||
                                (r = (function (e) {
                                  var t = Ae(e, !1);
                                  return t || (t = _[e]), t;
                                })(t)),
                              r.apply(null, arguments)
                            );
                          });
                        return e[t];
                      },
                    }
                  ),
                  d = {
                    "GOT.mem": new Proxy({}, me),
                    "GOT.func": new Proxy({}, me),
                    env: l,
                    wasi_snapshot_preview1: l,
                  };
                function c(e) {
                  for (var n = 0; n < r.tableSize; n++) {
                    var s = B.get(u + n);
                    s && w.set(s, u + n);
                  }
                  (_ = Ie(e.exports, a)), t.allowUndefined || Ne();
                  var o = _.__wasm_call_ctors;
                  return (
                    o || (o = _.__post_instantiate),
                    o && (J ? o() : V.push(o)),
                    _
                  );
                }
                if (t.loadAsync) {
                  if (e instanceof WebAssembly.Module) {
                    var m = new WebAssembly.Instance(e, d);
                    return Promise.resolve(c(m));
                  }
                  return WebAssembly.instantiate(e, d).then(function (e) {
                    return c(e.instance);
                  });
                }
                var f =
                  e instanceof WebAssembly.Module
                    ? e
                    : new WebAssembly.Module(e);
                return c((m = new WebAssembly.Instance(f, d)));
              }
              return t.loadAsync
                ? r.neededDynlibs
                    .reduce(function (e, r) {
                      return e.then(function () {
                        return xe(r, t);
                      });
                    }, Promise.resolve())
                    .then(function () {
                      return n();
                    })
                : (r.neededDynlibs.forEach(function (e) {
                    xe(e, t);
                  }),
                  n());
            }
            function xe(e, t) {
              "__main__" != e ||
                Me.loadedLibNames[e] ||
                ((Me.loadedLibs[-1] = {
                  refcount: 1 / 0,
                  name: "__main__",
                  module: Module.asm,
                  global: !0,
                }),
                (Me.loadedLibNames.__main__ = -1)),
                (t = t || { global: !0, nodelete: !0 });
              var r,
                n = Me.loadedLibNames[e];
              if (n)
                return (
                  (r = Me.loadedLibs[n]),
                  t.global &&
                    !r.global &&
                    ((r.global = !0), "loading" !== r.module && ye(r.module)),
                  t.nodelete && r.refcount !== 1 / 0 && (r.refcount = 1 / 0),
                  r.refcount++,
                  t.loadAsync ? Promise.resolve(n) : n
                );
              function s(e) {
                if (t.fs) {
                  var r = t.fs.readFile(e, { encoding: "binary" });
                  return (
                    r instanceof Uint8Array || (r = new Uint8Array(r)),
                    t.loadAsync ? Promise.resolve(r) : r
                  );
                }
                return t.loadAsync
                  ? ((n = e),
                    fetch(n, { credentials: "same-origin" })
                      .then(function (e) {
                        if (!e.ok)
                          throw "failed to load binary file at '" + n + "'";
                        return e.arrayBuffer();
                      })
                      .then(function (e) {
                        return new Uint8Array(e);
                      }))
                  : c(e);
                var n;
              }
              function o() {
                if (
                  void 0 !== Module.preloadedWasm &&
                  void 0 !== Module.preloadedWasm[e]
                ) {
                  var r = Module.preloadedWasm[e];
                  return t.loadAsync ? Promise.resolve(r) : r;
                }
                return t.loadAsync
                  ? s(e).then(function (e) {
                      return Se(e, t);
                    })
                  : Se(s(e), t);
              }
              function _(e) {
                r.global && ye(e), (r.module = e);
              }
              return (
                (n = Me.nextHandle++),
                (r = {
                  refcount: t.nodelete ? 1 / 0 : 1,
                  name: e,
                  module: "loading",
                  global: t.global,
                }),
                (Me.loadedLibNames[e] = n),
                (Me.loadedLibs[n] = r),
                t.loadAsync
                  ? o().then(function (e) {
                      return _(e), n;
                    })
                  : (_(o()), n)
              );
            }
            function Ne() {
              for (var e in ce)
                if (0 == ce[e].value) {
                  var t = Ae(e, !0);
                  "function" == typeof t
                    ? (ce[e].value = M(t, t.sig))
                    : "number" == typeof t
                    ? (ce[e].value = t)
                    : P(!1, "bad export type for `" + e + "`: " + typeof t);
                }
            }
            Module.___heap_base = ve;
            var Pe,
              ke = new WebAssembly.Global(
                { value: "i32", mutable: !0 },
                5250816
              );
            function Ce() {
              se();
            }
            (Module._abort = Ce),
              (Ce.sig = "v"),
              (Pe = n
                ? function () {
                    var e = process.hrtime();
                    return 1e3 * e[0] + e[1] / 1e6;
                  }
                : "undefined" != typeof dateNow
                ? dateNow
                : function () {
                    return performance.now();
                  });
            var qe = !0;
            function Re(e, t) {
              var r, n;
              if (0 === e) r = Date.now();
              else {
                if ((1 !== e && 4 !== e) || !qe)
                  return (n = 28), (L[$e() >> 2] = n), -1;
                r = Pe();
              }
              return (
                (L[t >> 2] = (r / 1e3) | 0),
                (L[(t + 4) >> 2] = ((r % 1e3) * 1e3 * 1e3) | 0),
                0
              );
            }
            function Te(e) {
              try {
                return (
                  I.grow((e - C.byteLength + 65535) >>> 16), G(I.buffer), 1
                );
              } catch (e) {}
            }
            function Le(e) {
              Ke(e);
            }
            function We(e) {
              v(e);
            }
            (Re.sig = "iii"), (Le.sig = "vi"), (We.sig = "vi");
            var Oe,
              Ze = {
                __heap_base: ve,
                __indirect_function_table: B,
                __memory_base: 1024,
                __stack_pointer: ke,
                __table_base: 1,
                abort: Ce,
                clock_gettime: Re,
                emscripten_memcpy_big: function (e, t, r) {
                  R.copyWithin(e, t, t + r);
                },
                emscripten_resize_heap: function (e) {
                  var t,
                    r,
                    n = R.length;
                  if ((e >>>= 0) > 2147483648) return !1;
                  for (var s = 1; s <= 4; s *= 2) {
                    var o = n * (1 + 0.2 / s);
                    if (
                      ((o = Math.min(o, e + 100663296)),
                      Te(
                        Math.min(
                          2147483648,
                          ((t = Math.max(e, o)) % (r = 65536) > 0 &&
                            (t += r - (t % r)),
                          t)
                        )
                      ))
                    )
                      return !0;
                  }
                  return !1;
                },
                exit: Le,
                memory: I,
                setTempRet0: We,
                tree_sitter_log_callback: function (e, t) {
                  if (dt) {
                    const r = $(t);
                    dt(r, 0 !== e);
                  }
                },
                tree_sitter_parse_callback: function (e, t, r, n, s) {
                  var o = lt(t, { row: r, column: n });
                  "string" == typeof o
                    ? (S(s, o.length, "i32"),
                      (function (e, t, r) {
                        if ((void 0 === r && (r = 2147483647), r < 2)) return 0;
                        for (
                          var n = (r -= 2) < 2 * e.length ? r / 2 : e.length,
                            s = 0;
                          s < n;
                          ++s
                        ) {
                          var o = e.charCodeAt(s);
                          (T[t >> 1] = o), (t += 2);
                        }
                        T[t >> 1] = 0;
                      })(o, e, 10240))
                    : S(s, 0, "i32");
                },
              },
              Fe =
                ((function () {
                  var e = {
                    env: Ze,
                    wasi_snapshot_preview1: Ze,
                    "GOT.mem": new Proxy(Ze, me),
                    "GOT.func": new Proxy(Ze, me),
                  };
                  function t(e, t) {
                    var r = e.exports;
                    (r = Ie(r, 1024)), (Module.asm = r);
                    var n,
                      s = pe(t);
                    s.neededDynlibs && (E = s.neededDynlibs.concat(E)),
                      ye(r),
                      (n = Module.asm.__wasm_call_ctors),
                      V.unshift(n),
                      ne();
                  }
                  function r(e) {
                    t(e.instance, e.module);
                  }
                  function n(t) {
                    return (function () {
                      if (!b && (u || i)) {
                        if ("function" == typeof fetch && !le(oe))
                          return fetch(oe, { credentials: "same-origin" })
                            .then(function (e) {
                              if (!e.ok)
                                throw (
                                  "failed to load wasm binary file at '" +
                                  oe +
                                  "'"
                                );
                              return e.arrayBuffer();
                            })
                            .catch(function () {
                              return de(oe);
                            });
                        if (d)
                          return new Promise(function (e, t) {
                            d(
                              oe,
                              function (t) {
                                e(new Uint8Array(t));
                              },
                              t
                            );
                          });
                      }
                      return Promise.resolve().then(function () {
                        return de(oe);
                      });
                    })()
                      .then(function (t) {
                        return WebAssembly.instantiate(t, e);
                      })
                      .then(t, function (e) {
                        h("failed to asynchronously prepare wasm: " + e), se(e);
                      });
                  }
                  if ((re(), Module.instantiateWasm))
                    try {
                      return Module.instantiateWasm(e, t);
                    } catch (e) {
                      return (
                        h(
                          "Module.instantiateWasm callback failed with error: " +
                            e
                        ),
                        !1
                      );
                    }
                  b ||
                  "function" != typeof WebAssembly.instantiateStreaming ||
                  ie(oe) ||
                  le(oe) ||
                  "function" != typeof fetch
                    ? n(r)
                    : fetch(oe, { credentials: "same-origin" }).then(function (
                        t
                      ) {
                        return WebAssembly.instantiateStreaming(t, e).then(
                          r,
                          function (e) {
                            return (
                              h("wasm streaming compile failed: " + e),
                              h("falling back to ArrayBuffer instantiation"),
                              n(r)
                            );
                          }
                        );
                      });
                })(),
                (Module.___wasm_call_ctors = function () {
                  return (Module.___wasm_call_ctors =
                    Module.asm.__wasm_call_ctors).apply(null, arguments);
                }),
                (Module._malloc = function () {
                  return (Fe = Module._malloc = Module.asm.malloc).apply(
                    null,
                    arguments
                  );
                })),
              $e =
                ((Module._ts_language_symbol_count = function () {
                  return (Module._ts_language_symbol_count =
                    Module.asm.ts_language_symbol_count).apply(null, arguments);
                }),
                (Module._ts_language_version = function () {
                  return (Module._ts_language_version =
                    Module.asm.ts_language_version).apply(null, arguments);
                }),
                (Module._ts_language_field_count = function () {
                  return (Module._ts_language_field_count =
                    Module.asm.ts_language_field_count).apply(null, arguments);
                }),
                (Module._ts_language_symbol_name = function () {
                  return (Module._ts_language_symbol_name =
                    Module.asm.ts_language_symbol_name).apply(null, arguments);
                }),
                (Module._ts_language_symbol_for_name = function () {
                  return (Module._ts_language_symbol_for_name =
                    Module.asm.ts_language_symbol_for_name).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_language_symbol_type = function () {
                  return (Module._ts_language_symbol_type =
                    Module.asm.ts_language_symbol_type).apply(null, arguments);
                }),
                (Module._ts_language_field_name_for_id = function () {
                  return (Module._ts_language_field_name_for_id =
                    Module.asm.ts_language_field_name_for_id).apply(
                    null,
                    arguments
                  );
                }),
                (Module._memcpy = function () {
                  return (Module._memcpy = Module.asm.memcpy).apply(
                    null,
                    arguments
                  );
                }),
                (Module._free = function () {
                  return (Module._free = Module.asm.free).apply(
                    null,
                    arguments
                  );
                }),
                (Module._calloc = function () {
                  return (Module._calloc = Module.asm.calloc).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_parser_delete = function () {
                  return (Module._ts_parser_delete =
                    Module.asm.ts_parser_delete).apply(null, arguments);
                }),
                (Module._ts_parser_reset = function () {
                  return (Module._ts_parser_reset =
                    Module.asm.ts_parser_reset).apply(null, arguments);
                }),
                (Module._ts_parser_set_language = function () {
                  return (Module._ts_parser_set_language =
                    Module.asm.ts_parser_set_language).apply(null, arguments);
                }),
                (Module._ts_parser_timeout_micros = function () {
                  return (Module._ts_parser_timeout_micros =
                    Module.asm.ts_parser_timeout_micros).apply(null, arguments);
                }),
                (Module._ts_parser_set_timeout_micros = function () {
                  return (Module._ts_parser_set_timeout_micros =
                    Module.asm.ts_parser_set_timeout_micros).apply(
                    null,
                    arguments
                  );
                }),
                (Module._memmove = function () {
                  return (Module._memmove = Module.asm.memmove).apply(
                    null,
                    arguments
                  );
                }),
                (Module._memcmp = function () {
                  return (Module._memcmp = Module.asm.memcmp).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_query_new = function () {
                  return (Module._ts_query_new = Module.asm.ts_query_new).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_query_delete = function () {
                  return (Module._ts_query_delete =
                    Module.asm.ts_query_delete).apply(null, arguments);
                }),
                (Module._iswspace = function () {
                  return (Module._iswspace = Module.asm.iswspace).apply(
                    null,
                    arguments
                  );
                }),
                (Module._iswalnum = function () {
                  return (Module._iswalnum = Module.asm.iswalnum).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_query_pattern_count = function () {
                  return (Module._ts_query_pattern_count =
                    Module.asm.ts_query_pattern_count).apply(null, arguments);
                }),
                (Module._ts_query_capture_count = function () {
                  return (Module._ts_query_capture_count =
                    Module.asm.ts_query_capture_count).apply(null, arguments);
                }),
                (Module._ts_query_string_count = function () {
                  return (Module._ts_query_string_count =
                    Module.asm.ts_query_string_count).apply(null, arguments);
                }),
                (Module._ts_query_capture_name_for_id = function () {
                  return (Module._ts_query_capture_name_for_id =
                    Module.asm.ts_query_capture_name_for_id).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_query_string_value_for_id = function () {
                  return (Module._ts_query_string_value_for_id =
                    Module.asm.ts_query_string_value_for_id).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_query_predicates_for_pattern = function () {
                  return (Module._ts_query_predicates_for_pattern =
                    Module.asm.ts_query_predicates_for_pattern).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_copy = function () {
                  return (Module._ts_tree_copy = Module.asm.ts_tree_copy).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_delete = function () {
                  return (Module._ts_tree_delete =
                    Module.asm.ts_tree_delete).apply(null, arguments);
                }),
                (Module._ts_init = function () {
                  return (Module._ts_init = Module.asm.ts_init).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_parser_new_wasm = function () {
                  return (Module._ts_parser_new_wasm =
                    Module.asm.ts_parser_new_wasm).apply(null, arguments);
                }),
                (Module._ts_parser_enable_logger_wasm = function () {
                  return (Module._ts_parser_enable_logger_wasm =
                    Module.asm.ts_parser_enable_logger_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_parser_parse_wasm = function () {
                  return (Module._ts_parser_parse_wasm =
                    Module.asm.ts_parser_parse_wasm).apply(null, arguments);
                }),
                (Module._ts_language_type_is_named_wasm = function () {
                  return (Module._ts_language_type_is_named_wasm =
                    Module.asm.ts_language_type_is_named_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_language_type_is_visible_wasm = function () {
                  return (Module._ts_language_type_is_visible_wasm =
                    Module.asm.ts_language_type_is_visible_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_root_node_wasm = function () {
                  return (Module._ts_tree_root_node_wasm =
                    Module.asm.ts_tree_root_node_wasm).apply(null, arguments);
                }),
                (Module._ts_tree_edit_wasm = function () {
                  return (Module._ts_tree_edit_wasm =
                    Module.asm.ts_tree_edit_wasm).apply(null, arguments);
                }),
                (Module._ts_tree_get_changed_ranges_wasm = function () {
                  return (Module._ts_tree_get_changed_ranges_wasm =
                    Module.asm.ts_tree_get_changed_ranges_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_new_wasm = function () {
                  return (Module._ts_tree_cursor_new_wasm =
                    Module.asm.ts_tree_cursor_new_wasm).apply(null, arguments);
                }),
                (Module._ts_tree_cursor_delete_wasm = function () {
                  return (Module._ts_tree_cursor_delete_wasm =
                    Module.asm.ts_tree_cursor_delete_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_reset_wasm = function () {
                  return (Module._ts_tree_cursor_reset_wasm =
                    Module.asm.ts_tree_cursor_reset_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_goto_first_child_wasm = function () {
                  return (Module._ts_tree_cursor_goto_first_child_wasm =
                    Module.asm.ts_tree_cursor_goto_first_child_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_goto_next_sibling_wasm = function () {
                  return (Module._ts_tree_cursor_goto_next_sibling_wasm =
                    Module.asm.ts_tree_cursor_goto_next_sibling_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_goto_parent_wasm = function () {
                  return (Module._ts_tree_cursor_goto_parent_wasm =
                    Module.asm.ts_tree_cursor_goto_parent_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_current_node_type_id_wasm =
                  function () {
                    return (Module._ts_tree_cursor_current_node_type_id_wasm =
                      Module.asm.ts_tree_cursor_current_node_type_id_wasm).apply(
                      null,
                      arguments
                    );
                  }),
                (Module._ts_tree_cursor_current_node_is_named_wasm =
                  function () {
                    return (Module._ts_tree_cursor_current_node_is_named_wasm =
                      Module.asm.ts_tree_cursor_current_node_is_named_wasm).apply(
                      null,
                      arguments
                    );
                  }),
                (Module._ts_tree_cursor_current_node_is_missing_wasm =
                  function () {
                    return (Module._ts_tree_cursor_current_node_is_missing_wasm =
                      Module.asm.ts_tree_cursor_current_node_is_missing_wasm).apply(
                      null,
                      arguments
                    );
                  }),
                (Module._ts_tree_cursor_current_node_id_wasm = function () {
                  return (Module._ts_tree_cursor_current_node_id_wasm =
                    Module.asm.ts_tree_cursor_current_node_id_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_start_position_wasm = function () {
                  return (Module._ts_tree_cursor_start_position_wasm =
                    Module.asm.ts_tree_cursor_start_position_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_end_position_wasm = function () {
                  return (Module._ts_tree_cursor_end_position_wasm =
                    Module.asm.ts_tree_cursor_end_position_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_start_index_wasm = function () {
                  return (Module._ts_tree_cursor_start_index_wasm =
                    Module.asm.ts_tree_cursor_start_index_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_end_index_wasm = function () {
                  return (Module._ts_tree_cursor_end_index_wasm =
                    Module.asm.ts_tree_cursor_end_index_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_current_field_id_wasm = function () {
                  return (Module._ts_tree_cursor_current_field_id_wasm =
                    Module.asm.ts_tree_cursor_current_field_id_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_tree_cursor_current_node_wasm = function () {
                  return (Module._ts_tree_cursor_current_node_wasm =
                    Module.asm.ts_tree_cursor_current_node_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_symbol_wasm = function () {
                  return (Module._ts_node_symbol_wasm =
                    Module.asm.ts_node_symbol_wasm).apply(null, arguments);
                }),
                (Module._ts_node_child_count_wasm = function () {
                  return (Module._ts_node_child_count_wasm =
                    Module.asm.ts_node_child_count_wasm).apply(null, arguments);
                }),
                (Module._ts_node_named_child_count_wasm = function () {
                  return (Module._ts_node_named_child_count_wasm =
                    Module.asm.ts_node_named_child_count_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_child_wasm = function () {
                  return (Module._ts_node_child_wasm =
                    Module.asm.ts_node_child_wasm).apply(null, arguments);
                }),
                (Module._ts_node_named_child_wasm = function () {
                  return (Module._ts_node_named_child_wasm =
                    Module.asm.ts_node_named_child_wasm).apply(null, arguments);
                }),
                (Module._ts_node_child_by_field_id_wasm = function () {
                  return (Module._ts_node_child_by_field_id_wasm =
                    Module.asm.ts_node_child_by_field_id_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_next_sibling_wasm = function () {
                  return (Module._ts_node_next_sibling_wasm =
                    Module.asm.ts_node_next_sibling_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_prev_sibling_wasm = function () {
                  return (Module._ts_node_prev_sibling_wasm =
                    Module.asm.ts_node_prev_sibling_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_next_named_sibling_wasm = function () {
                  return (Module._ts_node_next_named_sibling_wasm =
                    Module.asm.ts_node_next_named_sibling_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_prev_named_sibling_wasm = function () {
                  return (Module._ts_node_prev_named_sibling_wasm =
                    Module.asm.ts_node_prev_named_sibling_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_parent_wasm = function () {
                  return (Module._ts_node_parent_wasm =
                    Module.asm.ts_node_parent_wasm).apply(null, arguments);
                }),
                (Module._ts_node_descendant_for_index_wasm = function () {
                  return (Module._ts_node_descendant_for_index_wasm =
                    Module.asm.ts_node_descendant_for_index_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_named_descendant_for_index_wasm = function () {
                  return (Module._ts_node_named_descendant_for_index_wasm =
                    Module.asm.ts_node_named_descendant_for_index_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_descendant_for_position_wasm = function () {
                  return (Module._ts_node_descendant_for_position_wasm =
                    Module.asm.ts_node_descendant_for_position_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_named_descendant_for_position_wasm =
                  function () {
                    return (Module._ts_node_named_descendant_for_position_wasm =
                      Module.asm.ts_node_named_descendant_for_position_wasm).apply(
                      null,
                      arguments
                    );
                  }),
                (Module._ts_node_start_point_wasm = function () {
                  return (Module._ts_node_start_point_wasm =
                    Module.asm.ts_node_start_point_wasm).apply(null, arguments);
                }),
                (Module._ts_node_end_point_wasm = function () {
                  return (Module._ts_node_end_point_wasm =
                    Module.asm.ts_node_end_point_wasm).apply(null, arguments);
                }),
                (Module._ts_node_start_index_wasm = function () {
                  return (Module._ts_node_start_index_wasm =
                    Module.asm.ts_node_start_index_wasm).apply(null, arguments);
                }),
                (Module._ts_node_end_index_wasm = function () {
                  return (Module._ts_node_end_index_wasm =
                    Module.asm.ts_node_end_index_wasm).apply(null, arguments);
                }),
                (Module._ts_node_to_string_wasm = function () {
                  return (Module._ts_node_to_string_wasm =
                    Module.asm.ts_node_to_string_wasm).apply(null, arguments);
                }),
                (Module._ts_node_children_wasm = function () {
                  return (Module._ts_node_children_wasm =
                    Module.asm.ts_node_children_wasm).apply(null, arguments);
                }),
                (Module._ts_node_named_children_wasm = function () {
                  return (Module._ts_node_named_children_wasm =
                    Module.asm.ts_node_named_children_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_descendants_of_type_wasm = function () {
                  return (Module._ts_node_descendants_of_type_wasm =
                    Module.asm.ts_node_descendants_of_type_wasm).apply(
                    null,
                    arguments
                  );
                }),
                (Module._ts_node_is_named_wasm = function () {
                  return (Module._ts_node_is_named_wasm =
                    Module.asm.ts_node_is_named_wasm).apply(null, arguments);
                }),
                (Module._ts_node_has_changes_wasm = function () {
                  return (Module._ts_node_has_changes_wasm =
                    Module.asm.ts_node_has_changes_wasm).apply(null, arguments);
                }),
                (Module._ts_node_has_error_wasm = function () {
                  return (Module._ts_node_has_error_wasm =
                    Module.asm.ts_node_has_error_wasm).apply(null, arguments);
                }),
                (Module._ts_node_is_missing_wasm = function () {
                  return (Module._ts_node_is_missing_wasm =
                    Module.asm.ts_node_is_missing_wasm).apply(null, arguments);
                }),
                (Module._ts_query_matches_wasm = function () {
                  return (Module._ts_query_matches_wasm =
                    Module.asm.ts_query_matches_wasm).apply(null, arguments);
                }),
                (Module._ts_query_captures_wasm = function () {
                  return (Module._ts_query_captures_wasm =
                    Module.asm.ts_query_captures_wasm).apply(null, arguments);
                }),
                (Module.___errno_location = function () {
                  return ($e = Module.___errno_location =
                    Module.asm.__errno_location).apply(null, arguments);
                })),
              je =
                ((Module._memchr = function () {
                  return (Module._memchr = Module.asm.memchr).apply(
                    null,
                    arguments
                  );
                }),
                (Module._iswdigit = function () {
                  return (Module._iswdigit = Module.asm.iswdigit).apply(
                    null,
                    arguments
                  );
                }),
                (Module._iswalpha = function () {
                  return (Module._iswalpha = Module.asm.iswalpha).apply(
                    null,
                    arguments
                  );
                }),
                (Module._iswlower = function () {
                  return (Module._iswlower = Module.asm.iswlower).apply(
                    null,
                    arguments
                  );
                }),
                (Module._towupper = function () {
                  return (Module._towupper = Module.asm.towupper).apply(
                    null,
                    arguments
                  );
                }),
                (Module._strlen = function () {
                  return (Module._strlen = Module.asm.strlen).apply(
                    null,
                    arguments
                  );
                }),
                (Module.stackSave = function () {
                  return (je = Module.stackSave = Module.asm.stackSave).apply(
                    null,
                    arguments
                  );
                })),
              Ue = (Module.stackRestore = function () {
                return (Ue = Module.stackRestore =
                  Module.asm.stackRestore).apply(null, arguments);
              }),
              De = (Module.stackAlloc = function () {
                return (De = Module.stackAlloc = Module.asm.stackAlloc).apply(
                  null,
                  arguments
                );
              }),
              ze = (Module._setThrew = function () {
                return (ze = Module._setThrew = Module.asm.setThrew).apply(
                  null,
                  arguments
                );
              });
            (Module.__ZNKSt3__220__vector_base_commonILb1EE20__throw_length_errorEv =
              function () {
                return (Module.__ZNKSt3__220__vector_base_commonILb1EE20__throw_length_errorEv =
                  Module.asm._ZNKSt3__220__vector_base_commonILb1EE20__throw_length_errorEv).apply(
                  null,
                  arguments
                );
              }),
              (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev =
                function () {
                  return (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev =
                    Module.asm._ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev).apply(
                    null,
                    arguments
                  );
                }),
              (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEmmmmmm =
                function () {
                  return (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEmmmmmm =
                    Module.asm._ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEmmmmmm).apply(
                    null,
                    arguments
                  );
                }),
              (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcm =
                function () {
                  return (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcm =
                    Module.asm._ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcm).apply(
                    null,
                    arguments
                  );
                }),
              (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm =
                function () {
                  return (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm =
                    Module.asm._ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm).apply(
                    null,
                    arguments
                  );
                }),
              (Module.__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4copyEPcmm =
                function () {
                  return (Module.__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4copyEPcmm =
                    Module.asm._ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4copyEPcmm).apply(
                    null,
                    arguments
                  );
                }),
              (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc =
                function () {
                  return (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc =
                    Module.asm._ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc).apply(
                    null,
                    arguments
                  );
                }),
              (Module.__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED2Ev =
                function () {
                  return (Module.__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED2Ev =
                    Module.asm._ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED2Ev).apply(
                    null,
                    arguments
                  );
                }),
              (Module.__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9push_backEw =
                function () {
                  return (Module.__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9push_backEw =
                    Module.asm._ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9push_backEw).apply(
                    null,
                    arguments
                  );
                }),
              (Module.__Znwm = function () {
                return (Module.__Znwm = Module.asm._Znwm).apply(
                  null,
                  arguments
                );
              }),
              (Module.__ZdlPv = function () {
                return (Module.__ZdlPv = Module.asm._ZdlPv).apply(
                  null,
                  arguments
                );
              }),
              (Module._orig$ts_parser_timeout_micros = function () {
                return (Module._orig$ts_parser_timeout_micros =
                  Module.asm.orig$ts_parser_timeout_micros).apply(
                  null,
                  arguments
                );
              }),
              (Module._orig$ts_parser_set_timeout_micros = function () {
                return (Module._orig$ts_parser_set_timeout_micros =
                  Module.asm.orig$ts_parser_set_timeout_micros).apply(
                  null,
                  arguments
                );
              });
            function Ge(e) {
              (this.name = "ExitStatus"),
                (this.message = "Program terminated with exit(" + e + ")"),
                (this.status = e);
            }
            Module.allocate = function (e, t) {
              var r;
              return (
                (r = t == k ? De(e.length) : Fe(e.length)),
                e.subarray || e.slice
                  ? R.set(e, r)
                  : R.set(new Uint8Array(e), r),
                r
              );
            };
            te = function e() {
              Oe || Be(), Oe || (te = e);
            };
            var He = !1;
            function Be(e) {
              function t() {
                Oe ||
                  ((Oe = !0),
                  (Module.calledRun = !0),
                  N ||
                    ((J = !0),
                    fe(V),
                    fe(X),
                    Module.onRuntimeInitialized &&
                      Module.onRuntimeInitialized(),
                    Ve &&
                      (function (e) {
                        var t = Module._main;
                        if (t) {
                          var r = (e = e || []).length + 1,
                            n = De(4 * (r + 1));
                          L[n >> 2] = z(_);
                          for (var s = 1; s < r; s++)
                            L[(n >> 2) + s] = z(e[s - 1]);
                          L[(n >> 2) + r] = 0;
                          try {
                            Ke(t(r, n), !0);
                          } catch (e) {
                            if (e instanceof Ge) return;
                            if ("unwind" == e) return;
                            var o = e;
                            e &&
                              "object" == typeof e &&
                              e.stack &&
                              (o = [e, e.stack]),
                              h("exception thrown: " + o),
                              a(1, e);
                          } finally {
                            !0;
                          }
                        }
                      })(e),
                    (function () {
                      if (Module.postRun)
                        for (
                          "function" == typeof Module.postRun &&
                          (Module.postRun = [Module.postRun]);
                          Module.postRun.length;

                        )
                          (e = Module.postRun.shift()), Q.unshift(e);
                      var e;
                      fe(Q);
                    })()));
              }
              (e = e || o),
                Y > 0 ||
                  (!He &&
                    ((function () {
                      if (E.length) {
                        if (!c)
                          return (
                            re(),
                            void E.reduce(function (e, t) {
                              return e.then(function () {
                                return xe(t, {
                                  loadAsync: !0,
                                  global: !0,
                                  nodelete: !0,
                                  allowUndefined: !0,
                                });
                              });
                            }, Promise.resolve()).then(function () {
                              ne(), Ne();
                            })
                          );
                        E.forEach(function (e) {
                          xe(e, {
                            global: !0,
                            nodelete: !0,
                            allowUndefined: !0,
                          });
                        }),
                          Ne();
                      } else Ne();
                    })(),
                    (He = !0),
                    Y > 0)) ||
                  (!(function () {
                    if (Module.preRun)
                      for (
                        "function" == typeof Module.preRun &&
                        (Module.preRun = [Module.preRun]);
                        Module.preRun.length;

                      )
                        (e = Module.preRun.shift()), K.unshift(e);
                    var e;
                    fe(K);
                  })(),
                  Y > 0 ||
                    (Module.setStatus
                      ? (Module.setStatus("Running..."),
                        setTimeout(function () {
                          setTimeout(function () {
                            Module.setStatus("");
                          }, 1),
                            t();
                        }, 1))
                      : t()));
            }
            function Ke(e, t) {
              e,
                (t && ge() && 0 === e) ||
                  (ge() || (!0, Module.onExit && Module.onExit(e), (N = !0)),
                  a(e, new Ge(e)));
            }
            if (((Module.run = Be), Module.preInit))
              for (
                "function" == typeof Module.preInit &&
                (Module.preInit = [Module.preInit]);
                Module.preInit.length > 0;

              )
                Module.preInit.pop()();
            var Ve = !0;
            Module.noInitialRun && (Ve = !1), Be();
            const Xe = Module,
              Qe = {},
              Je = 4,
              Ye = 5 * Je,
              et = 2 * Je,
              tt = 2 * Je + 2 * et,
              rt = { row: 0, column: 0 },
              nt = /[\w-.]*/g,
              st = 1,
              ot = 2,
              _t = /^_?tree_sitter_\w+/;
            var at, ut, it, lt, dt;
            class ParserImpl {
              static init() {
                (it = Xe._ts_init()),
                  (at = x(it, "i32")),
                  (ut = x(it + Je, "i32"));
              }
              initialize() {
                Xe._ts_parser_new_wasm(),
                  (this[0] = x(it, "i32")),
                  (this[1] = x(it + Je, "i32"));
              }
              delete() {
                Xe._ts_parser_delete(this[0]),
                  Xe._free(this[1]),
                  (this[0] = 0),
                  (this[1] = 0);
              }
              setLanguage(e) {
                let t;
                if (e) {
                  if (e.constructor !== Language)
                    throw new Error("Argument must be a Language");
                  {
                    t = e[0];
                    const r = Xe._ts_language_version(t);
                    if (r < ut || at < r)
                      throw new Error(
                        `Incompatible language version ${r}. ` +
                          `Compatibility range ${ut} through ${at}.`
                      );
                  }
                } else (t = 0), (e = null);
                return (
                  (this.language = e),
                  Xe._ts_parser_set_language(this[0], t),
                  this
                );
              }
              getLanguage() {
                return this.language;
              }
              parse(e, t, r) {
                if ("string" == typeof e) lt = (t, r, n) => e.slice(t, n);
                else {
                  if ("function" != typeof e)
                    throw new Error("Argument must be a string or a function");
                  lt = e;
                }
                this.logCallback
                  ? ((dt = this.logCallback),
                    Xe._ts_parser_enable_logger_wasm(this[0], 1))
                  : ((dt = null), Xe._ts_parser_enable_logger_wasm(this[0], 0));
                let n = 0,
                  s = 0;
                if (r && r.includedRanges) {
                  n = r.includedRanges.length;
                  let e = (s = Xe._calloc(n, tt));
                  for (let t = 0; t < n; t++)
                    vt(e, r.includedRanges[t]), (e += tt);
                }
                const o = Xe._ts_parser_parse_wasm(
                  this[0],
                  this[1],
                  t ? t[0] : 0,
                  s,
                  n
                );
                if (!o)
                  throw ((lt = null), (dt = null), new Error("Parsing failed"));
                const _ = new Tree(Qe, o, this.language, lt);
                return (lt = null), (dt = null), _;
              }
              reset() {
                Xe._ts_parser_reset(this[0]);
              }
              setTimeoutMicros(e) {
                Xe._ts_parser_set_timeout_micros(this[0], e);
              }
              getTimeoutMicros() {
                return Xe._ts_parser_timeout_micros(this[0]);
              }
              setLogger(e) {
                if (e) {
                  if ("function" != typeof e)
                    throw new Error("Logger callback must be a function");
                } else e = null;
                return (this.logCallback = e), this;
              }
              getLogger() {
                return this.logCallback;
              }
            }
            class Tree {
              constructor(e, t, r, n) {
                ft(e),
                  (this[0] = t),
                  (this.language = r),
                  (this.textCallback = n);
              }
              copy() {
                const e = Xe._ts_tree_copy(this[0]);
                return new Tree(Qe, e, this.language, this.textCallback);
              }
              delete() {
                Xe._ts_tree_delete(this[0]), (this[0] = 0);
              }
              edit(e) {
                !(function (e) {
                  let t = it;
                  Mt(t, e.startPosition),
                    Mt((t += et), e.oldEndPosition),
                    Mt((t += et), e.newEndPosition),
                    S((t += et), e.startIndex, "i32"),
                    S((t += Je), e.oldEndIndex, "i32"),
                    S((t += Je), e.newEndIndex, "i32"),
                    (t += Je);
                })(e),
                  Xe._ts_tree_edit_wasm(this[0]);
              }
              get rootNode() {
                return Xe._ts_tree_root_node_wasm(this[0]), gt(this);
              }
              getLanguage() {
                return this.language;
              }
              walk() {
                return this.rootNode.walk();
              }
              getChangedRanges(e) {
                if (e.constructor !== Tree)
                  throw new TypeError("Argument must be a Tree");
                Xe._ts_tree_get_changed_ranges_wasm(this[0], e[0]);
                const t = x(it, "i32"),
                  r = x(it + Je, "i32"),
                  n = new Array(t);
                if (t > 0) {
                  let e = r;
                  for (let r = 0; r < t; r++) (n[r] = Et(e)), (e += tt);
                  Xe._free(r);
                }
                return n;
              }
            }
            class Node {
              constructor(e, t) {
                ft(e), (this.tree = t);
              }
              get typeId() {
                return ht(this), Xe._ts_node_symbol_wasm(this.tree[0]);
              }
              get type() {
                return this.tree.language.types[this.typeId] || "ERROR";
              }
              get endPosition() {
                return (
                  ht(this), Xe._ts_node_end_point_wasm(this.tree[0]), bt(it)
                );
              }
              get endIndex() {
                return ht(this), Xe._ts_node_end_index_wasm(this.tree[0]);
              }
              get text() {
                return ct(this.tree, this.startIndex, this.endIndex);
              }
              isNamed() {
                return ht(this), 1 === Xe._ts_node_is_named_wasm(this.tree[0]);
              }
              hasError() {
                return ht(this), 1 === Xe._ts_node_has_error_wasm(this.tree[0]);
              }
              hasChanges() {
                return (
                  ht(this), 1 === Xe._ts_node_has_changes_wasm(this.tree[0])
                );
              }
              isMissing() {
                return (
                  ht(this), 1 === Xe._ts_node_is_missing_wasm(this.tree[0])
                );
              }
              equals(e) {
                return this.id === e.id;
              }
              child(e) {
                return (
                  ht(this),
                  Xe._ts_node_child_wasm(this.tree[0], e),
                  gt(this.tree)
                );
              }
              namedChild(e) {
                return (
                  ht(this),
                  Xe._ts_node_named_child_wasm(this.tree[0], e),
                  gt(this.tree)
                );
              }
              childForFieldId(e) {
                return (
                  ht(this),
                  Xe._ts_node_child_by_field_id_wasm(this.tree[0], e),
                  gt(this.tree)
                );
              }
              childForFieldName(e) {
                const t = this.tree.language.fields.indexOf(e);
                if (-1 !== t) return this.childForFieldId(t);
              }
              get childCount() {
                return ht(this), Xe._ts_node_child_count_wasm(this.tree[0]);
              }
              get namedChildCount() {
                return (
                  ht(this), Xe._ts_node_named_child_count_wasm(this.tree[0])
                );
              }
              get firstChild() {
                return this.child(0);
              }
              get firstNamedChild() {
                return this.namedChild(0);
              }
              get lastChild() {
                return this.child(this.childCount - 1);
              }
              get lastNamedChild() {
                return this.namedChild(this.namedChildCount - 1);
              }
              get children() {
                if (!this._children) {
                  ht(this), Xe._ts_node_children_wasm(this.tree[0]);
                  const e = x(it, "i32"),
                    t = x(it + Je, "i32");
                  if (((this._children = new Array(e)), e > 0)) {
                    let r = t;
                    for (let t = 0; t < e; t++)
                      (this._children[t] = gt(this.tree, r)), (r += Ye);
                    Xe._free(t);
                  }
                }
                return this._children;
              }
              get namedChildren() {
                if (!this._namedChildren) {
                  ht(this), Xe._ts_node_named_children_wasm(this.tree[0]);
                  const e = x(it, "i32"),
                    t = x(it + Je, "i32");
                  if (((this._namedChildren = new Array(e)), e > 0)) {
                    let r = t;
                    for (let t = 0; t < e; t++)
                      (this._namedChildren[t] = gt(this.tree, r)), (r += Ye);
                    Xe._free(t);
                  }
                }
                return this._namedChildren;
              }
              descendantsOfType(e, t, r) {
                Array.isArray(e) || (e = [e]), t || (t = rt), r || (r = rt);
                const n = [],
                  s = this.tree.language.types;
                for (let t = 0, r = s.length; t < r; t++)
                  e.includes(s[t]) && n.push(t);
                const o = Xe._malloc(Je * n.length);
                for (let e = 0, t = n.length; e < t; e++)
                  S(o + e * Je, n[e], "i32");
                ht(this),
                  Xe._ts_node_descendants_of_type_wasm(
                    this.tree[0],
                    o,
                    n.length,
                    t.row,
                    t.column,
                    r.row,
                    r.column
                  );
                const _ = x(it, "i32"),
                  a = x(it + Je, "i32"),
                  u = new Array(_);
                if (_ > 0) {
                  let e = a;
                  for (let t = 0; t < _; t++)
                    (u[t] = gt(this.tree, e)), (e += Ye);
                }
                return Xe._free(a), Xe._free(o), u;
              }
              get nextSibling() {
                return (
                  ht(this),
                  Xe._ts_node_next_sibling_wasm(this.tree[0]),
                  gt(this.tree)
                );
              }
              get previousSibling() {
                return (
                  ht(this),
                  Xe._ts_node_prev_sibling_wasm(this.tree[0]),
                  gt(this.tree)
                );
              }
              get nextNamedSibling() {
                return (
                  ht(this),
                  Xe._ts_node_next_named_sibling_wasm(this.tree[0]),
                  gt(this.tree)
                );
              }
              get previousNamedSibling() {
                return (
                  ht(this),
                  Xe._ts_node_prev_named_sibling_wasm(this.tree[0]),
                  gt(this.tree)
                );
              }
              get parent() {
                return (
                  ht(this), Xe._ts_node_parent_wasm(this.tree[0]), gt(this.tree)
                );
              }
              descendantForIndex(e, t = e) {
                if ("number" != typeof e || "number" != typeof t)
                  throw new Error("Arguments must be numbers");
                ht(this);
                let r = it + Ye;
                return (
                  S(r, e, "i32"),
                  S(r + Je, t, "i32"),
                  Xe._ts_node_descendant_for_index_wasm(this.tree[0]),
                  gt(this.tree)
                );
              }
              namedDescendantForIndex(e, t = e) {
                if ("number" != typeof e || "number" != typeof t)
                  throw new Error("Arguments must be numbers");
                ht(this);
                let r = it + Ye;
                return (
                  S(r, e, "i32"),
                  S(r + Je, t, "i32"),
                  Xe._ts_node_named_descendant_for_index_wasm(this.tree[0]),
                  gt(this.tree)
                );
              }
              descendantForPosition(e, t = e) {
                if (!pt(e) || !pt(t))
                  throw new Error("Arguments must be {row, column} objects");
                ht(this);
                let r = it + Ye;
                return (
                  Mt(r, e),
                  Mt(r + et, t),
                  Xe._ts_node_descendant_for_position_wasm(this.tree[0]),
                  gt(this.tree)
                );
              }
              namedDescendantForPosition(e, t = e) {
                if (!pt(e) || !pt(t))
                  throw new Error("Arguments must be {row, column} objects");
                ht(this);
                let r = it + Ye;
                return (
                  Mt(r, e),
                  Mt(r + et, t),
                  Xe._ts_node_named_descendant_for_position_wasm(this.tree[0]),
                  gt(this.tree)
                );
              }
              walk() {
                return (
                  ht(this),
                  Xe._ts_tree_cursor_new_wasm(this.tree[0]),
                  new TreeCursor(Qe, this.tree)
                );
              }
              toString() {
                ht(this);
                const e = Xe._ts_node_to_string_wasm(this.tree[0]),
                  t = (function (e) {
                    for (var t = ""; ; ) {
                      var r = R[e++ >> 0];
                      if (!r) return t;
                      t += String.fromCharCode(r);
                    }
                  })(e);
                return Xe._free(e), t;
              }
            }
            class TreeCursor {
              constructor(e, t) {
                ft(e), (this.tree = t), yt(this);
              }
              delete() {
                wt(this),
                  Xe._ts_tree_cursor_delete_wasm(this.tree[0]),
                  (this[0] = this[1] = this[2] = 0);
              }
              reset(e) {
                ht(e),
                  wt(this, it + Ye),
                  Xe._ts_tree_cursor_reset_wasm(this.tree[0]),
                  yt(this);
              }
              get nodeType() {
                return this.tree.language.types[this.nodeTypeId] || "ERROR";
              }
              get nodeTypeId() {
                return (
                  wt(this),
                  Xe._ts_tree_cursor_current_node_type_id_wasm(this.tree[0])
                );
              }
              get nodeId() {
                return (
                  wt(this),
                  Xe._ts_tree_cursor_current_node_id_wasm(this.tree[0])
                );
              }
              get nodeIsNamed() {
                return (
                  wt(this),
                  1 ===
                    Xe._ts_tree_cursor_current_node_is_named_wasm(this.tree[0])
                );
              }
              get nodeIsMissing() {
                return (
                  wt(this),
                  1 ===
                    Xe._ts_tree_cursor_current_node_is_missing_wasm(
                      this.tree[0]
                    )
                );
              }
              get nodeText() {
                wt(this);
                const e = Xe._ts_tree_cursor_start_index_wasm(this.tree[0]),
                  t = Xe._ts_tree_cursor_end_index_wasm(this.tree[0]);
                return ct(this.tree, e, t);
              }
              get startPosition() {
                return (
                  wt(this),
                  Xe._ts_tree_cursor_start_position_wasm(this.tree[0]),
                  bt(it)
                );
              }
              get endPosition() {
                return (
                  wt(this),
                  Xe._ts_tree_cursor_end_position_wasm(this.tree[0]),
                  bt(it)
                );
              }
              get startIndex() {
                return (
                  wt(this), Xe._ts_tree_cursor_start_index_wasm(this.tree[0])
                );
              }
              get endIndex() {
                return (
                  wt(this), Xe._ts_tree_cursor_end_index_wasm(this.tree[0])
                );
              }
              currentNode() {
                return (
                  wt(this),
                  Xe._ts_tree_cursor_current_node_wasm(this.tree[0]),
                  gt(this.tree)
                );
              }
              currentFieldId() {
                return (
                  wt(this),
                  Xe._ts_tree_cursor_current_field_id_wasm(this.tree[0])
                );
              }
              currentFieldName() {
                return this.tree.language.fields[this.currentFieldId()];
              }
              gotoFirstChild() {
                wt(this);
                const e = Xe._ts_tree_cursor_goto_first_child_wasm(
                  this.tree[0]
                );
                return yt(this), 1 === e;
              }
              gotoNextSibling() {
                wt(this);
                const e = Xe._ts_tree_cursor_goto_next_sibling_wasm(
                  this.tree[0]
                );
                return yt(this), 1 === e;
              }
              gotoParent() {
                wt(this);
                const e = Xe._ts_tree_cursor_goto_parent_wasm(this.tree[0]);
                return yt(this), 1 === e;
              }
            }
            class Language {
              constructor(e, t) {
                ft(e),
                  (this[0] = t),
                  (this.types = new Array(
                    Xe._ts_language_symbol_count(this[0])
                  ));
                for (let e = 0, t = this.types.length; e < t; e++)
                  Xe._ts_language_symbol_type(this[0], e) < 2 &&
                    (this.types[e] = $(
                      Xe._ts_language_symbol_name(this[0], e)
                    ));
                this.fields = new Array(
                  Xe._ts_language_field_count(this[0]) + 1
                );
                for (let e = 0, t = this.fields.length; e < t; e++) {
                  const t = Xe._ts_language_field_name_for_id(this[0], e);
                  this.fields[e] = 0 !== t ? $(t) : null;
                }
              }
              get version() {
                return Xe._ts_language_version(this[0]);
              }
              get fieldCount() {
                return this.fields.length - 1;
              }
              fieldIdForName(e) {
                const t = this.fields.indexOf(e);
                return -1 !== t ? t : null;
              }
              fieldNameForId(e) {
                return this.fields[e] || null;
              }
              idForNodeType(e, t) {
                const r = D(e),
                  n = Xe._malloc(r + 1);
                U(e, n, r + 1);
                const s = Xe._ts_language_symbol_for_name(this[0], n, r, t);
                return Xe._free(n), s || null;
              }
              get nodeTypeCount() {
                return Xe._ts_language_symbol_count(this[0]);
              }
              nodeTypeForId(e) {
                const t = Xe._ts_language_symbol_name(this[0], e);
                return t ? $(t) : null;
              }
              nodeTypeIsNamed(e) {
                return !!Xe._ts_language_type_is_named_wasm(this[0], e);
              }
              nodeTypeIsVisible(e) {
                return !!Xe._ts_language_type_is_visible_wasm(this[0], e);
              }
              query(e) {
                const t = D(e),
                  r = Xe._malloc(t + 1);
                U(e, r, t + 1);
                const n = Xe._ts_query_new(this[0], r, t, it, it + Je);
                if (!n) {
                  const t = x(it + Je, "i32"),
                    n = $(r, x(it, "i32")).length,
                    s = e.substr(n, 100).split("\n")[0];
                  let o,
                    _ = s.match(nt)[0];
                  switch (t) {
                    case 2:
                      o = new RangeError(`Bad node name '${_}'`);
                      break;
                    case 3:
                      o = new RangeError(`Bad field name '${_}'`);
                      break;
                    case 4:
                      o = new RangeError(`Bad capture name @${_}`);
                      break;
                    case 5:
                      (o = new TypeError(
                        `Bad pattern structure at offset ${n}: '${s}'...`
                      )),
                        (_ = "");
                      break;
                    default:
                      (o = new SyntaxError(
                        `Bad syntax at offset ${n}: '${s}'...`
                      )),
                        (_ = "");
                  }
                  throw ((o.index = n), (o.length = _.length), Xe._free(r), o);
                }
                const s = Xe._ts_query_string_count(n),
                  o = Xe._ts_query_capture_count(n),
                  _ = Xe._ts_query_pattern_count(n),
                  a = new Array(o),
                  u = new Array(s);
                for (let e = 0; e < o; e++) {
                  const t = Xe._ts_query_capture_name_for_id(n, e, it),
                    r = x(it, "i32");
                  a[e] = $(t, r);
                }
                for (let e = 0; e < s; e++) {
                  const t = Xe._ts_query_string_value_for_id(n, e, it),
                    r = x(it, "i32");
                  u[e] = $(t, r);
                }
                const i = new Array(_),
                  l = new Array(_),
                  d = new Array(_),
                  c = new Array(_),
                  m = new Array(_);
                for (let e = 0; e < _; e++) {
                  const t = Xe._ts_query_predicates_for_pattern(n, e, it),
                    r = x(it, "i32");
                  (c[e] = []), (m[e] = []);
                  const s = [];
                  let o = t;
                  for (let t = 0; t < r; t++) {
                    const t = x(o, "i32"),
                      r = x((o += Je), "i32");
                    if (((o += Je), t === st))
                      s.push({ type: "capture", name: a[r] });
                    else if (t === ot) s.push({ type: "string", value: u[r] });
                    else if (s.length > 0) {
                      if ("string" !== s[0].type)
                        throw new Error(
                          "Predicates must begin with a literal value"
                        );
                      const t = s[0].value;
                      let r = !0;
                      switch (t) {
                        case "not-eq?":
                          r = !1;
                        case "eq?":
                          if (3 !== s.length)
                            throw new Error(
                              `Wrong number of arguments to \`#eq?\` predicate. Expected 2, got ${
                                s.length - 1
                              }`
                            );
                          if ("capture" !== s[1].type)
                            throw new Error(
                              `First argument of \`#eq?\` predicate must be a capture. Got "${s[1].value}"`
                            );
                          if ("capture" === s[2].type) {
                            const t = s[1].name,
                              n = s[2].name;
                            m[e].push(function (e) {
                              let s, o;
                              for (const r of e)
                                r.name === t && (s = r.node),
                                  r.name === n && (o = r.node);
                              return (
                                void 0 === s ||
                                void 0 === o ||
                                (s.text === o.text) === r
                              );
                            });
                          } else {
                            const t = s[1].name,
                              n = s[2].value;
                            m[e].push(function (e) {
                              for (const s of e)
                                if (s.name === t)
                                  return (s.node.text === n) === r;
                              return !0;
                            });
                          }
                          break;
                        case "not-match?":
                          r = !1;
                        case "match?":
                          if (3 !== s.length)
                            throw new Error(
                              `Wrong number of arguments to \`#match?\` predicate. Expected 2, got ${
                                s.length - 1
                              }.`
                            );
                          if ("capture" !== s[1].type)
                            throw new Error(
                              `First argument of \`#match?\` predicate must be a capture. Got "${s[1].value}".`
                            );
                          if ("string" !== s[2].type)
                            throw new Error(
                              `Second argument of \`#match?\` predicate must be a string. Got @${s[2].value}.`
                            );
                          const n = s[1].name,
                            o = new RegExp(s[2].value);
                          m[e].push(function (e) {
                            for (const t of e)
                              if (t.name === n)
                                return o.test(t.node.text) === r;
                            return !0;
                          });
                          break;
                        case "set!":
                          if (s.length < 2 || s.length > 3)
                            throw new Error(
                              `Wrong number of arguments to \`#set!\` predicate. Expected 1 or 2. Got ${
                                s.length - 1
                              }.`
                            );
                          if (s.some((e) => "string" !== e.type))
                            throw new Error(
                              'Arguments to `#set!` predicate must be a strings.".'
                            );
                          i[e] || (i[e] = {}),
                            (i[e][s[1].value] = s[2] ? s[2].value : null);
                          break;
                        case "is?":
                        case "is-not?":
                          if (s.length < 2 || s.length > 3)
                            throw new Error(
                              `Wrong number of arguments to \`#${t}\` predicate. Expected 1 or 2. Got ${
                                s.length - 1
                              }.`
                            );
                          if (s.some((e) => "string" !== e.type))
                            throw new Error(
                              `Arguments to \`#${t}\` predicate must be a strings.".`
                            );
                          const _ = "is?" === t ? l : d;
                          _[e] || (_[e] = {}),
                            (_[e][s[1].value] = s[2] ? s[2].value : null);
                          break;
                        default:
                          c[e].push({ operator: t, operands: s.slice(1) });
                      }
                      s.length = 0;
                    }
                  }
                  Object.freeze(i[e]), Object.freeze(l[e]), Object.freeze(d[e]);
                }
                return (
                  Xe._free(r),
                  new Query(
                    Qe,
                    n,
                    a,
                    m,
                    c,
                    Object.freeze(i),
                    Object.freeze(l),
                    Object.freeze(d)
                  )
                );
              }
              static load(e) {
                let t;
                if (e instanceof Uint8Array) t = Promise.resolve(e);
                else {
                  const r = e;
                  if (
                    "undefined" != typeof process &&
                    process.versions &&
                    process.versions.node
                  ) {
                    const e = require("fs");
                    t = Promise.resolve(e.readFileSync(r));
                  } else
                    t = fetch(r).then((e) =>
                      e.arrayBuffer().then((t) => {
                        if (e.ok) return new Uint8Array(t);
                        {
                          const r = new TextDecoder("utf-8").decode(t);
                          throw new Error(
                            `Language.load failed with status ${e.status}.\n\n${r}`
                          );
                        }
                      })
                    );
                }
                const r =
                  "function" == typeof loadSideModule ? loadSideModule : Se;
                return t
                  .then((e) => r(e, { loadAsync: !0 }))
                  .then((e) => {
                    const t = Object.keys(e),
                      r = t.find(
                        (e) => _t.test(e) && !e.includes("external_scanner_")
                      );
                    r ||
                      console.log(
                        `Couldn't find language function in WASM file. Symbols:\n${JSON.stringify(
                          t,
                          null,
                          2
                        )}`
                      );
                    const n = e[r]();
                    return new Language(Qe, n);
                  });
              }
            }
            class Query {
              constructor(e, t, r, n, s, o, _, a) {
                ft(e),
                  (this[0] = t),
                  (this.captureNames = r),
                  (this.textPredicates = n),
                  (this.predicates = s),
                  (this.setProperties = o),
                  (this.assertedProperties = _),
                  (this.refutedProperties = a),
                  (this.exceededMatchLimit = !1);
              }
              delete() {
                Xe._ts_query_delete(this[0]), (this[0] = 0);
              }
              matches(e, t, r, n) {
                t || (t = rt), r || (r = rt), n || (n = {});
                let s = n.matchLimit;
                if (void 0 === s) s = 0;
                else if ("number" != typeof s)
                  throw new Error("Arguments must be numbers");
                ht(e),
                  Xe._ts_query_matches_wasm(
                    this[0],
                    e.tree[0],
                    t.row,
                    t.column,
                    r.row,
                    r.column,
                    s
                  );
                const o = x(it, "i32"),
                  _ = x(it + Je, "i32"),
                  a = x(it + 2 * Je, "i32"),
                  u = new Array(o);
                this.exceededMatchLimit = !!a;
                let i = 0,
                  l = _;
                for (let t = 0; t < o; t++) {
                  const r = x(l, "i32"),
                    n = x((l += Je), "i32");
                  l += Je;
                  const s = new Array(n);
                  if (
                    ((l = mt(this, e.tree, l, s)),
                    this.textPredicates[r].every((e) => e(s)))
                  ) {
                    u[i++] = { pattern: r, captures: s };
                    const e = this.setProperties[r];
                    e && (u[t].setProperties = e);
                    const n = this.assertedProperties[r];
                    n && (u[t].assertedProperties = n);
                    const o = this.refutedProperties[r];
                    o && (u[t].refutedProperties = o);
                  }
                }
                return (u.length = i), Xe._free(_), u;
              }
              captures(e, t, r, n) {
                t || (t = rt), r || (r = rt), n || (n = {});
                let s = n.matchLimit;
                if (void 0 === s) s = 0;
                else if ("number" != typeof s)
                  throw new Error("Arguments must be numbers");
                ht(e),
                  Xe._ts_query_captures_wasm(
                    this[0],
                    e.tree[0],
                    t.row,
                    t.column,
                    r.row,
                    r.column,
                    s
                  );
                const o = x(it, "i32"),
                  _ = x(it + Je, "i32"),
                  a = x(it + 2 * Je, "i32"),
                  u = [];
                this.exceededMatchLimit = !!a;
                const i = [];
                let l = _;
                for (let t = 0; t < o; t++) {
                  const t = x(l, "i32"),
                    r = x((l += Je), "i32"),
                    n = x((l += Je), "i32");
                  if (
                    ((l += Je),
                    (i.length = r),
                    (l = mt(this, e.tree, l, i)),
                    this.textPredicates[t].every((e) => e(i)))
                  ) {
                    const e = i[n],
                      r = this.setProperties[t];
                    r && (e.setProperties = r);
                    const s = this.assertedProperties[t];
                    s && (e.assertedProperties = s);
                    const o = this.refutedProperties[t];
                    o && (e.refutedProperties = o), u.push(e);
                  }
                }
                return Xe._free(_), u;
              }
              predicatesForPattern(e) {
                return this.predicates[e];
              }
              didExceedMatchLimit() {
                return this.exceededMatchLimit;
              }
            }
            function ct(e, t, r) {
              const n = r - t;
              let s = e.textCallback(t, null, r);
              for (t += s.length; t < r; ) {
                const n = e.textCallback(t, null, r);
                if (!(n && n.length > 0)) break;
                (t += n.length), (s += n);
              }
              return t > r && (s = s.slice(0, n)), s;
            }
            function mt(e, t, r, n) {
              for (let s = 0, o = n.length; s < o; s++) {
                const o = x(r, "i32"),
                  _ = gt(t, (r += Je));
                (r += Ye), (n[s] = { name: e.captureNames[o], node: _ });
              }
              return r;
            }
            function ft(e) {
              if (e !== Qe) throw new Error("Illegal constructor");
            }
            function pt(e) {
              return (
                e && "number" == typeof e.row && "number" == typeof e.column
              );
            }
            function ht(e) {
              let t = it;
              S(t, e.id, "i32"),
                S((t += Je), e.startIndex, "i32"),
                S((t += Je), e.startPosition.row, "i32"),
                S((t += Je), e.startPosition.column, "i32"),
                S((t += Je), e[0], "i32");
            }
            function gt(e, t = it) {
              const r = x(t, "i32");
              if (0 === r) return null;
              const n = x((t += Je), "i32"),
                s = x((t += Je), "i32"),
                o = x((t += Je), "i32"),
                _ = x((t += Je), "i32"),
                a = new Node(Qe, e);
              return (
                (a.id = r),
                (a.startIndex = n),
                (a.startPosition = { row: s, column: o }),
                (a[0] = _),
                a
              );
            }
            function wt(e, t = it) {
              S(t + 0 * Je, e[0], "i32"),
                S(t + 1 * Je, e[1], "i32"),
                S(t + 2 * Je, e[2], "i32");
            }
            function yt(e) {
              (e[0] = x(it + 0 * Je, "i32")),
                (e[1] = x(it + 1 * Je, "i32")),
                (e[2] = x(it + 2 * Je, "i32"));
            }
            function Mt(e, t) {
              S(e, t.row, "i32"), S(e + Je, t.column, "i32");
            }
            function bt(e) {
              return { row: x(e, "i32"), column: x(e + Je, "i32") };
            }
            function vt(e, t) {
              Mt(e, t.startPosition),
                Mt((e += et), t.endPosition),
                S((e += et), t.startIndex, "i32"),
                S((e += Je), t.endIndex, "i32"),
                (e += Je);
            }
            function Et(e) {
              const t = {};
              return (
                (t.startPosition = bt(e)),
                (e += et),
                (t.endPosition = bt(e)),
                (e += et),
                (t.startIndex = x(e, "i32")),
                (e += Je),
                (t.endIndex = x(e, "i32")),
                t
              );
            }
            for (const e of Object.getOwnPropertyNames(ParserImpl.prototype))
              Object.defineProperty(Parser.prototype, e, {
                value: ParserImpl.prototype[e],
                enumerable: !1,
                writable: !1,
              });
            (Parser.Language = Language),
              (Module.onRuntimeInitialized = () => {
                ParserImpl.init(), e();
              });
          })))
        );
      }
    }
    return Parser;
  })();
"object" == typeof exports && (module.exports = TreeSitter);
