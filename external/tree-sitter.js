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
var Module = void 0 !== Module ? Module : {};

export const TreeSitter = (function () {
  var initPromise,
    document =
      "object" == typeof window
        ? { currentScript: window.document.currentScript }
        : null;
  class Parser {
    constructor() {
      this.initialize();
    }
    initialize() {
      throw new Error("cannot construct a Parser before calling `init()`");
    }
    static init(moduleOptions) {
      return (
        initPromise ||
        ((Module = Object.assign({}, Module, moduleOptions)),
        (initPromise = new Promise((resolveInitPromise) => {
          var moduleOverrides = Object.assign({}, Module),
            arguments_ = [],
            thisProgram = "./this.program",
            quit_ = (e, t) => {
              throw t;
            },
            ENVIRONMENT_IS_WEB = "object" == typeof window,
            ENVIRONMENT_IS_WORKER = "function" == typeof importScripts,
            ENVIRONMENT_IS_NODE =
              "object" == typeof process &&
              "object" == typeof process.versions &&
              "string" == typeof process.versions.node,
            scriptDirectory = "",
            read_,
            readAsync,
            readBinary,
            setWindowTitle;
          function locateFile(e) {
            return Module.locateFile
              ? Module.locateFile(e, scriptDirectory)
              : scriptDirectory + e;
          }
          function logExceptionOnExit(e) {
            if (e instanceof ExitStatus) return;
            err("exiting due to exception: " + e);
          }
          if (ENVIRONMENT_IS_NODE) {
            var fs = require("fs"),
              nodePath = require("path");
            (scriptDirectory = ENVIRONMENT_IS_WORKER
              ? nodePath.dirname(scriptDirectory) + "/"
              : __dirname + "/"),
              (read_ = (e, t) => (
                (e = isFileURI(e) ? new URL(e) : nodePath.normalize(e)),
                fs.readFileSync(e, t ? void 0 : "utf8")
              )),
              (readBinary = (e) => {
                var t = read_(e, !0);
                return t.buffer || (t = new Uint8Array(t)), t;
              }),
              (readAsync = (e, t, r) => {
                (e = isFileURI(e) ? new URL(e) : nodePath.normalize(e)),
                  fs.readFile(e, function (e, _) {
                    e ? r(e) : t(_.buffer);
                  });
              }),
              process.argv.length > 1 &&
                (thisProgram = process.argv[1].replace(/\\/g, "/")),
              (arguments_ = process.argv.slice(2)),
              "undefined" != typeof module && (module.exports = Module),
              (quit_ = (e, t) => {
                if (keepRuntimeAlive()) throw ((process.exitCode = e), t);
                logExceptionOnExit(t), process.exit(e);
              }),
              (Module.inspect = function () {
                return "[Emscripten Module object]";
              });
          } else
            (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) &&
              (ENVIRONMENT_IS_WORKER
                ? (scriptDirectory = self.location.href)
                : void 0 !== document &&
                  document.currentScript &&
                  (scriptDirectory = document.currentScript.src),
              (scriptDirectory =
                0 !== scriptDirectory.indexOf("blob:")
                  ? scriptDirectory.substr(
                      0,
                      scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1
                    )
                  : ""),
              (scriptDirectory =
                moduleOptions.scriptDirectory ?? scriptDirectory),
              (read_ = (e) => {
                var t = new XMLHttpRequest();
                return t.open("GET", e, !1), t.send(null), t.responseText;
              }),
              ENVIRONMENT_IS_WORKER &&
                (readBinary = (e) => {
                  var t = new XMLHttpRequest();
                  return (
                    t.open("GET", e, !1),
                    (t.responseType = "arraybuffer"),
                    t.send(null),
                    new Uint8Array(t.response)
                  );
                }),
              (readAsync = (e, t, r) => {
                var _ = new XMLHttpRequest();
                _.open("GET", e, !0),
                  (_.responseType = "arraybuffer"),
                  (_.onload = () => {
                    200 == _.status || (0 == _.status && _.response)
                      ? t(_.response)
                      : r();
                  }),
                  (_.onerror = r),
                  _.send(null);
              }),
              (setWindowTitle = (e) => (document.title = e)));
          var out = Module.print || console.log.bind(console),
            err = Module.printErr || console.warn.bind(console);
          Object.assign(Module, moduleOverrides),
            (moduleOverrides = null),
            Module.arguments && (arguments_ = Module.arguments),
            Module.thisProgram && (thisProgram = Module.thisProgram),
            Module.quit && (quit_ = Module.quit);
          var STACK_ALIGN = 16,
            dynamicLibraries = Module.dynamicLibraries || [],
            wasmBinary;
          Module.wasmBinary && (wasmBinary = Module.wasmBinary);
          var noExitRuntime = Module.noExitRuntime || !0,
            wasmMemory;
          "object" != typeof WebAssembly &&
            abort("no native wasm support detected");
          var ABORT = !1,
            EXITSTATUS,
            UTF8Decoder =
              "undefined" != typeof TextDecoder
                ? new TextDecoder("utf8")
                : void 0,
            buffer,
            HEAP8,
            HEAPU8,
            HEAP16,
            HEAPU16,
            HEAP32,
            HEAPU32,
            HEAPF32,
            HEAPF64;
          function UTF8ArrayToString(e, t, r) {
            for (var _ = t + r, n = t; e[n] && !(n >= _); ) ++n;
            if (n - t > 16 && e.buffer && UTF8Decoder)
              return UTF8Decoder.decode(e.subarray(t, n));
            for (var s = ""; t < n; ) {
              var a = e[t++];
              if (128 & a) {
                var o = 63 & e[t++];
                if (192 != (224 & a)) {
                  var i = 63 & e[t++];
                  if (
                    (a =
                      224 == (240 & a)
                        ? ((15 & a) << 12) | (o << 6) | i
                        : ((7 & a) << 18) |
                          (o << 12) |
                          (i << 6) |
                          (63 & e[t++])) < 65536
                  )
                    s += String.fromCharCode(a);
                  else {
                    var l = a - 65536;
                    s += String.fromCharCode(
                      55296 | (l >> 10),
                      56320 | (1023 & l)
                    );
                  }
                } else s += String.fromCharCode(((31 & a) << 6) | o);
              } else s += String.fromCharCode(a);
            }
            return s;
          }
          function UTF8ToString(e, t) {
            return e ? UTF8ArrayToString(HEAPU8, e, t) : "";
          }
          function stringToUTF8Array(e, t, r, _) {
            if (!(_ > 0)) return 0;
            for (var n = r, s = r + _ - 1, a = 0; a < e.length; ++a) {
              var o = e.charCodeAt(a);
              if (o >= 55296 && o <= 57343)
                o = (65536 + ((1023 & o) << 10)) | (1023 & e.charCodeAt(++a));
              if (o <= 127) {
                if (r >= s) break;
                t[r++] = o;
              } else if (o <= 2047) {
                if (r + 1 >= s) break;
                (t[r++] = 192 | (o >> 6)), (t[r++] = 128 | (63 & o));
              } else if (o <= 65535) {
                if (r + 2 >= s) break;
                (t[r++] = 224 | (o >> 12)),
                  (t[r++] = 128 | ((o >> 6) & 63)),
                  (t[r++] = 128 | (63 & o));
              } else {
                if (r + 3 >= s) break;
                (t[r++] = 240 | (o >> 18)),
                  (t[r++] = 128 | ((o >> 12) & 63)),
                  (t[r++] = 128 | ((o >> 6) & 63)),
                  (t[r++] = 128 | (63 & o));
              }
            }
            return (t[r] = 0), r - n;
          }
          function stringToUTF8(e, t, r) {
            return stringToUTF8Array(e, HEAPU8, t, r);
          }
          function lengthBytesUTF8(e) {
            for (var t = 0, r = 0; r < e.length; ++r) {
              var _ = e.charCodeAt(r);
              _ <= 127
                ? t++
                : _ <= 2047
                ? (t += 2)
                : _ >= 55296 && _ <= 57343
                ? ((t += 4), ++r)
                : (t += 3);
            }
            return t;
          }
          function updateGlobalBufferAndViews(e) {
            (buffer = e),
              (Module.HEAP8 = HEAP8 = new Int8Array(e)),
              (Module.HEAP16 = HEAP16 = new Int16Array(e)),
              (Module.HEAP32 = HEAP32 = new Int32Array(e)),
              (Module.HEAPU8 = HEAPU8 = new Uint8Array(e)),
              (Module.HEAPU16 = HEAPU16 = new Uint16Array(e)),
              (Module.HEAPU32 = HEAPU32 = new Uint32Array(e)),
              (Module.HEAPF32 = HEAPF32 = new Float32Array(e)),
              (Module.HEAPF64 = HEAPF64 = new Float64Array(e));
          }
          var INITIAL_MEMORY = Module.INITIAL_MEMORY || 33554432;
          (wasmMemory = Module.wasmMemory
            ? Module.wasmMemory
            : new WebAssembly.Memory({
                initial: INITIAL_MEMORY / 65536,
                maximum: 32768,
              })),
            wasmMemory && (buffer = wasmMemory.buffer),
            (INITIAL_MEMORY = buffer.byteLength),
            updateGlobalBufferAndViews(buffer);
          var wasmTable = new WebAssembly.Table({
              initial: 20,
              element: "anyfunc",
            }),
            __ATPRERUN__ = [],
            __ATINIT__ = [],
            __ATMAIN__ = [],
            __ATPOSTRUN__ = [],
            __RELOC_FUNCS__ = [],
            runtimeInitialized = !1;
          function keepRuntimeAlive() {
            return noExitRuntime;
          }
          function preRun() {
            if (Module.preRun)
              for (
                "function" == typeof Module.preRun &&
                (Module.preRun = [Module.preRun]);
                Module.preRun.length;

              )
                addOnPreRun(Module.preRun.shift());
            callRuntimeCallbacks(__ATPRERUN__);
          }
          function initRuntime() {
            (runtimeInitialized = !0),
              callRuntimeCallbacks(__RELOC_FUNCS__),
              callRuntimeCallbacks(__ATINIT__);
          }
          function preMain() {
            callRuntimeCallbacks(__ATMAIN__);
          }
          function postRun() {
            if (Module.postRun)
              for (
                "function" == typeof Module.postRun &&
                (Module.postRun = [Module.postRun]);
                Module.postRun.length;

              )
                addOnPostRun(Module.postRun.shift());
            callRuntimeCallbacks(__ATPOSTRUN__);
          }
          function addOnPreRun(e) {
            __ATPRERUN__.unshift(e);
          }
          function addOnInit(e) {
            __ATINIT__.unshift(e);
          }
          function addOnPostRun(e) {
            __ATPOSTRUN__.unshift(e);
          }
          var runDependencies = 0,
            runDependencyWatcher = null,
            dependenciesFulfilled = null;
          function addRunDependency(e) {
            runDependencies++,
              Module.monitorRunDependencies &&
                Module.monitorRunDependencies(runDependencies);
          }
          function removeRunDependency(e) {
            if (
              (runDependencies--,
              Module.monitorRunDependencies &&
                Module.monitorRunDependencies(runDependencies),
              0 == runDependencies &&
                (null !== runDependencyWatcher &&
                  (clearInterval(runDependencyWatcher),
                  (runDependencyWatcher = null)),
                dependenciesFulfilled))
            ) {
              var t = dependenciesFulfilled;
              (dependenciesFulfilled = null), t();
            }
          }
          function abort(e) {
            throw (
              (Module.onAbort && Module.onAbort(e),
              err((e = "Aborted(" + e + ")")),
              (ABORT = !0),
              (EXITSTATUS = 1),
              (e += ". Build with -sASSERTIONS for more info."),
              new WebAssembly.RuntimeError(e))
            );
          }
          var dataURIPrefix = "data:application/octet-stream;base64,",
            wasmBinaryFile,
            tempDouble,
            tempI64;
          function isDataURI(e) {
            return e.startsWith(dataURIPrefix);
          }
          function isFileURI(e) {
            return e.startsWith("file://");
          }
          function getBinary(e) {
            try {
              if (e == wasmBinaryFile && wasmBinary)
                return new Uint8Array(wasmBinary);
              if (readBinary) return readBinary(e);
              throw "both async and sync fetching of the wasm failed";
            } catch (e) {
              abort(e);
            }
          }
          function getBinaryPromise() {
            if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
              if ("function" == typeof fetch && !isFileURI(wasmBinaryFile))
                return fetch(wasmBinaryFile, { credentials: "same-origin" })
                  .then(function (e) {
                    if (!e.ok)
                      throw (
                        "failed to load wasm binary file at '" +
                        wasmBinaryFile +
                        "'"
                      );
                    return e.arrayBuffer();
                  })
                  .catch(function () {
                    return getBinary(wasmBinaryFile);
                  });
              if (readAsync)
                return new Promise(function (e, t) {
                  readAsync(
                    wasmBinaryFile,
                    function (t) {
                      e(new Uint8Array(t));
                    },
                    t
                  );
                });
            }
            return Promise.resolve().then(function () {
              return getBinary(wasmBinaryFile);
            });
          }
          function createWasm() {
            var e = {
              env: asmLibraryArg,
              wasi_snapshot_preview1: asmLibraryArg,
              "GOT.mem": new Proxy(asmLibraryArg, GOTHandler),
              "GOT.func": new Proxy(asmLibraryArg, GOTHandler),
            };
            function t(e, t) {
              var r = e.exports;
              r = relocateExports(r, 1024);
              var _ = getDylinkMetadata(t);
              _.neededDynlibs &&
                (dynamicLibraries = _.neededDynlibs.concat(dynamicLibraries)),
                mergeLibSymbols(r, "main"),
                (Module.asm = r),
                addOnInit(Module.asm.__wasm_call_ctors),
                __RELOC_FUNCS__.push(Module.asm.__wasm_apply_data_relocs),
                removeRunDependency("wasm-instantiate");
            }
            function r(e) {
              t(e.instance, e.module);
            }
            function _(t) {
              return getBinaryPromise()
                .then(function (t) {
                  return WebAssembly.instantiate(t, e);
                })
                .then(function (e) {
                  return e;
                })
                .then(t, function (e) {
                  err("failed to asynchronously prepare wasm: " + e), abort(e);
                });
            }
            if ((addRunDependency("wasm-instantiate"), Module.instantiateWasm))
              try {
                return Module.instantiateWasm(e, t);
              } catch (e) {
                return (
                  err(
                    "Module.instantiateWasm callback failed with error: " + e
                  ),
                  !1
                );
              }
            return (
              wasmBinary ||
              "function" != typeof WebAssembly.instantiateStreaming ||
              isDataURI(wasmBinaryFile) ||
              isFileURI(wasmBinaryFile) ||
              ENVIRONMENT_IS_NODE ||
              "function" != typeof fetch
                ? _(r)
                : fetch(wasmBinaryFile, { credentials: "same-origin" }).then(
                    function (t) {
                      return WebAssembly.instantiateStreaming(t, e).then(
                        r,
                        function (e) {
                          return (
                            err("wasm streaming compile failed: " + e),
                            err("falling back to ArrayBuffer instantiation"),
                            _(r)
                          );
                        }
                      );
                    }
                  ),
              {}
            );
          }
          (wasmBinaryFile = "tree-sitter.wasm"),
            isDataURI(wasmBinaryFile) ||
              (wasmBinaryFile = locateFile(wasmBinaryFile));
          var ASM_CONSTS = {};
          function ExitStatus(e) {
            (this.name = "ExitStatus"),
              (this.message = "Program terminated with exit(" + e + ")"),
              (this.status = e);
          }
          var GOT = {},
            CurrentModuleWeakSymbols = new Set([]),
            GOTHandler = {
              get: function (e, t) {
                var r = GOT[t];
                return (
                  r ||
                    (r = GOT[t] =
                      new WebAssembly.Global({ value: "i32", mutable: !0 })),
                  CurrentModuleWeakSymbols.has(t) || (r.required = !0),
                  r
                );
              },
            };
          function callRuntimeCallbacks(e) {
            for (; e.length > 0; ) e.shift()(Module);
          }
          function getDylinkMetadata(e) {
            var t = 0,
              r = 0;
            function _() {
              for (var r = 0, _ = 1; ; ) {
                var n = e[t++];
                if (((r += (127 & n) * _), (_ *= 128), !(128 & n))) break;
              }
              return r;
            }
            function n() {
              var r = _();
              return UTF8ArrayToString(e, (t += r) - r, r);
            }
            function s(e, t) {
              if (e) throw new Error(t);
            }
            var a = "dylink.0";
            if (e instanceof WebAssembly.Module) {
              var o = WebAssembly.Module.customSections(e, a);
              0 === o.length &&
                ((a = "dylink"), (o = WebAssembly.Module.customSections(e, a))),
                s(0 === o.length, "need dylink section"),
                (r = (e = new Uint8Array(o[0])).length);
            } else {
              s(
                !(
                  1836278016 ==
                  new Uint32Array(new Uint8Array(e.subarray(0, 24)).buffer)[0]
                ),
                "need to see wasm magic number"
              ),
                s(0 !== e[8], "need the dylink section to be first"),
                (t = 9);
              var i = _();
              (r = t + i), (a = n());
            }
            var l = {
              neededDynlibs: [],
              tlsExports: new Set(),
              weakImports: new Set(),
            };
            if ("dylink" == a) {
              (l.memorySize = _()),
                (l.memoryAlign = _()),
                (l.tableSize = _()),
                (l.tableAlign = _());
              for (var u = _(), d = 0; d < u; ++d) {
                var c = n();
                l.neededDynlibs.push(c);
              }
            } else {
              s("dylink.0" !== a);
              for (; t < r; ) {
                var m = e[t++],
                  p = _();
                if (1 === m)
                  (l.memorySize = _()),
                    (l.memoryAlign = _()),
                    (l.tableSize = _()),
                    (l.tableAlign = _());
                else if (2 === m)
                  for (u = _(), d = 0; d < u; ++d)
                    (c = n()), l.neededDynlibs.push(c);
                else if (3 === m)
                  for (var f = _(); f--; ) {
                    var h = n();
                    256 & _() && l.tlsExports.add(h);
                  }
                else if (4 === m)
                  for (f = _(); f--; ) {
                    n(), (h = n());
                    1 == (3 & _()) && l.weakImports.add(h);
                  }
                else t += p;
              }
            }
            return l;
          }
          function getValue(e, t = "i8") {
            switch ((t.endsWith("*") && (t = "*"), t)) {
              case "i1":
              case "i8":
                return HEAP8[e >> 0];
              case "i16":
                return HEAP16[e >> 1];
              case "i32":
              case "i64":
                return HEAP32[e >> 2];
              case "float":
                return HEAPF32[e >> 2];
              case "double":
                return HEAPF64[e >> 3];
              case "*":
                return HEAPU32[e >> 2];
              default:
                abort("invalid type for getValue: " + t);
            }
            return null;
          }
          function asmjsMangle(e) {
            return 0 == e.indexOf("dynCall_") ||
              [
                "stackAlloc",
                "stackSave",
                "stackRestore",
                "getTempRet0",
                "setTempRet0",
              ].includes(e)
              ? e
              : "_" + e;
          }
          function mergeLibSymbols(e, t) {
            for (var r in e)
              if (e.hasOwnProperty(r)) {
                asmLibraryArg.hasOwnProperty(r) || (asmLibraryArg[r] = e[r]);
                var _ = asmjsMangle(r);
                Module.hasOwnProperty(_) || (Module[_] = e[r]),
                  "__main_argc_argv" == r && (Module._main = e[r]);
              }
          }
          var LDSO = { loadedLibsByName: {}, loadedLibsByHandle: {} };
          function dynCallLegacy(e, t, r) {
            var _ = Module["dynCall_" + e];
            return r && r.length
              ? _.apply(null, [t].concat(r))
              : _.call(null, t);
          }
          var wasmTableMirror = [];
          function getWasmTableEntry(e) {
            var t = wasmTableMirror[e];
            return (
              t ||
                (e >= wasmTableMirror.length &&
                  (wasmTableMirror.length = e + 1),
                (wasmTableMirror[e] = t = wasmTable.get(e))),
              t
            );
          }
          function dynCall(e, t, r) {
            return e.includes("j")
              ? dynCallLegacy(e, t, r)
              : getWasmTableEntry(t).apply(null, r);
          }
          function createInvokeFunction(e) {
            return function () {
              var t = stackSave();
              try {
                return dynCall(
                  e,
                  arguments[0],
                  Array.prototype.slice.call(arguments, 1)
                );
              } catch (e) {
                if ((stackRestore(t), e !== e + 0)) throw e;
                _setThrew(1, 0);
              }
            };
          }
          var ___heap_base = 78144;
          function zeroMemory(e, t) {
            return HEAPU8.fill(0, e, e + t), e;
          }
          function getMemory(e) {
            if (runtimeInitialized) return zeroMemory(_malloc(e), e);
            var t = ___heap_base,
              r = (t + e + 15) & -16;
            return (___heap_base = r), (GOT.__heap_base.value = r), t;
          }
          function isInternalSym(e) {
            return [
              "__cpp_exception",
              "__c_longjmp",
              "__wasm_apply_data_relocs",
              "__dso_handle",
              "__tls_size",
              "__tls_align",
              "__set_stack_limits",
              "_emscripten_tls_init",
              "__wasm_init_tls",
              "__wasm_call_ctors",
              "__start_em_asm",
              "__stop_em_asm",
            ].includes(e);
          }
          function uleb128Encode(e, t) {
            e < 128 ? t.push(e) : t.push(e % 128 | 128, e >> 7);
          }
          function sigToWasmTypes(e) {
            for (
              var t = { i: "i32", j: "i32", f: "f32", d: "f64", p: "i32" },
                r = { parameters: [], results: "v" == e[0] ? [] : [t[e[0]]] },
                _ = 1;
              _ < e.length;
              ++_
            )
              r.parameters.push(t[e[_]]),
                "j" === e[_] && r.parameters.push("i32");
            return r;
          }
          function generateFuncType(e, t) {
            var r = e.slice(0, 1),
              _ = e.slice(1),
              n = { i: 127, p: 127, j: 126, f: 125, d: 124 };
            t.push(96), uleb128Encode(_.length, t);
            for (var s = 0; s < _.length; ++s) t.push(n[_[s]]);
            "v" == r ? t.push(0) : t.push(1, n[r]);
          }
          function convertJsFunctionToWasm(e, t) {
            if ("function" == typeof WebAssembly.Function)
              return new WebAssembly.Function(sigToWasmTypes(t), e);
            var r = [1];
            generateFuncType(t, r);
            var _ = [0, 97, 115, 109, 1, 0, 0, 0, 1];
            uleb128Encode(r.length, _),
              _.push.apply(_, r),
              _.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
            var n = new WebAssembly.Module(new Uint8Array(_));
            return new WebAssembly.Instance(n, { e: { f: e } }).exports.f;
          }
          function updateTableMap(e, t) {
            if (functionsInTableMap)
              for (var r = e; r < e + t; r++) {
                var _ = getWasmTableEntry(r);
                _ && functionsInTableMap.set(_, r);
              }
          }
          var functionsInTableMap = void 0,
            freeTableIndexes = [];
          function getEmptyTableSlot() {
            if (freeTableIndexes.length) return freeTableIndexes.pop();
            try {
              wasmTable.grow(1);
            } catch (e) {
              if (!(e instanceof RangeError)) throw e;
              throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
            }
            return wasmTable.length - 1;
          }
          function setWasmTableEntry(e, t) {
            wasmTable.set(e, t), (wasmTableMirror[e] = wasmTable.get(e));
          }
          function addFunction(e, t) {
            if (
              (functionsInTableMap ||
                ((functionsInTableMap = new WeakMap()),
                updateTableMap(0, wasmTable.length)),
              functionsInTableMap.has(e))
            )
              return functionsInTableMap.get(e);
            var r = getEmptyTableSlot();
            try {
              setWasmTableEntry(r, e);
            } catch (_) {
              if (!(_ instanceof TypeError)) throw _;
              setWasmTableEntry(r, convertJsFunctionToWasm(e, t));
            }
            return functionsInTableMap.set(e, r), r;
          }
          function updateGOT(e, t) {
            for (var r in e)
              if (!isInternalSym(r)) {
                var _ = e[r];
                r.startsWith("orig$") && ((r = r.split("$")[1]), (t = !0)),
                  GOT[r] ||
                    (GOT[r] = new WebAssembly.Global({
                      value: "i32",
                      mutable: !0,
                    })),
                  (t || 0 == GOT[r].value) &&
                    ("function" == typeof _
                      ? (GOT[r].value = addFunction(_))
                      : "number" == typeof _
                      ? (GOT[r].value = _)
                      : err(
                          "unhandled export type for `" + r + "`: " + typeof _
                        ));
              }
          }
          function relocateExports(e, t, r) {
            var _ = {};
            for (var n in e) {
              var s = e[n];
              "object" == typeof s && (s = s.value),
                "number" == typeof s && (s += t),
                (_[n] = s);
            }
            return updateGOT(_, r), _;
          }
          function resolveGlobalSymbol(e, t) {
            var r;
            return (
              t && (r = asmLibraryArg["orig$" + e]),
              r || ((r = asmLibraryArg[e]) && r.stub && (r = void 0)),
              r || (r = Module[asmjsMangle(e)]),
              !r &&
                e.startsWith("invoke_") &&
                (r = createInvokeFunction(e.split("_")[1])),
              r
            );
          }
          function alignMemory(e, t) {
            return Math.ceil(e / t) * t;
          }
          function loadWebAssemblyModule(binary, flags, handle) {
            var metadata = getDylinkMetadata(binary);
            function loadModule() {
              var firstLoad = !handle || !HEAP8[(handle + 12) >> 0];
              if (firstLoad) {
                var memAlign = Math.pow(2, metadata.memoryAlign);
                memAlign = Math.max(memAlign, STACK_ALIGN);
                var memoryBase = metadata.memorySize
                    ? alignMemory(
                        getMemory(metadata.memorySize + memAlign),
                        memAlign
                      )
                    : 0,
                  tableBase = metadata.tableSize ? wasmTable.length : 0;
                handle &&
                  ((HEAP8[(handle + 12) >> 0] = 1),
                  (HEAPU32[(handle + 16) >> 2] = memoryBase),
                  (HEAP32[(handle + 20) >> 2] = metadata.memorySize),
                  (HEAPU32[(handle + 24) >> 2] = tableBase),
                  (HEAP32[(handle + 28) >> 2] = metadata.tableSize));
              } else
                (memoryBase = HEAPU32[(handle + 16) >> 2]),
                  (tableBase = HEAPU32[(handle + 24) >> 2]);
              var tableGrowthNeeded =
                  tableBase + metadata.tableSize - wasmTable.length,
                moduleExports;
              function resolveSymbol(e) {
                var t = resolveGlobalSymbol(e, !1);
                return t || (t = moduleExports[e]), t;
              }
              tableGrowthNeeded > 0 && wasmTable.grow(tableGrowthNeeded);
              var proxyHandler = {
                  get: function (e, t) {
                    switch (t) {
                      case "__memory_base":
                        return memoryBase;
                      case "__table_base":
                        return tableBase;
                    }
                    if (t in asmLibraryArg) return asmLibraryArg[t];
                    var r;
                    t in e ||
                      (e[t] = function () {
                        return (
                          r || (r = resolveSymbol(t)), r.apply(null, arguments)
                        );
                      });
                    return e[t];
                  },
                },
                proxy = new Proxy({}, proxyHandler),
                info = {
                  "GOT.mem": new Proxy({}, GOTHandler),
                  "GOT.func": new Proxy({}, GOTHandler),
                  env: proxy,
                  wasi_snapshot_preview1: proxy,
                };
              function postInstantiation(instance) {
                function addEmAsm(addr, body) {
                  for (
                    var args = [], arity = 0;
                    arity < 16 && -1 != body.indexOf("$" + arity);
                    arity++
                  )
                    args.push("$" + arity);
                  args = args.join(",");
                  var func = "(" + args + " ) => { " + body + "};";
                  ASM_CONSTS[start] = eval(func);
                }
                if (
                  (updateTableMap(tableBase, metadata.tableSize),
                  (moduleExports = relocateExports(
                    instance.exports,
                    memoryBase
                  )),
                  flags.allowUndefined || reportUndefinedSymbols(),
                  "__start_em_asm" in moduleExports)
                )
                  for (
                    var start = moduleExports.__start_em_asm,
                      stop = moduleExports.__stop_em_asm;
                    start < stop;

                  ) {
                    var jsString = UTF8ToString(start);
                    addEmAsm(start, jsString),
                      (start = HEAPU8.indexOf(0, start) + 1);
                  }
                var applyRelocs = moduleExports.__wasm_apply_data_relocs;
                applyRelocs &&
                  (runtimeInitialized
                    ? applyRelocs()
                    : __RELOC_FUNCS__.push(applyRelocs));
                var init = moduleExports.__wasm_call_ctors;
                return (
                  init && (runtimeInitialized ? init() : __ATINIT__.push(init)),
                  moduleExports
                );
              }
              if (flags.loadAsync) {
                if (binary instanceof WebAssembly.Module) {
                  var instance = new WebAssembly.Instance(binary, info);
                  return Promise.resolve(postInstantiation(instance));
                }
                return WebAssembly.instantiate(binary, info).then(function (e) {
                  return postInstantiation(e.instance);
                });
              }
              var module =
                  binary instanceof WebAssembly.Module
                    ? binary
                    : new WebAssembly.Module(binary),
                instance = new WebAssembly.Instance(module, info);
              return postInstantiation(instance);
            }
            return (
              (CurrentModuleWeakSymbols = metadata.weakImports),
              flags.loadAsync
                ? metadata.neededDynlibs
                    .reduce(function (e, t) {
                      return e.then(function () {
                        return loadDynamicLibrary(t, flags);
                      });
                    }, Promise.resolve())
                    .then(function () {
                      return loadModule();
                    })
                : (metadata.neededDynlibs.forEach(function (e) {
                    loadDynamicLibrary(e, flags);
                  }),
                  loadModule())
            );
          }
          function loadDynamicLibrary(e, t, r) {
            t = t || { global: !0, nodelete: !0 };
            var _ = LDSO.loadedLibsByName[e];
            if (_)
              return (
                t.global &&
                  !_.global &&
                  ((_.global = !0),
                  "loading" !== _.module && mergeLibSymbols(_.module, e)),
                t.nodelete && _.refcount !== 1 / 0 && (_.refcount = 1 / 0),
                _.refcount++,
                r && (LDSO.loadedLibsByHandle[r] = _),
                !t.loadAsync || Promise.resolve(!0)
              );
            function n(e) {
              if (t.fs && t.fs.findObject(e)) {
                var r = t.fs.readFile(e, { encoding: "binary" });
                return (
                  r instanceof Uint8Array || (r = new Uint8Array(r)),
                  t.loadAsync ? Promise.resolve(r) : r
                );
              }
              if (((e = locateFile(e)), t.loadAsync))
                return new Promise(function (t, r) {
                  readAsync(e, (e) => t(new Uint8Array(e)), r);
                });
              if (!readBinary)
                throw new Error(
                  e +
                    ": file not found, and synchronous loading of external files is not available"
                );
              return readBinary(e);
            }
            function s() {
              if ("undefined" != typeof preloadedWasm && preloadedWasm[e]) {
                var _ = preloadedWasm[e];
                return t.loadAsync ? Promise.resolve(_) : _;
              }
              return t.loadAsync
                ? n(e).then(function (e) {
                    return loadWebAssemblyModule(e, t, r);
                  })
                : loadWebAssemblyModule(n(e), t, r);
            }
            function a(t) {
              _.global && mergeLibSymbols(t, e), (_.module = t);
            }
            return (
              (_ = {
                refcount: t.nodelete ? 1 / 0 : 1,
                name: e,
                module: "loading",
                global: t.global,
              }),
              (LDSO.loadedLibsByName[e] = _),
              r && (LDSO.loadedLibsByHandle[r] = _),
              t.loadAsync
                ? s().then(function (e) {
                    return a(e), !0;
                  })
                : (a(s()), !0)
            );
          }
          function reportUndefinedSymbols() {
            for (var e in GOT)
              if (0 == GOT[e].value) {
                var t = resolveGlobalSymbol(e, !0);
                if (!t && !GOT[e].required) continue;
                if ("function" == typeof t)
                  GOT[e].value = addFunction(t, t.sig);
                else {
                  if ("number" != typeof t)
                    throw new Error(
                      "bad export type for `" + e + "`: " + typeof t
                    );
                  GOT[e].value = t;
                }
              }
          }
          function preloadDylibs() {
            dynamicLibraries.length
              ? (addRunDependency("preloadDylibs"),
                dynamicLibraries
                  .reduce(function (e, t) {
                    return e.then(function () {
                      return loadDynamicLibrary(t, {
                        loadAsync: !0,
                        global: !0,
                        nodelete: !0,
                        allowUndefined: !0,
                      });
                    });
                  }, Promise.resolve())
                  .then(function () {
                    reportUndefinedSymbols(),
                      removeRunDependency("preloadDylibs");
                  }))
              : reportUndefinedSymbols();
          }
          function setValue(e, t, r = "i8") {
            switch ((r.endsWith("*") && (r = "*"), r)) {
              case "i1":
              case "i8":
                HEAP8[e >> 0] = t;
                break;
              case "i16":
                HEAP16[e >> 1] = t;
                break;
              case "i32":
                HEAP32[e >> 2] = t;
                break;
              case "i64":
                (tempI64 = [
                  t >>> 0,
                  ((tempDouble = t),
                  +Math.abs(tempDouble) >= 1
                    ? tempDouble > 0
                      ? (0 |
                          Math.min(
                            +Math.floor(tempDouble / 4294967296),
                            4294967295
                          )) >>>
                        0
                      : ~~+Math.ceil(
                          (tempDouble - +(~~tempDouble >>> 0)) / 4294967296
                        ) >>> 0
                    : 0),
                ]),
                  (HEAP32[e >> 2] = tempI64[0]),
                  (HEAP32[(e + 4) >> 2] = tempI64[1]);
                break;
              case "float":
                HEAPF32[e >> 2] = t;
                break;
              case "double":
                HEAPF64[e >> 3] = t;
                break;
              case "*":
                HEAPU32[e >> 2] = t;
                break;
              default:
                abort("invalid type for setValue: " + r);
            }
          }
          var ___memory_base = new WebAssembly.Global(
              { value: "i32", mutable: !1 },
              1024
            ),
            ___stack_pointer = new WebAssembly.Global(
              { value: "i32", mutable: !0 },
              78144
            ),
            ___table_base = new WebAssembly.Global(
              { value: "i32", mutable: !1 },
              1
            ),
            nowIsMonotonic = !0,
            _emscripten_get_now;
          function __emscripten_get_now_is_monotonic() {
            return nowIsMonotonic;
          }
          function _abort() {
            abort("");
          }
          function _emscripten_date_now() {
            return Date.now();
          }
          function _emscripten_memcpy_big(e, t, r) {
            HEAPU8.copyWithin(e, t, t + r);
          }
          function getHeapMax() {
            return 2147483648;
          }
          function emscripten_realloc_buffer(e) {
            try {
              return (
                wasmMemory.grow((e - buffer.byteLength + 65535) >>> 16),
                updateGlobalBufferAndViews(wasmMemory.buffer),
                1
              );
            } catch (e) {}
          }
          function _emscripten_resize_heap(e) {
            var t = HEAPU8.length;
            e >>>= 0;
            var r = getHeapMax();
            if (e > r) return !1;
            for (var _ = 1; _ <= 4; _ *= 2) {
              var n = t * (1 + 0.2 / _);
              if (
                ((n = Math.min(n, e + 100663296)),
                emscripten_realloc_buffer(
                  Math.min(
                    r,
                    (s = Math.max(e, n)) + (((a = 65536) - (s % a)) % a)
                  )
                ))
              )
                return !0;
            }
            var s, a;
            return !1;
          }
          (__emscripten_get_now_is_monotonic.sig = "i"),
            (Module._abort = _abort),
            (_abort.sig = "v"),
            (_emscripten_date_now.sig = "d"),
            (_emscripten_get_now = ENVIRONMENT_IS_NODE
              ? () => {
                  var e = process.hrtime();
                  return 1e3 * e[0] + e[1] / 1e6;
                }
              : () => performance.now()),
            (_emscripten_get_now.sig = "d"),
            (_emscripten_memcpy_big.sig = "vppp"),
            (_emscripten_resize_heap.sig = "ip");
          var SYSCALLS = {
            DEFAULT_POLLMASK: 5,
            calculateAt: function (e, t, r) {
              if (PATH.isAbs(t)) return t;
              var _;
              -100 === e
                ? (_ = FS.cwd())
                : (_ = SYSCALLS.getStreamFromFD(e).path);
              if (0 == t.length) {
                if (!r) throw new FS.ErrnoError(44);
                return _;
              }
              return PATH.join2(_, t);
            },
            doStat: function (e, t, r) {
              try {
                var _ = e(t);
              } catch (e) {
                if (
                  e &&
                  e.node &&
                  PATH.normalize(t) !== PATH.normalize(FS.getPath(e.node))
                )
                  return -54;
                throw e;
              }
              (HEAP32[r >> 2] = _.dev),
                (HEAP32[(r + 8) >> 2] = _.ino),
                (HEAP32[(r + 12) >> 2] = _.mode),
                (HEAPU32[(r + 16) >> 2] = _.nlink),
                (HEAP32[(r + 20) >> 2] = _.uid),
                (HEAP32[(r + 24) >> 2] = _.gid),
                (HEAP32[(r + 28) >> 2] = _.rdev),
                (tempI64 = [
                  _.size >>> 0,
                  ((tempDouble = _.size),
                  +Math.abs(tempDouble) >= 1
                    ? tempDouble > 0
                      ? (0 |
                          Math.min(
                            +Math.floor(tempDouble / 4294967296),
                            4294967295
                          )) >>>
                        0
                      : ~~+Math.ceil(
                          (tempDouble - +(~~tempDouble >>> 0)) / 4294967296
                        ) >>> 0
                    : 0),
                ]),
                (HEAP32[(r + 40) >> 2] = tempI64[0]),
                (HEAP32[(r + 44) >> 2] = tempI64[1]),
                (HEAP32[(r + 48) >> 2] = 4096),
                (HEAP32[(r + 52) >> 2] = _.blocks);
              var n = _.atime.getTime(),
                s = _.mtime.getTime(),
                a = _.ctime.getTime();
              return (
                (tempI64 = [
                  Math.floor(n / 1e3) >>> 0,
                  ((tempDouble = Math.floor(n / 1e3)),
                  +Math.abs(tempDouble) >= 1
                    ? tempDouble > 0
                      ? (0 |
                          Math.min(
                            +Math.floor(tempDouble / 4294967296),
                            4294967295
                          )) >>>
                        0
                      : ~~+Math.ceil(
                          (tempDouble - +(~~tempDouble >>> 0)) / 4294967296
                        ) >>> 0
                    : 0),
                ]),
                (HEAP32[(r + 56) >> 2] = tempI64[0]),
                (HEAP32[(r + 60) >> 2] = tempI64[1]),
                (HEAPU32[(r + 64) >> 2] = (n % 1e3) * 1e3),
                (tempI64 = [
                  Math.floor(s / 1e3) >>> 0,
                  ((tempDouble = Math.floor(s / 1e3)),
                  +Math.abs(tempDouble) >= 1
                    ? tempDouble > 0
                      ? (0 |
                          Math.min(
                            +Math.floor(tempDouble / 4294967296),
                            4294967295
                          )) >>>
                        0
                      : ~~+Math.ceil(
                          (tempDouble - +(~~tempDouble >>> 0)) / 4294967296
                        ) >>> 0
                    : 0),
                ]),
                (HEAP32[(r + 72) >> 2] = tempI64[0]),
                (HEAP32[(r + 76) >> 2] = tempI64[1]),
                (HEAPU32[(r + 80) >> 2] = (s % 1e3) * 1e3),
                (tempI64 = [
                  Math.floor(a / 1e3) >>> 0,
                  ((tempDouble = Math.floor(a / 1e3)),
                  +Math.abs(tempDouble) >= 1
                    ? tempDouble > 0
                      ? (0 |
                          Math.min(
                            +Math.floor(tempDouble / 4294967296),
                            4294967295
                          )) >>>
                        0
                      : ~~+Math.ceil(
                          (tempDouble - +(~~tempDouble >>> 0)) / 4294967296
                        ) >>> 0
                    : 0),
                ]),
                (HEAP32[(r + 88) >> 2] = tempI64[0]),
                (HEAP32[(r + 92) >> 2] = tempI64[1]),
                (HEAPU32[(r + 96) >> 2] = (a % 1e3) * 1e3),
                (tempI64 = [
                  _.ino >>> 0,
                  ((tempDouble = _.ino),
                  +Math.abs(tempDouble) >= 1
                    ? tempDouble > 0
                      ? (0 |
                          Math.min(
                            +Math.floor(tempDouble / 4294967296),
                            4294967295
                          )) >>>
                        0
                      : ~~+Math.ceil(
                          (tempDouble - +(~~tempDouble >>> 0)) / 4294967296
                        ) >>> 0
                    : 0),
                ]),
                (HEAP32[(r + 104) >> 2] = tempI64[0]),
                (HEAP32[(r + 108) >> 2] = tempI64[1]),
                0
              );
            },
            doMsync: function (e, t, r, _, n) {
              if (!FS.isFile(t.node.mode)) throw new FS.ErrnoError(43);
              if (2 & _) return 0;
              var s = HEAPU8.slice(e, e + r);
              FS.msync(t, s, n, r, _);
            },
            varargs: void 0,
            get: function () {
              return (
                (SYSCALLS.varargs += 4), HEAP32[(SYSCALLS.varargs - 4) >> 2]
              );
            },
            getStr: function (e) {
              return UTF8ToString(e);
            },
            getStreamFromFD: function (e) {
              var t = FS.getStream(e);
              if (!t) throw new FS.ErrnoError(8);
              return t;
            },
          };
          function _proc_exit(e) {
            (EXITSTATUS = e),
              keepRuntimeAlive() ||
                (Module.onExit && Module.onExit(e), (ABORT = !0)),
              quit_(e, new ExitStatus(e));
          }
          function exitJS(e, t) {
            (EXITSTATUS = e), _proc_exit(e);
          }
          _proc_exit.sig = "vi";
          var _exit = exitJS;
          function _fd_close(e) {
            try {
              var t = SYSCALLS.getStreamFromFD(e);
              return FS.close(t), 0;
            } catch (e) {
              if ("undefined" == typeof FS || !(e instanceof FS.ErrnoError))
                throw e;
              return e.errno;
            }
          }
          function convertI32PairToI53Checked(e, t) {
            return (t + 2097152) >>> 0 < 4194305 - !!e
              ? (e >>> 0) + 4294967296 * t
              : NaN;
          }
          function _fd_seek(e, t, r, _, n) {
            try {
              var s = convertI32PairToI53Checked(t, r);
              if (isNaN(s)) return 61;
              var a = SYSCALLS.getStreamFromFD(e);
              return (
                FS.llseek(a, s, _),
                (tempI64 = [
                  a.position >>> 0,
                  ((tempDouble = a.position),
                  +Math.abs(tempDouble) >= 1
                    ? tempDouble > 0
                      ? (0 |
                          Math.min(
                            +Math.floor(tempDouble / 4294967296),
                            4294967295
                          )) >>>
                        0
                      : ~~+Math.ceil(
                          (tempDouble - +(~~tempDouble >>> 0)) / 4294967296
                        ) >>> 0
                    : 0),
                ]),
                (HEAP32[n >> 2] = tempI64[0]),
                (HEAP32[(n + 4) >> 2] = tempI64[1]),
                a.getdents && 0 === s && 0 === _ && (a.getdents = null),
                0
              );
            } catch (e) {
              if ("undefined" == typeof FS || !(e instanceof FS.ErrnoError))
                throw e;
              return e.errno;
            }
          }
          function doWritev(e, t, r, _) {
            for (var n = 0, s = 0; s < r; s++) {
              var a = HEAPU32[t >> 2],
                o = HEAPU32[(t + 4) >> 2];
              t += 8;
              var i = FS.write(e, HEAP8, a, o, _);
              if (i < 0) return -1;
              (n += i), void 0 !== _ && (_ += i);
            }
            return n;
          }
          function _fd_write(e, t, r, _) {
            try {
              var n = doWritev(SYSCALLS.getStreamFromFD(e), t, r);
              return (HEAPU32[_ >> 2] = n), 0;
            } catch (e) {
              if ("undefined" == typeof FS || !(e instanceof FS.ErrnoError))
                throw e;
              return e.errno;
            }
          }
          function _tree_sitter_log_callback(e, t) {
            if (currentLogCallback) {
              const r = UTF8ToString(t);
              currentLogCallback(r, 0 !== e);
            }
          }
          function _tree_sitter_parse_callback(e, t, r, _, n) {
            var s = currentParseCallback(t, { row: r, column: _ });
            "string" == typeof s
              ? (setValue(n, s.length, "i32"), stringToUTF16(s, e, 10240))
              : setValue(n, 0, "i32");
          }
          function handleException(e) {
            if (e instanceof ExitStatus || "unwind" == e) return EXITSTATUS;
            quit_(1, e);
          }
          function allocateUTF8OnStack(e) {
            var t = lengthBytesUTF8(e) + 1,
              r = stackAlloc(t);
            return stringToUTF8Array(e, HEAP8, r, t), r;
          }
          function stringToUTF16(e, t, r) {
            if ((void 0 === r && (r = 2147483647), r < 2)) return 0;
            for (
              var _ = t, n = (r -= 2) < 2 * e.length ? r / 2 : e.length, s = 0;
              s < n;
              ++s
            ) {
              var a = e.charCodeAt(s);
              (HEAP16[t >> 1] = a), (t += 2);
            }
            return (HEAP16[t >> 1] = 0), t - _;
          }
          function AsciiToString(e) {
            for (var t = ""; ; ) {
              var r = HEAPU8[e++ >> 0];
              if (!r) return t;
              t += String.fromCharCode(r);
            }
          }
          (_exit.sig = "vi"),
            (_fd_close.sig = "ii"),
            (_fd_seek.sig = "iijip"),
            (_fd_write.sig = "iippp");
          var asmLibraryArg = {
              __heap_base: ___heap_base,
              __indirect_function_table: wasmTable,
              __memory_base: ___memory_base,
              __stack_pointer: ___stack_pointer,
              __table_base: ___table_base,
              _emscripten_get_now_is_monotonic:
                __emscripten_get_now_is_monotonic,
              abort: _abort,
              emscripten_get_now: _emscripten_get_now,
              emscripten_memcpy_big: _emscripten_memcpy_big,
              emscripten_resize_heap: _emscripten_resize_heap,
              exit: _exit,
              fd_close: _fd_close,
              fd_seek: _fd_seek,
              fd_write: _fd_write,
              memory: wasmMemory,
              tree_sitter_log_callback: _tree_sitter_log_callback,
              tree_sitter_parse_callback: _tree_sitter_parse_callback,
            },
            asm = createWasm(),
            ___wasm_call_ctors = (Module.___wasm_call_ctors = function () {
              return (___wasm_call_ctors = Module.___wasm_call_ctors =
                Module.asm.__wasm_call_ctors).apply(null, arguments);
            }),
            ___wasm_apply_data_relocs = (Module.___wasm_apply_data_relocs =
              function () {
                return (___wasm_apply_data_relocs =
                  Module.___wasm_apply_data_relocs =
                    Module.asm.__wasm_apply_data_relocs).apply(null, arguments);
              }),
            _malloc = (Module._malloc = function () {
              return (_malloc = Module._malloc = Module.asm.malloc).apply(
                null,
                arguments
              );
            }),
            _calloc = (Module._calloc = function () {
              return (_calloc = Module._calloc = Module.asm.calloc).apply(
                null,
                arguments
              );
            }),
            _realloc = (Module._realloc = function () {
              return (_realloc = Module._realloc = Module.asm.realloc).apply(
                null,
                arguments
              );
            }),
            _free = (Module._free = function () {
              return (_free = Module._free = Module.asm.free).apply(
                null,
                arguments
              );
            }),
            _ts_language_symbol_count = (Module._ts_language_symbol_count =
              function () {
                return (_ts_language_symbol_count =
                  Module._ts_language_symbol_count =
                    Module.asm.ts_language_symbol_count).apply(null, arguments);
              }),
            _ts_language_version = (Module._ts_language_version = function () {
              return (_ts_language_version = Module._ts_language_version =
                Module.asm.ts_language_version).apply(null, arguments);
            }),
            _ts_language_field_count = (Module._ts_language_field_count =
              function () {
                return (_ts_language_field_count =
                  Module._ts_language_field_count =
                    Module.asm.ts_language_field_count).apply(null, arguments);
              }),
            _ts_language_symbol_name = (Module._ts_language_symbol_name =
              function () {
                return (_ts_language_symbol_name =
                  Module._ts_language_symbol_name =
                    Module.asm.ts_language_symbol_name).apply(null, arguments);
              }),
            _ts_language_symbol_for_name =
              (Module._ts_language_symbol_for_name = function () {
                return (_ts_language_symbol_for_name =
                  Module._ts_language_symbol_for_name =
                    Module.asm.ts_language_symbol_for_name).apply(
                  null,
                  arguments
                );
              }),
            _ts_language_symbol_type = (Module._ts_language_symbol_type =
              function () {
                return (_ts_language_symbol_type =
                  Module._ts_language_symbol_type =
                    Module.asm.ts_language_symbol_type).apply(null, arguments);
              }),
            _ts_language_field_name_for_id =
              (Module._ts_language_field_name_for_id = function () {
                return (_ts_language_field_name_for_id =
                  Module._ts_language_field_name_for_id =
                    Module.asm.ts_language_field_name_for_id).apply(
                  null,
                  arguments
                );
              }),
            _memset = (Module._memset = function () {
              return (_memset = Module._memset = Module.asm.memset).apply(
                null,
                arguments
              );
            }),
            _memcpy = (Module._memcpy = function () {
              return (_memcpy = Module._memcpy = Module.asm.memcpy).apply(
                null,
                arguments
              );
            }),
            _ts_parser_delete = (Module._ts_parser_delete = function () {
              return (_ts_parser_delete = Module._ts_parser_delete =
                Module.asm.ts_parser_delete).apply(null, arguments);
            }),
            _ts_parser_reset = (Module._ts_parser_reset = function () {
              return (_ts_parser_reset = Module._ts_parser_reset =
                Module.asm.ts_parser_reset).apply(null, arguments);
            }),
            _ts_parser_set_language = (Module._ts_parser_set_language =
              function () {
                return (_ts_parser_set_language =
                  Module._ts_parser_set_language =
                    Module.asm.ts_parser_set_language).apply(null, arguments);
              }),
            _ts_parser_timeout_micros = (Module._ts_parser_timeout_micros =
              function () {
                return (_ts_parser_timeout_micros =
                  Module._ts_parser_timeout_micros =
                    Module.asm.ts_parser_timeout_micros).apply(null, arguments);
              }),
            _ts_parser_set_timeout_micros =
              (Module._ts_parser_set_timeout_micros = function () {
                return (_ts_parser_set_timeout_micros =
                  Module._ts_parser_set_timeout_micros =
                    Module.asm.ts_parser_set_timeout_micros).apply(
                  null,
                  arguments
                );
              }),
            _memmove = (Module._memmove = function () {
              return (_memmove = Module._memmove = Module.asm.memmove).apply(
                null,
                arguments
              );
            }),
            _memcmp = (Module._memcmp = function () {
              return (_memcmp = Module._memcmp = Module.asm.memcmp).apply(
                null,
                arguments
              );
            }),
            _ts_query_new = (Module._ts_query_new = function () {
              return (_ts_query_new = Module._ts_query_new =
                Module.asm.ts_query_new).apply(null, arguments);
            }),
            _ts_query_delete = (Module._ts_query_delete = function () {
              return (_ts_query_delete = Module._ts_query_delete =
                Module.asm.ts_query_delete).apply(null, arguments);
            }),
            _iswspace = (Module._iswspace = function () {
              return (_iswspace = Module._iswspace = Module.asm.iswspace).apply(
                null,
                arguments
              );
            }),
            _iswalnum = (Module._iswalnum = function () {
              return (_iswalnum = Module._iswalnum = Module.asm.iswalnum).apply(
                null,
                arguments
              );
            }),
            _ts_query_pattern_count = (Module._ts_query_pattern_count =
              function () {
                return (_ts_query_pattern_count =
                  Module._ts_query_pattern_count =
                    Module.asm.ts_query_pattern_count).apply(null, arguments);
              }),
            _ts_query_capture_count = (Module._ts_query_capture_count =
              function () {
                return (_ts_query_capture_count =
                  Module._ts_query_capture_count =
                    Module.asm.ts_query_capture_count).apply(null, arguments);
              }),
            _ts_query_string_count = (Module._ts_query_string_count =
              function () {
                return (_ts_query_string_count = Module._ts_query_string_count =
                  Module.asm.ts_query_string_count).apply(null, arguments);
              }),
            _ts_query_capture_name_for_id =
              (Module._ts_query_capture_name_for_id = function () {
                return (_ts_query_capture_name_for_id =
                  Module._ts_query_capture_name_for_id =
                    Module.asm.ts_query_capture_name_for_id).apply(
                  null,
                  arguments
                );
              }),
            _ts_query_string_value_for_id =
              (Module._ts_query_string_value_for_id = function () {
                return (_ts_query_string_value_for_id =
                  Module._ts_query_string_value_for_id =
                    Module.asm.ts_query_string_value_for_id).apply(
                  null,
                  arguments
                );
              }),
            _ts_query_predicates_for_pattern =
              (Module._ts_query_predicates_for_pattern = function () {
                return (_ts_query_predicates_for_pattern =
                  Module._ts_query_predicates_for_pattern =
                    Module.asm.ts_query_predicates_for_pattern).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_copy = (Module._ts_tree_copy = function () {
              return (_ts_tree_copy = Module._ts_tree_copy =
                Module.asm.ts_tree_copy).apply(null, arguments);
            }),
            _ts_tree_delete = (Module._ts_tree_delete = function () {
              return (_ts_tree_delete = Module._ts_tree_delete =
                Module.asm.ts_tree_delete).apply(null, arguments);
            }),
            _ts_init = (Module._ts_init = function () {
              return (_ts_init = Module._ts_init = Module.asm.ts_init).apply(
                null,
                arguments
              );
            }),
            _ts_parser_new_wasm = (Module._ts_parser_new_wasm = function () {
              return (_ts_parser_new_wasm = Module._ts_parser_new_wasm =
                Module.asm.ts_parser_new_wasm).apply(null, arguments);
            }),
            _ts_parser_enable_logger_wasm =
              (Module._ts_parser_enable_logger_wasm = function () {
                return (_ts_parser_enable_logger_wasm =
                  Module._ts_parser_enable_logger_wasm =
                    Module.asm.ts_parser_enable_logger_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_parser_parse_wasm = (Module._ts_parser_parse_wasm =
              function () {
                return (_ts_parser_parse_wasm = Module._ts_parser_parse_wasm =
                  Module.asm.ts_parser_parse_wasm).apply(null, arguments);
              }),
            _ts_language_type_is_named_wasm =
              (Module._ts_language_type_is_named_wasm = function () {
                return (_ts_language_type_is_named_wasm =
                  Module._ts_language_type_is_named_wasm =
                    Module.asm.ts_language_type_is_named_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_language_type_is_visible_wasm =
              (Module._ts_language_type_is_visible_wasm = function () {
                return (_ts_language_type_is_visible_wasm =
                  Module._ts_language_type_is_visible_wasm =
                    Module.asm.ts_language_type_is_visible_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_root_node_wasm = (Module._ts_tree_root_node_wasm =
              function () {
                return (_ts_tree_root_node_wasm =
                  Module._ts_tree_root_node_wasm =
                    Module.asm.ts_tree_root_node_wasm).apply(null, arguments);
              }),
            _ts_tree_edit_wasm = (Module._ts_tree_edit_wasm = function () {
              return (_ts_tree_edit_wasm = Module._ts_tree_edit_wasm =
                Module.asm.ts_tree_edit_wasm).apply(null, arguments);
            }),
            _ts_tree_get_changed_ranges_wasm =
              (Module._ts_tree_get_changed_ranges_wasm = function () {
                return (_ts_tree_get_changed_ranges_wasm =
                  Module._ts_tree_get_changed_ranges_wasm =
                    Module.asm.ts_tree_get_changed_ranges_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_new_wasm = (Module._ts_tree_cursor_new_wasm =
              function () {
                return (_ts_tree_cursor_new_wasm =
                  Module._ts_tree_cursor_new_wasm =
                    Module.asm.ts_tree_cursor_new_wasm).apply(null, arguments);
              }),
            _ts_tree_cursor_delete_wasm = (Module._ts_tree_cursor_delete_wasm =
              function () {
                return (_ts_tree_cursor_delete_wasm =
                  Module._ts_tree_cursor_delete_wasm =
                    Module.asm.ts_tree_cursor_delete_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_reset_wasm = (Module._ts_tree_cursor_reset_wasm =
              function () {
                return (_ts_tree_cursor_reset_wasm =
                  Module._ts_tree_cursor_reset_wasm =
                    Module.asm.ts_tree_cursor_reset_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_goto_first_child_wasm =
              (Module._ts_tree_cursor_goto_first_child_wasm = function () {
                return (_ts_tree_cursor_goto_first_child_wasm =
                  Module._ts_tree_cursor_goto_first_child_wasm =
                    Module.asm.ts_tree_cursor_goto_first_child_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_goto_next_sibling_wasm =
              (Module._ts_tree_cursor_goto_next_sibling_wasm = function () {
                return (_ts_tree_cursor_goto_next_sibling_wasm =
                  Module._ts_tree_cursor_goto_next_sibling_wasm =
                    Module.asm.ts_tree_cursor_goto_next_sibling_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_goto_parent_wasm =
              (Module._ts_tree_cursor_goto_parent_wasm = function () {
                return (_ts_tree_cursor_goto_parent_wasm =
                  Module._ts_tree_cursor_goto_parent_wasm =
                    Module.asm.ts_tree_cursor_goto_parent_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_current_node_type_id_wasm =
              (Module._ts_tree_cursor_current_node_type_id_wasm = function () {
                return (_ts_tree_cursor_current_node_type_id_wasm =
                  Module._ts_tree_cursor_current_node_type_id_wasm =
                    Module.asm.ts_tree_cursor_current_node_type_id_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_current_node_is_named_wasm =
              (Module._ts_tree_cursor_current_node_is_named_wasm = function () {
                return (_ts_tree_cursor_current_node_is_named_wasm =
                  Module._ts_tree_cursor_current_node_is_named_wasm =
                    Module.asm.ts_tree_cursor_current_node_is_named_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_current_node_is_missing_wasm =
              (Module._ts_tree_cursor_current_node_is_missing_wasm =
                function () {
                  return (_ts_tree_cursor_current_node_is_missing_wasm =
                    Module._ts_tree_cursor_current_node_is_missing_wasm =
                      Module.asm.ts_tree_cursor_current_node_is_missing_wasm).apply(
                    null,
                    arguments
                  );
                }),
            _ts_tree_cursor_current_node_id_wasm =
              (Module._ts_tree_cursor_current_node_id_wasm = function () {
                return (_ts_tree_cursor_current_node_id_wasm =
                  Module._ts_tree_cursor_current_node_id_wasm =
                    Module.asm.ts_tree_cursor_current_node_id_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_start_position_wasm =
              (Module._ts_tree_cursor_start_position_wasm = function () {
                return (_ts_tree_cursor_start_position_wasm =
                  Module._ts_tree_cursor_start_position_wasm =
                    Module.asm.ts_tree_cursor_start_position_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_end_position_wasm =
              (Module._ts_tree_cursor_end_position_wasm = function () {
                return (_ts_tree_cursor_end_position_wasm =
                  Module._ts_tree_cursor_end_position_wasm =
                    Module.asm.ts_tree_cursor_end_position_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_start_index_wasm =
              (Module._ts_tree_cursor_start_index_wasm = function () {
                return (_ts_tree_cursor_start_index_wasm =
                  Module._ts_tree_cursor_start_index_wasm =
                    Module.asm.ts_tree_cursor_start_index_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_end_index_wasm =
              (Module._ts_tree_cursor_end_index_wasm = function () {
                return (_ts_tree_cursor_end_index_wasm =
                  Module._ts_tree_cursor_end_index_wasm =
                    Module.asm.ts_tree_cursor_end_index_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_current_field_id_wasm =
              (Module._ts_tree_cursor_current_field_id_wasm = function () {
                return (_ts_tree_cursor_current_field_id_wasm =
                  Module._ts_tree_cursor_current_field_id_wasm =
                    Module.asm.ts_tree_cursor_current_field_id_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_tree_cursor_current_node_wasm =
              (Module._ts_tree_cursor_current_node_wasm = function () {
                return (_ts_tree_cursor_current_node_wasm =
                  Module._ts_tree_cursor_current_node_wasm =
                    Module.asm.ts_tree_cursor_current_node_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_symbol_wasm = (Module._ts_node_symbol_wasm = function () {
              return (_ts_node_symbol_wasm = Module._ts_node_symbol_wasm =
                Module.asm.ts_node_symbol_wasm).apply(null, arguments);
            }),
            _ts_node_child_count_wasm = (Module._ts_node_child_count_wasm =
              function () {
                return (_ts_node_child_count_wasm =
                  Module._ts_node_child_count_wasm =
                    Module.asm.ts_node_child_count_wasm).apply(null, arguments);
              }),
            _ts_node_named_child_count_wasm =
              (Module._ts_node_named_child_count_wasm = function () {
                return (_ts_node_named_child_count_wasm =
                  Module._ts_node_named_child_count_wasm =
                    Module.asm.ts_node_named_child_count_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_child_wasm = (Module._ts_node_child_wasm = function () {
              return (_ts_node_child_wasm = Module._ts_node_child_wasm =
                Module.asm.ts_node_child_wasm).apply(null, arguments);
            }),
            _ts_node_named_child_wasm = (Module._ts_node_named_child_wasm =
              function () {
                return (_ts_node_named_child_wasm =
                  Module._ts_node_named_child_wasm =
                    Module.asm.ts_node_named_child_wasm).apply(null, arguments);
              }),
            _ts_node_child_by_field_id_wasm =
              (Module._ts_node_child_by_field_id_wasm = function () {
                return (_ts_node_child_by_field_id_wasm =
                  Module._ts_node_child_by_field_id_wasm =
                    Module.asm.ts_node_child_by_field_id_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_next_sibling_wasm = (Module._ts_node_next_sibling_wasm =
              function () {
                return (_ts_node_next_sibling_wasm =
                  Module._ts_node_next_sibling_wasm =
                    Module.asm.ts_node_next_sibling_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_prev_sibling_wasm = (Module._ts_node_prev_sibling_wasm =
              function () {
                return (_ts_node_prev_sibling_wasm =
                  Module._ts_node_prev_sibling_wasm =
                    Module.asm.ts_node_prev_sibling_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_next_named_sibling_wasm =
              (Module._ts_node_next_named_sibling_wasm = function () {
                return (_ts_node_next_named_sibling_wasm =
                  Module._ts_node_next_named_sibling_wasm =
                    Module.asm.ts_node_next_named_sibling_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_prev_named_sibling_wasm =
              (Module._ts_node_prev_named_sibling_wasm = function () {
                return (_ts_node_prev_named_sibling_wasm =
                  Module._ts_node_prev_named_sibling_wasm =
                    Module.asm.ts_node_prev_named_sibling_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_parent_wasm = (Module._ts_node_parent_wasm = function () {
              return (_ts_node_parent_wasm = Module._ts_node_parent_wasm =
                Module.asm.ts_node_parent_wasm).apply(null, arguments);
            }),
            _ts_node_descendant_for_index_wasm =
              (Module._ts_node_descendant_for_index_wasm = function () {
                return (_ts_node_descendant_for_index_wasm =
                  Module._ts_node_descendant_for_index_wasm =
                    Module.asm.ts_node_descendant_for_index_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_named_descendant_for_index_wasm =
              (Module._ts_node_named_descendant_for_index_wasm = function () {
                return (_ts_node_named_descendant_for_index_wasm =
                  Module._ts_node_named_descendant_for_index_wasm =
                    Module.asm.ts_node_named_descendant_for_index_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_descendant_for_position_wasm =
              (Module._ts_node_descendant_for_position_wasm = function () {
                return (_ts_node_descendant_for_position_wasm =
                  Module._ts_node_descendant_for_position_wasm =
                    Module.asm.ts_node_descendant_for_position_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_named_descendant_for_position_wasm =
              (Module._ts_node_named_descendant_for_position_wasm =
                function () {
                  return (_ts_node_named_descendant_for_position_wasm =
                    Module._ts_node_named_descendant_for_position_wasm =
                      Module.asm.ts_node_named_descendant_for_position_wasm).apply(
                    null,
                    arguments
                  );
                }),
            _ts_node_start_point_wasm = (Module._ts_node_start_point_wasm =
              function () {
                return (_ts_node_start_point_wasm =
                  Module._ts_node_start_point_wasm =
                    Module.asm.ts_node_start_point_wasm).apply(null, arguments);
              }),
            _ts_node_end_point_wasm = (Module._ts_node_end_point_wasm =
              function () {
                return (_ts_node_end_point_wasm =
                  Module._ts_node_end_point_wasm =
                    Module.asm.ts_node_end_point_wasm).apply(null, arguments);
              }),
            _ts_node_start_index_wasm = (Module._ts_node_start_index_wasm =
              function () {
                return (_ts_node_start_index_wasm =
                  Module._ts_node_start_index_wasm =
                    Module.asm.ts_node_start_index_wasm).apply(null, arguments);
              }),
            _ts_node_end_index_wasm = (Module._ts_node_end_index_wasm =
              function () {
                return (_ts_node_end_index_wasm =
                  Module._ts_node_end_index_wasm =
                    Module.asm.ts_node_end_index_wasm).apply(null, arguments);
              }),
            _ts_node_to_string_wasm = (Module._ts_node_to_string_wasm =
              function () {
                return (_ts_node_to_string_wasm =
                  Module._ts_node_to_string_wasm =
                    Module.asm.ts_node_to_string_wasm).apply(null, arguments);
              }),
            _ts_node_children_wasm = (Module._ts_node_children_wasm =
              function () {
                return (_ts_node_children_wasm = Module._ts_node_children_wasm =
                  Module.asm.ts_node_children_wasm).apply(null, arguments);
              }),
            _ts_node_named_children_wasm =
              (Module._ts_node_named_children_wasm = function () {
                return (_ts_node_named_children_wasm =
                  Module._ts_node_named_children_wasm =
                    Module.asm.ts_node_named_children_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_descendants_of_type_wasm =
              (Module._ts_node_descendants_of_type_wasm = function () {
                return (_ts_node_descendants_of_type_wasm =
                  Module._ts_node_descendants_of_type_wasm =
                    Module.asm.ts_node_descendants_of_type_wasm).apply(
                  null,
                  arguments
                );
              }),
            _ts_node_is_named_wasm = (Module._ts_node_is_named_wasm =
              function () {
                return (_ts_node_is_named_wasm = Module._ts_node_is_named_wasm =
                  Module.asm.ts_node_is_named_wasm).apply(null, arguments);
              }),
            _ts_node_has_changes_wasm = (Module._ts_node_has_changes_wasm =
              function () {
                return (_ts_node_has_changes_wasm =
                  Module._ts_node_has_changes_wasm =
                    Module.asm.ts_node_has_changes_wasm).apply(null, arguments);
              }),
            _ts_node_has_error_wasm = (Module._ts_node_has_error_wasm =
              function () {
                return (_ts_node_has_error_wasm =
                  Module._ts_node_has_error_wasm =
                    Module.asm.ts_node_has_error_wasm).apply(null, arguments);
              }),
            _ts_node_is_missing_wasm = (Module._ts_node_is_missing_wasm =
              function () {
                return (_ts_node_is_missing_wasm =
                  Module._ts_node_is_missing_wasm =
                    Module.asm.ts_node_is_missing_wasm).apply(null, arguments);
              }),
            _ts_query_matches_wasm = (Module._ts_query_matches_wasm =
              function () {
                return (_ts_query_matches_wasm = Module._ts_query_matches_wasm =
                  Module.asm.ts_query_matches_wasm).apply(null, arguments);
              }),
            _ts_query_captures_wasm = (Module._ts_query_captures_wasm =
              function () {
                return (_ts_query_captures_wasm =
                  Module._ts_query_captures_wasm =
                    Module.asm.ts_query_captures_wasm).apply(null, arguments);
              }),
            ___cxa_atexit = (Module.___cxa_atexit = function () {
              return (___cxa_atexit = Module.___cxa_atexit =
                Module.asm.__cxa_atexit).apply(null, arguments);
            }),
            _iswdigit = (Module._iswdigit = function () {
              return (_iswdigit = Module._iswdigit = Module.asm.iswdigit).apply(
                null,
                arguments
              );
            }),
            _iswalpha = (Module._iswalpha = function () {
              return (_iswalpha = Module._iswalpha = Module.asm.iswalpha).apply(
                null,
                arguments
              );
            }),
            _iswlower = (Module._iswlower = function () {
              return (_iswlower = Module._iswlower = Module.asm.iswlower).apply(
                null,
                arguments
              );
            }),
            _memchr = (Module._memchr = function () {
              return (_memchr = Module._memchr = Module.asm.memchr).apply(
                null,
                arguments
              );
            }),
            _strlen = (Module._strlen = function () {
              return (_strlen = Module._strlen = Module.asm.strlen).apply(
                null,
                arguments
              );
            }),
            _towupper = (Module._towupper = function () {
              return (_towupper = Module._towupper = Module.asm.towupper).apply(
                null,
                arguments
              );
            }),
            _setThrew = (Module._setThrew = function () {
              return (_setThrew = Module._setThrew = Module.asm.setThrew).apply(
                null,
                arguments
              );
            }),
            stackSave = (Module.stackSave = function () {
              return (stackSave = Module.stackSave =
                Module.asm.stackSave).apply(null, arguments);
            }),
            stackRestore = (Module.stackRestore = function () {
              return (stackRestore = Module.stackRestore =
                Module.asm.stackRestore).apply(null, arguments);
            }),
            stackAlloc = (Module.stackAlloc = function () {
              return (stackAlloc = Module.stackAlloc =
                Module.asm.stackAlloc).apply(null, arguments);
            }),
            __Znwm = (Module.__Znwm = function () {
              return (__Znwm = Module.__Znwm = Module.asm._Znwm).apply(
                null,
                arguments
              );
            }),
            __ZdlPv = (Module.__ZdlPv = function () {
              return (__ZdlPv = Module.__ZdlPv = Module.asm._ZdlPv).apply(
                null,
                arguments
              );
            }),
            __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev =
              (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev =
                function () {
                  return (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev =
                    Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev =
                      Module.asm._ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED2Ev).apply(
                    null,
                    arguments
                  );
                }),
            __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEmmmmmm =
              (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEmmmmmm =
                function () {
                  return (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEmmmmmm =
                    Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEmmmmmm =
                      Module.asm._ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9__grow_byEmmmmmm).apply(
                    null,
                    arguments
                  );
                }),
            __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcm =
              (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcm =
                function () {
                  return (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcm =
                    Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcm =
                      Module.asm._ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6__initEPKcm).apply(
                    null,
                    arguments
                  );
                }),
            __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm =
              (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm =
                function () {
                  return (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm =
                    Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm =
                      Module.asm._ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm).apply(
                    null,
                    arguments
                  );
                }),
            __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4copyEPcmm =
              (Module.__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4copyEPcmm =
                function () {
                  return (__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4copyEPcmm =
                    Module.__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4copyEPcmm =
                      Module.asm._ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE4copyEPcmm).apply(
                    null,
                    arguments
                  );
                }),
            __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc =
              (Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc =
                function () {
                  return (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc =
                    Module.__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc =
                      Module.asm._ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc).apply(
                    null,
                    arguments
                  );
                }),
            __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED2Ev =
              (Module.__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED2Ev =
                function () {
                  return (__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED2Ev =
                    Module.__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED2Ev =
                      Module.asm._ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEED2Ev).apply(
                    null,
                    arguments
                  );
                }),
            __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9push_backEw =
              (Module.__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9push_backEw =
                function () {
                  return (__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9push_backEw =
                    Module.__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9push_backEw =
                      Module.asm._ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE9push_backEw).apply(
                    null,
                    arguments
                  );
                }),
            __ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6resizeEmw =
              (Module.__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6resizeEmw =
                function () {
                  return (__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6resizeEmw =
                    Module.__ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6resizeEmw =
                      Module.asm._ZNSt3__212basic_stringIwNS_11char_traitsIwEENS_9allocatorIwEEE6resizeEmw).apply(
                    null,
                    arguments
                  );
                }),
            dynCall_jiji = (Module.dynCall_jiji = function () {
              return (dynCall_jiji = Module.dynCall_jiji =
                Module.asm.dynCall_jiji).apply(null, arguments);
            }),
            _orig$ts_parser_timeout_micros =
              (Module._orig$ts_parser_timeout_micros = function () {
                return (_orig$ts_parser_timeout_micros =
                  Module._orig$ts_parser_timeout_micros =
                    Module.asm.orig$ts_parser_timeout_micros).apply(
                  null,
                  arguments
                );
              }),
            _orig$ts_parser_set_timeout_micros =
              (Module._orig$ts_parser_set_timeout_micros = function () {
                return (_orig$ts_parser_set_timeout_micros =
                  Module._orig$ts_parser_set_timeout_micros =
                    Module.asm.orig$ts_parser_set_timeout_micros).apply(
                  null,
                  arguments
                );
              }),
            calledRun;
          function callMain(e) {
            var t = Module._main;
            if (t) {
              (e = e || []).unshift(thisProgram);
              var r = e.length,
                _ = stackAlloc(4 * (r + 1)),
                n = _ >> 2;
              e.forEach((e) => {
                HEAP32[n++] = allocateUTF8OnStack(e);
              }),
                (HEAP32[n] = 0);
              try {
                var s = t(r, _);
                return exitJS(s, !0), s;
              } catch (e) {
                return handleException(e);
              }
            }
          }
          (Module.AsciiToString = AsciiToString),
            (Module.stringToUTF16 = stringToUTF16),
            (dependenciesFulfilled = function e() {
              calledRun || run(), calledRun || (dependenciesFulfilled = e);
            });
          var dylibsLoaded = !1;
          function run(e) {
            function t() {
              calledRun ||
                ((calledRun = !0),
                (Module.calledRun = !0),
                ABORT ||
                  (initRuntime(),
                  preMain(),
                  Module.onRuntimeInitialized && Module.onRuntimeInitialized(),
                  shouldRunNow && callMain(e),
                  postRun()));
            }
            (e = e || arguments_),
              runDependencies > 0 ||
                (!dylibsLoaded &&
                  (preloadDylibs(),
                  (dylibsLoaded = !0),
                  runDependencies > 0)) ||
                (preRun(),
                runDependencies > 0 ||
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
          if (Module.preInit)
            for (
              "function" == typeof Module.preInit &&
              (Module.preInit = [Module.preInit]);
              Module.preInit.length > 0;

            )
              Module.preInit.pop()();
          var shouldRunNow = !0;
          Module.noInitialRun && (shouldRunNow = !1), run();
          const C = Module,
            INTERNAL = {},
            SIZE_OF_INT = 4,
            SIZE_OF_NODE = 5 * SIZE_OF_INT,
            SIZE_OF_POINT = 2 * SIZE_OF_INT,
            SIZE_OF_RANGE = 2 * SIZE_OF_INT + 2 * SIZE_OF_POINT,
            ZERO_POINT = { row: 0, column: 0 },
            QUERY_WORD_REGEX = /[\w-.]*/g,
            PREDICATE_STEP_TYPE_CAPTURE = 1,
            PREDICATE_STEP_TYPE_STRING = 2,
            LANGUAGE_FUNCTION_REGEX = /^_?tree_sitter_\w+/;
          var VERSION,
            MIN_COMPATIBLE_VERSION,
            TRANSFER_BUFFER,
            currentParseCallback,
            currentLogCallback;
          class ParserImpl {
            static init() {
              (TRANSFER_BUFFER = C._ts_init()),
                (VERSION = getValue(TRANSFER_BUFFER, "i32")),
                (MIN_COMPATIBLE_VERSION = getValue(
                  TRANSFER_BUFFER + SIZE_OF_INT,
                  "i32"
                ));
            }
            initialize() {
              C._ts_parser_new_wasm(),
                (this[0] = getValue(TRANSFER_BUFFER, "i32")),
                (this[1] = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"));
            }
            delete() {
              C._ts_parser_delete(this[0]),
                C._free(this[1]),
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
                  const r = C._ts_language_version(t);
                  if (r < MIN_COMPATIBLE_VERSION || VERSION < r)
                    throw new Error(
                      `Incompatible language version ${r}. Compatibility range ${MIN_COMPATIBLE_VERSION} through ${VERSION}.`
                    );
                }
              } else (t = 0), (e = null);
              return (
                (this.language = e), C._ts_parser_set_language(this[0], t), this
              );
            }
            getLanguage() {
              return this.language;
            }
            parse(e, t, r) {
              if ("string" == typeof e)
                currentParseCallback = (t, r, _) => e.slice(t, _);
              else {
                if ("function" != typeof e)
                  throw new Error("Argument must be a string or a function");
                currentParseCallback = e;
              }
              this.logCallback
                ? ((currentLogCallback = this.logCallback),
                  C._ts_parser_enable_logger_wasm(this[0], 1))
                : ((currentLogCallback = null),
                  C._ts_parser_enable_logger_wasm(this[0], 0));
              let _ = 0,
                n = 0;
              if (r && r.includedRanges) {
                (_ = r.includedRanges.length),
                  (n = C._calloc(_, SIZE_OF_RANGE));
                let e = n;
                for (let t = 0; t < _; t++)
                  marshalRange(e, r.includedRanges[t]), (e += SIZE_OF_RANGE);
              }
              const s = C._ts_parser_parse_wasm(
                this[0],
                this[1],
                t ? t[0] : 0,
                n,
                _
              );
              if (!s)
                throw (
                  ((currentParseCallback = null),
                  (currentLogCallback = null),
                  new Error("Parsing failed"))
                );
              const a = new Tree(
                INTERNAL,
                s,
                this.language,
                currentParseCallback
              );
              return (
                (currentParseCallback = null), (currentLogCallback = null), a
              );
            }
            reset() {
              C._ts_parser_reset(this[0]);
            }
            setTimeoutMicros(e) {
              C._ts_parser_set_timeout_micros(this[0], e);
            }
            getTimeoutMicros() {
              return C._ts_parser_timeout_micros(this[0]);
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
            constructor(e, t, r, _) {
              assertInternal(e),
                (this[0] = t),
                (this.language = r),
                (this.textCallback = _);
            }
            copy() {
              const e = C._ts_tree_copy(this[0]);
              return new Tree(INTERNAL, e, this.language, this.textCallback);
            }
            delete() {
              C._ts_tree_delete(this[0]), (this[0] = 0);
            }
            edit(e) {
              marshalEdit(e), C._ts_tree_edit_wasm(this[0]);
            }
            get rootNode() {
              return C._ts_tree_root_node_wasm(this[0]), unmarshalNode(this);
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
              C._ts_tree_get_changed_ranges_wasm(this[0], e[0]);
              const t = getValue(TRANSFER_BUFFER, "i32"),
                r = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"),
                _ = new Array(t);
              if (t > 0) {
                let e = r;
                for (let r = 0; r < t; r++)
                  (_[r] = unmarshalRange(e)), (e += SIZE_OF_RANGE);
                C._free(r);
              }
              return _;
            }
          }
          class Node {
            constructor(e, t) {
              assertInternal(e), (this.tree = t);
            }
            get typeId() {
              return marshalNode(this), C._ts_node_symbol_wasm(this.tree[0]);
            }
            get type() {
              return this.tree.language.types[this.typeId] || "ERROR";
            }
            get endPosition() {
              return (
                marshalNode(this),
                C._ts_node_end_point_wasm(this.tree[0]),
                unmarshalPoint(TRANSFER_BUFFER)
              );
            }
            get endIndex() {
              return marshalNode(this), C._ts_node_end_index_wasm(this.tree[0]);
            }
            get text() {
              return getText(this.tree, this.startIndex, this.endIndex);
            }
            isNamed() {
              return (
                marshalNode(this), 1 === C._ts_node_is_named_wasm(this.tree[0])
              );
            }
            hasError() {
              return (
                marshalNode(this), 1 === C._ts_node_has_error_wasm(this.tree[0])
              );
            }
            hasChanges() {
              return (
                marshalNode(this),
                1 === C._ts_node_has_changes_wasm(this.tree[0])
              );
            }
            isMissing() {
              return (
                marshalNode(this),
                1 === C._ts_node_is_missing_wasm(this.tree[0])
              );
            }
            equals(e) {
              return this.id === e.id;
            }
            child(e) {
              return (
                marshalNode(this),
                C._ts_node_child_wasm(this.tree[0], e),
                unmarshalNode(this.tree)
              );
            }
            namedChild(e) {
              return (
                marshalNode(this),
                C._ts_node_named_child_wasm(this.tree[0], e),
                unmarshalNode(this.tree)
              );
            }
            childForFieldId(e) {
              return (
                marshalNode(this),
                C._ts_node_child_by_field_id_wasm(this.tree[0], e),
                unmarshalNode(this.tree)
              );
            }
            childForFieldName(e) {
              const t = this.tree.language.fields.indexOf(e);
              if (-1 !== t) return this.childForFieldId(t);
            }
            get childCount() {
              return (
                marshalNode(this), C._ts_node_child_count_wasm(this.tree[0])
              );
            }
            get namedChildCount() {
              return (
                marshalNode(this),
                C._ts_node_named_child_count_wasm(this.tree[0])
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
                marshalNode(this), C._ts_node_children_wasm(this.tree[0]);
                const e = getValue(TRANSFER_BUFFER, "i32"),
                  t = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
                if (((this._children = new Array(e)), e > 0)) {
                  let r = t;
                  for (let t = 0; t < e; t++)
                    (this._children[t] = unmarshalNode(this.tree, r)),
                      (r += SIZE_OF_NODE);
                  C._free(t);
                }
              }
              return this._children;
            }
            get namedChildren() {
              if (!this._namedChildren) {
                marshalNode(this), C._ts_node_named_children_wasm(this.tree[0]);
                const e = getValue(TRANSFER_BUFFER, "i32"),
                  t = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
                if (((this._namedChildren = new Array(e)), e > 0)) {
                  let r = t;
                  for (let t = 0; t < e; t++)
                    (this._namedChildren[t] = unmarshalNode(this.tree, r)),
                      (r += SIZE_OF_NODE);
                  C._free(t);
                }
              }
              return this._namedChildren;
            }
            descendantsOfType(e, t, r) {
              Array.isArray(e) || (e = [e]),
                t || (t = ZERO_POINT),
                r || (r = ZERO_POINT);
              const _ = [],
                n = this.tree.language.types;
              for (let t = 0, r = n.length; t < r; t++)
                e.includes(n[t]) && _.push(t);
              const s = C._malloc(SIZE_OF_INT * _.length);
              for (let e = 0, t = _.length; e < t; e++)
                setValue(s + e * SIZE_OF_INT, _[e], "i32");
              marshalNode(this),
                C._ts_node_descendants_of_type_wasm(
                  this.tree[0],
                  s,
                  _.length,
                  t.row,
                  t.column,
                  r.row,
                  r.column
                );
              const a = getValue(TRANSFER_BUFFER, "i32"),
                o = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"),
                i = new Array(a);
              if (a > 0) {
                let e = o;
                for (let t = 0; t < a; t++)
                  (i[t] = unmarshalNode(this.tree, e)), (e += SIZE_OF_NODE);
              }
              return C._free(o), C._free(s), i;
            }
            get nextSibling() {
              return (
                marshalNode(this),
                C._ts_node_next_sibling_wasm(this.tree[0]),
                unmarshalNode(this.tree)
              );
            }
            get previousSibling() {
              return (
                marshalNode(this),
                C._ts_node_prev_sibling_wasm(this.tree[0]),
                unmarshalNode(this.tree)
              );
            }
            get nextNamedSibling() {
              return (
                marshalNode(this),
                C._ts_node_next_named_sibling_wasm(this.tree[0]),
                unmarshalNode(this.tree)
              );
            }
            get previousNamedSibling() {
              return (
                marshalNode(this),
                C._ts_node_prev_named_sibling_wasm(this.tree[0]),
                unmarshalNode(this.tree)
              );
            }
            get parent() {
              return (
                marshalNode(this),
                C._ts_node_parent_wasm(this.tree[0]),
                unmarshalNode(this.tree)
              );
            }
            descendantForIndex(e, t = e) {
              if ("number" != typeof e || "number" != typeof t)
                throw new Error("Arguments must be numbers");
              marshalNode(this);
              let r = TRANSFER_BUFFER + SIZE_OF_NODE;
              return (
                setValue(r, e, "i32"),
                setValue(r + SIZE_OF_INT, t, "i32"),
                C._ts_node_descendant_for_index_wasm(this.tree[0]),
                unmarshalNode(this.tree)
              );
            }
            namedDescendantForIndex(e, t = e) {
              if ("number" != typeof e || "number" != typeof t)
                throw new Error("Arguments must be numbers");
              marshalNode(this);
              let r = TRANSFER_BUFFER + SIZE_OF_NODE;
              return (
                setValue(r, e, "i32"),
                setValue(r + SIZE_OF_INT, t, "i32"),
                C._ts_node_named_descendant_for_index_wasm(this.tree[0]),
                unmarshalNode(this.tree)
              );
            }
            descendantForPosition(e, t = e) {
              if (!isPoint(e) || !isPoint(t))
                throw new Error("Arguments must be {row, column} objects");
              marshalNode(this);
              let r = TRANSFER_BUFFER + SIZE_OF_NODE;
              return (
                marshalPoint(r, e),
                marshalPoint(r + SIZE_OF_POINT, t),
                C._ts_node_descendant_for_position_wasm(this.tree[0]),
                unmarshalNode(this.tree)
              );
            }
            namedDescendantForPosition(e, t = e) {
              if (!isPoint(e) || !isPoint(t))
                throw new Error("Arguments must be {row, column} objects");
              marshalNode(this);
              let r = TRANSFER_BUFFER + SIZE_OF_NODE;
              return (
                marshalPoint(r, e),
                marshalPoint(r + SIZE_OF_POINT, t),
                C._ts_node_named_descendant_for_position_wasm(this.tree[0]),
                unmarshalNode(this.tree)
              );
            }
            walk() {
              return (
                marshalNode(this),
                C._ts_tree_cursor_new_wasm(this.tree[0]),
                new TreeCursor(INTERNAL, this.tree)
              );
            }
            toString() {
              marshalNode(this);
              const e = C._ts_node_to_string_wasm(this.tree[0]),
                t = AsciiToString(e);
              return C._free(e), t;
            }
          }
          class TreeCursor {
            constructor(e, t) {
              assertInternal(e), (this.tree = t), unmarshalTreeCursor(this);
            }
            delete() {
              marshalTreeCursor(this),
                C._ts_tree_cursor_delete_wasm(this.tree[0]),
                (this[0] = this[1] = this[2] = 0);
            }
            reset(e) {
              marshalNode(e),
                marshalTreeCursor(this, TRANSFER_BUFFER + SIZE_OF_NODE),
                C._ts_tree_cursor_reset_wasm(this.tree[0]),
                unmarshalTreeCursor(this);
            }
            get nodeType() {
              return this.tree.language.types[this.nodeTypeId] || "ERROR";
            }
            get nodeTypeId() {
              return (
                marshalTreeCursor(this),
                C._ts_tree_cursor_current_node_type_id_wasm(this.tree[0])
              );
            }
            get nodeId() {
              return (
                marshalTreeCursor(this),
                C._ts_tree_cursor_current_node_id_wasm(this.tree[0])
              );
            }
            get nodeIsNamed() {
              return (
                marshalTreeCursor(this),
                1 === C._ts_tree_cursor_current_node_is_named_wasm(this.tree[0])
              );
            }
            get nodeIsMissing() {
              return (
                marshalTreeCursor(this),
                1 ===
                  C._ts_tree_cursor_current_node_is_missing_wasm(this.tree[0])
              );
            }
            get nodeText() {
              marshalTreeCursor(this);
              const e = C._ts_tree_cursor_start_index_wasm(this.tree[0]),
                t = C._ts_tree_cursor_end_index_wasm(this.tree[0]);
              return getText(this.tree, e, t);
            }
            get startPosition() {
              return (
                marshalTreeCursor(this),
                C._ts_tree_cursor_start_position_wasm(this.tree[0]),
                unmarshalPoint(TRANSFER_BUFFER)
              );
            }
            get endPosition() {
              return (
                marshalTreeCursor(this),
                C._ts_tree_cursor_end_position_wasm(this.tree[0]),
                unmarshalPoint(TRANSFER_BUFFER)
              );
            }
            get startIndex() {
              return (
                marshalTreeCursor(this),
                C._ts_tree_cursor_start_index_wasm(this.tree[0])
              );
            }
            get endIndex() {
              return (
                marshalTreeCursor(this),
                C._ts_tree_cursor_end_index_wasm(this.tree[0])
              );
            }
            currentNode() {
              return (
                marshalTreeCursor(this),
                C._ts_tree_cursor_current_node_wasm(this.tree[0]),
                unmarshalNode(this.tree)
              );
            }
            currentFieldId() {
              return (
                marshalTreeCursor(this),
                C._ts_tree_cursor_current_field_id_wasm(this.tree[0])
              );
            }
            currentFieldName() {
              return this.tree.language.fields[this.currentFieldId()];
            }
            gotoFirstChild() {
              marshalTreeCursor(this);
              const e = C._ts_tree_cursor_goto_first_child_wasm(this.tree[0]);
              return unmarshalTreeCursor(this), 1 === e;
            }
            gotoNextSibling() {
              marshalTreeCursor(this);
              const e = C._ts_tree_cursor_goto_next_sibling_wasm(this.tree[0]);
              return unmarshalTreeCursor(this), 1 === e;
            }
            gotoParent() {
              marshalTreeCursor(this);
              const e = C._ts_tree_cursor_goto_parent_wasm(this.tree[0]);
              return unmarshalTreeCursor(this), 1 === e;
            }
          }
          class Language {
            constructor(e, t) {
              assertInternal(e),
                (this[0] = t),
                (this.types = new Array(C._ts_language_symbol_count(this[0])));
              for (let e = 0, t = this.types.length; e < t; e++)
                C._ts_language_symbol_type(this[0], e) < 2 &&
                  (this.types[e] = UTF8ToString(
                    C._ts_language_symbol_name(this[0], e)
                  ));
              this.fields = new Array(C._ts_language_field_count(this[0]) + 1);
              for (let e = 0, t = this.fields.length; e < t; e++) {
                const t = C._ts_language_field_name_for_id(this[0], e);
                this.fields[e] = 0 !== t ? UTF8ToString(t) : null;
              }
            }
            get version() {
              return C._ts_language_version(this[0]);
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
              const r = lengthBytesUTF8(e),
                _ = C._malloc(r + 1);
              stringToUTF8(e, _, r + 1);
              const n = C._ts_language_symbol_for_name(this[0], _, r, t);
              return C._free(_), n || null;
            }
            get nodeTypeCount() {
              return C._ts_language_symbol_count(this[0]);
            }
            nodeTypeForId(e) {
              const t = C._ts_language_symbol_name(this[0], e);
              return t ? UTF8ToString(t) : null;
            }
            nodeTypeIsNamed(e) {
              return !!C._ts_language_type_is_named_wasm(this[0], e);
            }
            nodeTypeIsVisible(e) {
              return !!C._ts_language_type_is_visible_wasm(this[0], e);
            }
            query(e) {
              const t = lengthBytesUTF8(e),
                r = C._malloc(t + 1);
              stringToUTF8(e, r, t + 1);
              const _ = C._ts_query_new(
                this[0],
                r,
                t,
                TRANSFER_BUFFER,
                TRANSFER_BUFFER + SIZE_OF_INT
              );
              if (!_) {
                const t = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"),
                  _ = UTF8ToString(r, getValue(TRANSFER_BUFFER, "i32")).length,
                  n = e.substr(_, 100).split("\n")[0];
                let s,
                  a = n.match(QUERY_WORD_REGEX)[0];
                switch (t) {
                  case 2:
                    s = new RangeError(`Bad node name '${a}'`);
                    break;
                  case 3:
                    s = new RangeError(`Bad field name '${a}'`);
                    break;
                  case 4:
                    s = new RangeError(`Bad capture name @${a}`);
                    break;
                  case 5:
                    (s = new TypeError(
                      `Bad pattern structure at offset ${_}: '${n}'...`
                    )),
                      (a = "");
                    break;
                  default:
                    (s = new SyntaxError(
                      `Bad syntax at offset ${_}: '${n}'...`
                    )),
                      (a = "");
                }
                throw ((s.index = _), (s.length = a.length), C._free(r), s);
              }
              const n = C._ts_query_string_count(_),
                s = C._ts_query_capture_count(_),
                a = C._ts_query_pattern_count(_),
                o = new Array(s),
                i = new Array(n);
              for (let e = 0; e < s; e++) {
                const t = C._ts_query_capture_name_for_id(
                    _,
                    e,
                    TRANSFER_BUFFER
                  ),
                  r = getValue(TRANSFER_BUFFER, "i32");
                o[e] = UTF8ToString(t, r);
              }
              for (let e = 0; e < n; e++) {
                const t = C._ts_query_string_value_for_id(
                    _,
                    e,
                    TRANSFER_BUFFER
                  ),
                  r = getValue(TRANSFER_BUFFER, "i32");
                i[e] = UTF8ToString(t, r);
              }
              const l = new Array(a),
                u = new Array(a),
                d = new Array(a),
                c = new Array(a),
                m = new Array(a);
              for (let e = 0; e < a; e++) {
                const t = C._ts_query_predicates_for_pattern(
                    _,
                    e,
                    TRANSFER_BUFFER
                  ),
                  r = getValue(TRANSFER_BUFFER, "i32");
                (c[e] = []), (m[e] = []);
                const n = [];
                let s = t;
                for (let t = 0; t < r; t++) {
                  const t = getValue(s, "i32");
                  s += SIZE_OF_INT;
                  const r = getValue(s, "i32");
                  if (((s += SIZE_OF_INT), t === PREDICATE_STEP_TYPE_CAPTURE))
                    n.push({ type: "capture", name: o[r] });
                  else if (t === PREDICATE_STEP_TYPE_STRING)
                    n.push({ type: "string", value: i[r] });
                  else if (n.length > 0) {
                    if ("string" !== n[0].type)
                      throw new Error(
                        "Predicates must begin with a literal value"
                      );
                    const t = n[0].value;
                    let r = !0;
                    switch (t) {
                      case "not-eq?":
                        r = !1;
                      case "eq?":
                        if (3 !== n.length)
                          throw new Error(
                            "Wrong number of arguments to `#eq?` predicate. Expected 2, got " +
                              (n.length - 1)
                          );
                        if ("capture" !== n[1].type)
                          throw new Error(
                            `First argument of \`#eq?\` predicate must be a capture. Got "${n[1].value}"`
                          );
                        if ("capture" === n[2].type) {
                          const t = n[1].name,
                            _ = n[2].name;
                          m[e].push(function (e) {
                            let n, s;
                            for (const r of e)
                              r.name === t && (n = r.node),
                                r.name === _ && (s = r.node);
                            return (
                              void 0 === n ||
                              void 0 === s ||
                              (n.text === s.text) === r
                            );
                          });
                        } else {
                          const t = n[1].name,
                            _ = n[2].value;
                          m[e].push(function (e) {
                            for (const n of e)
                              if (n.name === t)
                                return (n.node.text === _) === r;
                            return !0;
                          });
                        }
                        break;
                      case "not-match?":
                        r = !1;
                      case "match?":
                        if (3 !== n.length)
                          throw new Error(
                            `Wrong number of arguments to \`#match?\` predicate. Expected 2, got ${
                              n.length - 1
                            }.`
                          );
                        if ("capture" !== n[1].type)
                          throw new Error(
                            `First argument of \`#match?\` predicate must be a capture. Got "${n[1].value}".`
                          );
                        if ("string" !== n[2].type)
                          throw new Error(
                            `Second argument of \`#match?\` predicate must be a string. Got @${n[2].value}.`
                          );
                        const _ = n[1].name,
                          s = new RegExp(n[2].value);
                        m[e].push(function (e) {
                          for (const t of e)
                            if (t.name === _) return s.test(t.node.text) === r;
                          return !0;
                        });
                        break;
                      case "set!":
                        if (n.length < 2 || n.length > 3)
                          throw new Error(
                            `Wrong number of arguments to \`#set!\` predicate. Expected 1 or 2. Got ${
                              n.length - 1
                            }.`
                          );
                        if (n.some((e) => "string" !== e.type))
                          throw new Error(
                            'Arguments to `#set!` predicate must be a strings.".'
                          );
                        l[e] || (l[e] = {}),
                          (l[e][n[1].value] = n[2] ? n[2].value : null);
                        break;
                      case "is?":
                      case "is-not?":
                        if (n.length < 2 || n.length > 3)
                          throw new Error(
                            `Wrong number of arguments to \`#${t}\` predicate. Expected 1 or 2. Got ${
                              n.length - 1
                            }.`
                          );
                        if (n.some((e) => "string" !== e.type))
                          throw new Error(
                            `Arguments to \`#${t}\` predicate must be a strings.".`
                          );
                        const a = "is?" === t ? u : d;
                        a[e] || (a[e] = {}),
                          (a[e][n[1].value] = n[2] ? n[2].value : null);
                        break;
                      default:
                        c[e].push({ operator: t, operands: n.slice(1) });
                    }
                    n.length = 0;
                  }
                }
                Object.freeze(l[e]), Object.freeze(u[e]), Object.freeze(d[e]);
              }
              return (
                C._free(r),
                new Query(
                  INTERNAL,
                  _,
                  o,
                  m,
                  c,
                  Object.freeze(l),
                  Object.freeze(u),
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
                "function" == typeof loadSideModule
                  ? loadSideModule
                  : loadWebAssemblyModule;
              return t
                .then((e) => r(e, { loadAsync: !0 }))
                .then((e) => {
                  const t = Object.keys(e),
                    r = t.find(
                      (e) =>
                        LANGUAGE_FUNCTION_REGEX.test(e) &&
                        !e.includes("external_scanner_")
                    );
                  r ||
                    console.log(
                      `Couldn't find language function in WASM file. Symbols:\n${JSON.stringify(
                        t,
                        null,
                        2
                      )}`
                    );
                  const _ = e[r]();
                  return new Language(INTERNAL, _);
                });
            }
          }
          class Query {
            constructor(e, t, r, _, n, s, a, o) {
              assertInternal(e),
                (this[0] = t),
                (this.captureNames = r),
                (this.textPredicates = _),
                (this.predicates = n),
                (this.setProperties = s),
                (this.assertedProperties = a),
                (this.refutedProperties = o),
                (this.exceededMatchLimit = !1);
            }
            delete() {
              C._ts_query_delete(this[0]), (this[0] = 0);
            }
            matches(e, t, r, _) {
              t || (t = ZERO_POINT), r || (r = ZERO_POINT), _ || (_ = {});
              let n = _.matchLimit;
              if (void 0 === n) n = 0;
              else if ("number" != typeof n)
                throw new Error("Arguments must be numbers");
              marshalNode(e),
                C._ts_query_matches_wasm(
                  this[0],
                  e.tree[0],
                  t.row,
                  t.column,
                  r.row,
                  r.column,
                  n
                );
              const s = getValue(TRANSFER_BUFFER, "i32"),
                a = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"),
                o = getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32"),
                i = new Array(s);
              this.exceededMatchLimit = !!o;
              let l = 0,
                u = a;
              for (let t = 0; t < s; t++) {
                const r = getValue(u, "i32");
                u += SIZE_OF_INT;
                const _ = getValue(u, "i32");
                u += SIZE_OF_INT;
                const n = new Array(_);
                if (
                  ((u = unmarshalCaptures(this, e.tree, u, n)),
                  this.textPredicates[r].every((e) => e(n)))
                ) {
                  i[l++] = { pattern: r, captures: n };
                  const e = this.setProperties[r];
                  e && (i[t].setProperties = e);
                  const _ = this.assertedProperties[r];
                  _ && (i[t].assertedProperties = _);
                  const s = this.refutedProperties[r];
                  s && (i[t].refutedProperties = s);
                }
              }
              return (i.length = l), C._free(a), i;
            }
            captures(e, t, r, _) {
              t || (t = ZERO_POINT), r || (r = ZERO_POINT), _ || (_ = {});
              let n = _.matchLimit;
              if (void 0 === n) n = 0;
              else if ("number" != typeof n)
                throw new Error("Arguments must be numbers");
              marshalNode(e),
                C._ts_query_captures_wasm(
                  this[0],
                  e.tree[0],
                  t.row,
                  t.column,
                  r.row,
                  r.column,
                  n
                );
              const s = getValue(TRANSFER_BUFFER, "i32"),
                a = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"),
                o = getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32"),
                i = [];
              this.exceededMatchLimit = !!o;
              const l = [];
              let u = a;
              for (let t = 0; t < s; t++) {
                const t = getValue(u, "i32");
                u += SIZE_OF_INT;
                const r = getValue(u, "i32");
                u += SIZE_OF_INT;
                const _ = getValue(u, "i32");
                if (
                  ((u += SIZE_OF_INT),
                  (l.length = r),
                  (u = unmarshalCaptures(this, e.tree, u, l)),
                  this.textPredicates[t].every((e) => e(l)))
                ) {
                  const e = l[_],
                    r = this.setProperties[t];
                  r && (e.setProperties = r);
                  const n = this.assertedProperties[t];
                  n && (e.assertedProperties = n);
                  const s = this.refutedProperties[t];
                  s && (e.refutedProperties = s), i.push(e);
                }
              }
              return C._free(a), i;
            }
            predicatesForPattern(e) {
              return this.predicates[e];
            }
            didExceedMatchLimit() {
              return this.exceededMatchLimit;
            }
          }
          function getText(e, t, r) {
            const _ = r - t;
            let n = e.textCallback(t, null, r);
            for (t += n.length; t < r; ) {
              const _ = e.textCallback(t, null, r);
              if (!(_ && _.length > 0)) break;
              (t += _.length), (n += _);
            }
            return t > r && (n = n.slice(0, _)), n;
          }
          function unmarshalCaptures(e, t, r, _) {
            for (let n = 0, s = _.length; n < s; n++) {
              const s = getValue(r, "i32"),
                a = unmarshalNode(t, (r += SIZE_OF_INT));
              (r += SIZE_OF_NODE),
                (_[n] = { name: e.captureNames[s], node: a });
            }
            return r;
          }
          function assertInternal(e) {
            if (e !== INTERNAL) throw new Error("Illegal constructor");
          }
          function isPoint(e) {
            return e && "number" == typeof e.row && "number" == typeof e.column;
          }
          function marshalNode(e) {
            let t = TRANSFER_BUFFER;
            setValue(t, e.id, "i32"),
              (t += SIZE_OF_INT),
              setValue(t, e.startIndex, "i32"),
              (t += SIZE_OF_INT),
              setValue(t, e.startPosition.row, "i32"),
              (t += SIZE_OF_INT),
              setValue(t, e.startPosition.column, "i32"),
              (t += SIZE_OF_INT),
              setValue(t, e[0], "i32");
          }
          function unmarshalNode(e, t = TRANSFER_BUFFER) {
            const r = getValue(t, "i32");
            if (0 === r) return null;
            const _ = getValue((t += SIZE_OF_INT), "i32"),
              n = getValue((t += SIZE_OF_INT), "i32"),
              s = getValue((t += SIZE_OF_INT), "i32"),
              a = getValue((t += SIZE_OF_INT), "i32"),
              o = new Node(INTERNAL, e);
            return (
              (o.id = r),
              (o.startIndex = _),
              (o.startPosition = { row: n, column: s }),
              (o[0] = a),
              o
            );
          }
          function marshalTreeCursor(e, t = TRANSFER_BUFFER) {
            setValue(t + 0 * SIZE_OF_INT, e[0], "i32"),
              setValue(t + 1 * SIZE_OF_INT, e[1], "i32"),
              setValue(t + 2 * SIZE_OF_INT, e[2], "i32");
          }
          function unmarshalTreeCursor(e) {
            (e[0] = getValue(TRANSFER_BUFFER + 0 * SIZE_OF_INT, "i32")),
              (e[1] = getValue(TRANSFER_BUFFER + 1 * SIZE_OF_INT, "i32")),
              (e[2] = getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32"));
          }
          function marshalPoint(e, t) {
            setValue(e, t.row, "i32"),
              setValue(e + SIZE_OF_INT, t.column, "i32");
          }
          function unmarshalPoint(e) {
            return {
              row: getValue(e, "i32"),
              column: getValue(e + SIZE_OF_INT, "i32"),
            };
          }
          function marshalRange(e, t) {
            marshalPoint(e, t.startPosition),
              marshalPoint((e += SIZE_OF_POINT), t.endPosition),
              setValue((e += SIZE_OF_POINT), t.startIndex, "i32"),
              setValue((e += SIZE_OF_INT), t.endIndex, "i32"),
              (e += SIZE_OF_INT);
          }
          function unmarshalRange(e) {
            const t = {};
            return (
              (t.startPosition = unmarshalPoint(e)),
              (e += SIZE_OF_POINT),
              (t.endPosition = unmarshalPoint(e)),
              (e += SIZE_OF_POINT),
              (t.startIndex = getValue(e, "i32")),
              (e += SIZE_OF_INT),
              (t.endIndex = getValue(e, "i32")),
              t
            );
          }
          function marshalEdit(e) {
            let t = TRANSFER_BUFFER;
            marshalPoint(t, e.startPosition),
              (t += SIZE_OF_POINT),
              marshalPoint(t, e.oldEndPosition),
              (t += SIZE_OF_POINT),
              marshalPoint(t, e.newEndPosition),
              (t += SIZE_OF_POINT),
              setValue(t, e.startIndex, "i32"),
              (t += SIZE_OF_INT),
              setValue(t, e.oldEndIndex, "i32"),
              (t += SIZE_OF_INT),
              setValue(t, e.newEndIndex, "i32"),
              (t += SIZE_OF_INT);
          }
          for (const e of Object.getOwnPropertyNames(ParserImpl.prototype))
            Object.defineProperty(Parser.prototype, e, {
              value: ParserImpl.prototype[e],
              enumerable: !1,
              writable: !1,
            });
          (Parser.Language = Language),
            (Module.onRuntimeInitialized = () => {
              ParserImpl.init(), resolveInitPromise();
            });
        })))
      );
    }
  }
  return Parser;
})();
"object" == typeof exports && (module.exports = TreeSitter);
