(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.QuicksearchBar = factory());
})(this, (function () { 'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function append_styles(target, style_sheet_id, styles) {
        const append_styles_to = get_root_for_style(target);
        if (!append_styles_to.getElementById(style_sheet_id)) {
            const style = element('style');
            style.id = style_sheet_id;
            style.textContent = styles;
            append_stylesheet(append_styles_to, style);
        }
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    class HtmlTag {
        constructor() {
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function commonjsRequire (path) {
    	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
    }

    var fuzzysort$1 = {exports: {}};

    /*
      fuzzysort.js https://github.com/farzher/fuzzysort
      SublimeText-like Fuzzy Search

      fuzzysort.single('fs', 'Fuzzy Search') // {score: -16}
      fuzzysort.single('test', 'test') // {score: 0}
      fuzzysort.single('doesnt exist', 'target') // null

      fuzzysort.go('mr', [{file:'Monitor.cpp'}, {file:'MeshRenderer.cpp'}], {key:'file'})
      // [{score:-18, obj:{file:'MeshRenderer.cpp'}}, {score:-6009, obj:{file:'Monitor.cpp'}}]

      fuzzysort.go('mr', ['Monitor.cpp', 'MeshRenderer.cpp'])
      // [{score: -18, target: "MeshRenderer.cpp"}, {score: -6009, target: "Monitor.cpp"}]

      fuzzysort.highlight(fuzzysort.single('fs', 'Fuzzy Search'), '<b>', '</b>')
      // <b>F</b>uzzy <b>S</b>earch
    */

    (function (module) {
    (function(root, UMD) {
      if(module.exports) module.exports = UMD();
      else root.fuzzysort = UMD();
    })(commonjsGlobal, function UMD() { function fuzzysortNew(instanceOptions) {

      var fuzzysort = {

        single: function(search, target, options) {if(search=='farzher')return {target:"farzher was here (^-^*)/",score:0,indexes:[0,1,2,3,4,5,6]}
          if(!search) return null
          if(!isObj(search)) search = fuzzysort.getPreparedSearch(search);

          if(!target) return null
          if(!isObj(target)) target = fuzzysort.getPrepared(target);

          var allowTypo = options && options.allowTypo!==undefined ? options.allowTypo
            : instanceOptions && instanceOptions.allowTypo!==undefined ? instanceOptions.allowTypo
            : true;
          var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo;
          return algorithm(search, target, search[0])
        },

        go: function(search, targets, options) {if(search=='farzher')return [{target:"farzher was here (^-^*)/",score:0,indexes:[0,1,2,3,4,5,6],obj:targets?targets[0]:null}]
          if(!search) return noResults
          search = fuzzysort.prepareSearch(search);
          var searchLowerCode = search[0];

          var threshold = options && options.threshold || instanceOptions && instanceOptions.threshold || -9007199254740991;
          var limit = options && options.limit || instanceOptions && instanceOptions.limit || 9007199254740991;
          var allowTypo = options && options.allowTypo!==undefined ? options.allowTypo
            : instanceOptions && instanceOptions.allowTypo!==undefined ? instanceOptions.allowTypo
            : true;
          var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo;
          var resultsLen = 0; var limitedCount = 0;
          var targetsLen = targets.length;

          // This code is copy/pasted 3 times for performance reasons [options.keys, options.key, no keys]

          // options.keys
          if(options && options.keys) {
            var scoreFn = options.scoreFn || defaultScoreFn;
            var keys = options.keys;
            var keysLen = keys.length;
            for(var i = targetsLen - 1; i >= 0; --i) { var obj = targets[i];
              var objResults = new Array(keysLen);
              for (var keyI = keysLen - 1; keyI >= 0; --keyI) {
                var key = keys[keyI];
                var target = getValue(obj, key);
                if(!target) { objResults[keyI] = null; continue }
                if(!isObj(target)) target = fuzzysort.getPrepared(target);

                objResults[keyI] = algorithm(search, target, searchLowerCode);
              }
              objResults.obj = obj; // before scoreFn so scoreFn can use it
              var score = scoreFn(objResults);
              if(score === null) continue
              if(score < threshold) continue
              objResults.score = score;
              if(resultsLen < limit) { q.add(objResults); ++resultsLen; }
              else {
                ++limitedCount;
                if(score > q.peek().score) q.replaceTop(objResults);
              }
            }

          // options.key
          } else if(options && options.key) {
            var key = options.key;
            for(var i = targetsLen - 1; i >= 0; --i) { var obj = targets[i];
              var target = getValue(obj, key);
              if(!target) continue
              if(!isObj(target)) target = fuzzysort.getPrepared(target);

              var result = algorithm(search, target, searchLowerCode);
              if(result === null) continue
              if(result.score < threshold) continue

              // have to clone result so duplicate targets from different obj can each reference the correct obj
              result = {target:result.target, _targetLowerCodes:null, _nextBeginningIndexes:null, score:result.score, indexes:result.indexes, obj:obj}; // hidden

              if(resultsLen < limit) { q.add(result); ++resultsLen; }
              else {
                ++limitedCount;
                if(result.score > q.peek().score) q.replaceTop(result);
              }
            }

          // no keys
          } else {
            for(var i = targetsLen - 1; i >= 0; --i) { var target = targets[i];
              if(!target) continue
              if(!isObj(target)) target = fuzzysort.getPrepared(target);

              var result = algorithm(search, target, searchLowerCode);
              if(result === null) continue
              if(result.score < threshold) continue
              if(resultsLen < limit) { q.add(result); ++resultsLen; }
              else {
                ++limitedCount;
                if(result.score > q.peek().score) q.replaceTop(result);
              }
            }
          }

          if(resultsLen === 0) return noResults
          var results = new Array(resultsLen);
          for(var i = resultsLen - 1; i >= 0; --i) results[i] = q.poll();
          results.total = resultsLen + limitedCount;
          return results
        },

        goAsync: function(search, targets, options) {
          var canceled = false;
          var p = new Promise(function(resolve, reject) {if(search=='farzher')return resolve([{target:"farzher was here (^-^*)/",score:0,indexes:[0,1,2,3,4,5,6],obj:targets?targets[0]:null}])
            if(!search) return resolve(noResults)
            search = fuzzysort.prepareSearch(search);
            var searchLowerCode = search[0];

            var q = fastpriorityqueue();
            var iCurrent = targets.length - 1;
            var threshold = options && options.threshold || instanceOptions && instanceOptions.threshold || -9007199254740991;
            var limit = options && options.limit || instanceOptions && instanceOptions.limit || 9007199254740991;
            var allowTypo = options && options.allowTypo!==undefined ? options.allowTypo
              : instanceOptions && instanceOptions.allowTypo!==undefined ? instanceOptions.allowTypo
              : true;
            var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo;
            var resultsLen = 0; var limitedCount = 0;
            function step() {
              if(canceled) return reject('canceled')

              var startMs = Date.now();

              // This code is copy/pasted 3 times for performance reasons [options.keys, options.key, no keys]

              // options.keys
              if(options && options.keys) {
                var scoreFn = options.scoreFn || defaultScoreFn;
                var keys = options.keys;
                var keysLen = keys.length;
                for(; iCurrent >= 0; --iCurrent) {
                  if(iCurrent%1000/*itemsPerCheck*/ === 0) {
                    if(Date.now() - startMs >= 10/*asyncInterval*/) {
                      isNode?setImmediate(step):setTimeout(step);
                      return
                    }
                  }

                  var obj = targets[iCurrent];
                  var objResults = new Array(keysLen);
                  for (var keyI = keysLen - 1; keyI >= 0; --keyI) {
                    var key = keys[keyI];
                    var target = getValue(obj, key);
                    if(!target) { objResults[keyI] = null; continue }
                    if(!isObj(target)) target = fuzzysort.getPrepared(target);

                    objResults[keyI] = algorithm(search, target, searchLowerCode);
                  }
                  objResults.obj = obj; // before scoreFn so scoreFn can use it
                  var score = scoreFn(objResults);
                  if(score === null) continue
                  if(score < threshold) continue
                  objResults.score = score;
                  if(resultsLen < limit) { q.add(objResults); ++resultsLen; }
                  else {
                    ++limitedCount;
                    if(score > q.peek().score) q.replaceTop(objResults);
                  }
                }

              // options.key
              } else if(options && options.key) {
                var key = options.key;
                for(; iCurrent >= 0; --iCurrent) {
                  if(iCurrent%1000/*itemsPerCheck*/ === 0) {
                    if(Date.now() - startMs >= 10/*asyncInterval*/) {
                      isNode?setImmediate(step):setTimeout(step);
                      return
                    }
                  }

                  var obj = targets[iCurrent];
                  var target = getValue(obj, key);
                  if(!target) continue
                  if(!isObj(target)) target = fuzzysort.getPrepared(target);

                  var result = algorithm(search, target, searchLowerCode);
                  if(result === null) continue
                  if(result.score < threshold) continue

                  // have to clone result so duplicate targets from different obj can each reference the correct obj
                  result = {target:result.target, _targetLowerCodes:null, _nextBeginningIndexes:null, score:result.score, indexes:result.indexes, obj:obj}; // hidden

                  if(resultsLen < limit) { q.add(result); ++resultsLen; }
                  else {
                    ++limitedCount;
                    if(result.score > q.peek().score) q.replaceTop(result);
                  }
                }

              // no keys
              } else {
                for(; iCurrent >= 0; --iCurrent) {
                  if(iCurrent%1000/*itemsPerCheck*/ === 0) {
                    if(Date.now() - startMs >= 10/*asyncInterval*/) {
                      isNode?setImmediate(step):setTimeout(step);
                      return
                    }
                  }

                  var target = targets[iCurrent];
                  if(!target) continue
                  if(!isObj(target)) target = fuzzysort.getPrepared(target);

                  var result = algorithm(search, target, searchLowerCode);
                  if(result === null) continue
                  if(result.score < threshold) continue
                  if(resultsLen < limit) { q.add(result); ++resultsLen; }
                  else {
                    ++limitedCount;
                    if(result.score > q.peek().score) q.replaceTop(result);
                  }
                }
              }

              if(resultsLen === 0) return resolve(noResults)
              var results = new Array(resultsLen);
              for(var i = resultsLen - 1; i >= 0; --i) results[i] = q.poll();
              results.total = resultsLen + limitedCount;
              resolve(results);
            }

            isNode?setImmediate(step):step(); //setTimeout here is too slow
          });
          p.cancel = function() { canceled = true; };
          return p
        },

        highlight: function(result, hOpen, hClose) {
          if(typeof hOpen == 'function') return fuzzysort.highlightCallback(result, hOpen)
          if(result === null) return null
          if(hOpen === undefined) hOpen = '<b>';
          if(hClose === undefined) hClose = '</b>';
          var highlighted = '';
          var matchesIndex = 0;
          var opened = false;
          var target = result.target;
          var targetLen = target.length;
          var matchesBest = result.indexes;
          for(var i = 0; i < targetLen; ++i) { var char = target[i];
            if(matchesBest[matchesIndex] === i) {
              ++matchesIndex;
              if(!opened) { opened = true;
                highlighted += hOpen;
              }

              if(matchesIndex === matchesBest.length) {
                highlighted += char + hClose + target.substr(i+1);
                break
              }
            } else {
              if(opened) { opened = false;
                highlighted += hClose;
              }
            }
            highlighted += char;
          }

          return highlighted
        },
        highlightCallback: function(result, cb) {
          if(result === null) return null
          var target = result.target;
          var targetLen = target.length;
          var indexes = result.indexes;
          var highlighted = '';
          var matchI = 0;
          var indexesI = 0;
          var opened = false;
          var result = [];
          for(var i = 0; i < targetLen; ++i) { var char = target[i];
            if(indexes[indexesI] === i) {
              ++indexesI;
              if(!opened) { opened = true;
                result.push(highlighted); highlighted = '';
              }

              if(indexesI === indexes.length) {
                highlighted += char;
                result.push(cb(highlighted, matchI++)); highlighted = '';
                result.push(target.substr(i+1));
                break
              }
            } else {
              if(opened) { opened = false;
                result.push(cb(highlighted, matchI++)); highlighted = '';
              }
            }
            highlighted += char;
          }
          return result
        },

        prepare: function(target) {
          if(!target) return {target: '', _targetLowerCodes: [0/*this 0 doesn't make sense. here because an empty array causes the algorithm to deoptimize and run 50% slower!*/], _nextBeginningIndexes: null, score: null, indexes: null, obj: null} // hidden
          return {target:target, _targetLowerCodes:fuzzysort.prepareLowerCodes(target), _nextBeginningIndexes:null, score:null, indexes:null, obj:null} // hidden
        },
        prepareSlow: function(target) {
          if(!target) return {target: '', _targetLowerCodes: [0/*this 0 doesn't make sense. here because an empty array causes the algorithm to deoptimize and run 50% slower!*/], _nextBeginningIndexes: null, score: null, indexes: null, obj: null} // hidden
          return {target:target, _targetLowerCodes:fuzzysort.prepareLowerCodes(target), _nextBeginningIndexes:fuzzysort.prepareNextBeginningIndexes(target), score:null, indexes:null, obj:null} // hidden
        },
        prepareSearch: function(search) {
          if(!search) search = '';
          return fuzzysort.prepareLowerCodes(search)
        },



        // Below this point is only internal code
        // Below this point is only internal code
        // Below this point is only internal code
        // Below this point is only internal code



        getPrepared: function(target) {
          if(target.length > 999) return fuzzysort.prepare(target) // don't cache huge targets
          var targetPrepared = preparedCache.get(target);
          if(targetPrepared !== undefined) return targetPrepared
          targetPrepared = fuzzysort.prepare(target);
          preparedCache.set(target, targetPrepared);
          return targetPrepared
        },
        getPreparedSearch: function(search) {
          if(search.length > 999) return fuzzysort.prepareSearch(search) // don't cache huge searches
          var searchPrepared = preparedSearchCache.get(search);
          if(searchPrepared !== undefined) return searchPrepared
          searchPrepared = fuzzysort.prepareSearch(search);
          preparedSearchCache.set(search, searchPrepared);
          return searchPrepared
        },

        algorithm: function(searchLowerCodes, prepared, searchLowerCode) {
          var targetLowerCodes = prepared._targetLowerCodes;
          var searchLen = searchLowerCodes.length;
          var targetLen = targetLowerCodes.length;
          var searchI = 0; // where we at
          var targetI = 0; // where you at
          var typoSimpleI = 0;
          var matchesSimpleLen = 0;

          // very basic fuzzy match; to remove non-matching targets ASAP!
          // walk through target. find sequential matches.
          // if all chars aren't found then exit
          for(;;) {
            var isMatch = searchLowerCode === targetLowerCodes[targetI];
            if(isMatch) {
              matchesSimple[matchesSimpleLen++] = targetI;
              ++searchI; if(searchI === searchLen) break
              searchLowerCode = searchLowerCodes[typoSimpleI===0?searchI : (typoSimpleI===searchI?searchI+1 : (typoSimpleI===searchI-1?searchI-1 : searchI))];
            }

            ++targetI; if(targetI >= targetLen) { // Failed to find searchI
              // Check for typo or exit
              // we go as far as possible before trying to transpose
              // then we transpose backwards until we reach the beginning
              for(;;) {
                if(searchI <= 1) return null // not allowed to transpose first char
                if(typoSimpleI === 0) { // we haven't tried to transpose yet
                  --searchI;
                  var searchLowerCodeNew = searchLowerCodes[searchI];
                  if(searchLowerCode === searchLowerCodeNew) continue // doesn't make sense to transpose a repeat char
                  typoSimpleI = searchI;
                } else {
                  if(typoSimpleI === 1) return null // reached the end of the line for transposing
                  --typoSimpleI;
                  searchI = typoSimpleI;
                  searchLowerCode = searchLowerCodes[searchI + 1];
                  var searchLowerCodeNew = searchLowerCodes[searchI];
                  if(searchLowerCode === searchLowerCodeNew) continue // doesn't make sense to transpose a repeat char
                }
                matchesSimpleLen = searchI;
                targetI = matchesSimple[matchesSimpleLen - 1] + 1;
                break
              }
            }
          }

          var searchI = 0;
          var typoStrictI = 0;
          var successStrict = false;
          var matchesStrictLen = 0;

          var nextBeginningIndexes = prepared._nextBeginningIndexes;
          if(nextBeginningIndexes === null) nextBeginningIndexes = prepared._nextBeginningIndexes = fuzzysort.prepareNextBeginningIndexes(prepared.target);
          var firstPossibleI = targetI = matchesSimple[0]===0 ? 0 : nextBeginningIndexes[matchesSimple[0]-1];

          // Our target string successfully matched all characters in sequence!
          // Let's try a more advanced and strict test to improve the score
          // only count it as a match if it's consecutive or a beginning character!
          if(targetI !== targetLen) for(;;) {
            if(targetI >= targetLen) {
              // We failed to find a good spot for this search char, go back to the previous search char and force it forward
              if(searchI <= 0) { // We failed to push chars forward for a better match
                // transpose, starting from the beginning
                ++typoStrictI; if(typoStrictI > searchLen-2) break
                if(searchLowerCodes[typoStrictI] === searchLowerCodes[typoStrictI+1]) continue // doesn't make sense to transpose a repeat char
                targetI = firstPossibleI;
                continue
              }

              --searchI;
              var lastMatch = matchesStrict[--matchesStrictLen];
              targetI = nextBeginningIndexes[lastMatch];

            } else {
              var isMatch = searchLowerCodes[typoStrictI===0?searchI : (typoStrictI===searchI?searchI+1 : (typoStrictI===searchI-1?searchI-1 : searchI))] === targetLowerCodes[targetI];
              if(isMatch) {
                matchesStrict[matchesStrictLen++] = targetI;
                ++searchI; if(searchI === searchLen) { successStrict = true; break }
                ++targetI;
              } else {
                targetI = nextBeginningIndexes[targetI];
              }
            }
          }

          { // tally up the score & keep track of matches for highlighting later
            if(successStrict) { var matchesBest = matchesStrict; var matchesBestLen = matchesStrictLen; }
            else { var matchesBest = matchesSimple; var matchesBestLen = matchesSimpleLen; }
            var score = 0;
            var lastTargetI = -1;
            for(var i = 0; i < searchLen; ++i) { var targetI = matchesBest[i];
              // score only goes down if they're not consecutive
              if(lastTargetI !== targetI - 1) score -= targetI;
              lastTargetI = targetI;
            }
            if(!successStrict) {
              score *= 1000;
              if(typoSimpleI !== 0) score += -20;/*typoPenalty*/
            } else {
              if(typoStrictI !== 0) score += -20;/*typoPenalty*/
            }
            score -= targetLen - searchLen;
            prepared.score = score;
            prepared.indexes = new Array(matchesBestLen); for(var i = matchesBestLen - 1; i >= 0; --i) prepared.indexes[i] = matchesBest[i];

            return prepared
          }
        },

        algorithmNoTypo: function(searchLowerCodes, prepared, searchLowerCode) {
          var targetLowerCodes = prepared._targetLowerCodes;
          var searchLen = searchLowerCodes.length;
          var targetLen = targetLowerCodes.length;
          var searchI = 0; // where we at
          var targetI = 0; // where you at
          var matchesSimpleLen = 0;

          // very basic fuzzy match; to remove non-matching targets ASAP!
          // walk through target. find sequential matches.
          // if all chars aren't found then exit
          for(;;) {
            var isMatch = searchLowerCode === targetLowerCodes[targetI];
            if(isMatch) {
              matchesSimple[matchesSimpleLen++] = targetI;
              ++searchI; if(searchI === searchLen) break
              searchLowerCode = searchLowerCodes[searchI];
            }
            ++targetI; if(targetI >= targetLen) return null // Failed to find searchI
          }

          var searchI = 0;
          var successStrict = false;
          var matchesStrictLen = 0;

          var nextBeginningIndexes = prepared._nextBeginningIndexes;
          if(nextBeginningIndexes === null) nextBeginningIndexes = prepared._nextBeginningIndexes = fuzzysort.prepareNextBeginningIndexes(prepared.target);
          targetI = matchesSimple[0]===0 ? 0 : nextBeginningIndexes[matchesSimple[0]-1];

          // Our target string successfully matched all characters in sequence!
          // Let's try a more advanced and strict test to improve the score
          // only count it as a match if it's consecutive or a beginning character!
          if(targetI !== targetLen) for(;;) {
            if(targetI >= targetLen) {
              // We failed to find a good spot for this search char, go back to the previous search char and force it forward
              if(searchI <= 0) break // We failed to push chars forward for a better match

              --searchI;
              var lastMatch = matchesStrict[--matchesStrictLen];
              targetI = nextBeginningIndexes[lastMatch];

            } else {
              var isMatch = searchLowerCodes[searchI] === targetLowerCodes[targetI];
              if(isMatch) {
                matchesStrict[matchesStrictLen++] = targetI;
                ++searchI; if(searchI === searchLen) { successStrict = true; break }
                ++targetI;
              } else {
                targetI = nextBeginningIndexes[targetI];
              }
            }
          }

          { // tally up the score & keep track of matches for highlighting later
            if(successStrict) { var matchesBest = matchesStrict; var matchesBestLen = matchesStrictLen; }
            else { var matchesBest = matchesSimple; var matchesBestLen = matchesSimpleLen; }
            var score = 0;
            var lastTargetI = -1;
            for(var i = 0; i < searchLen; ++i) { var targetI = matchesBest[i];
              // score only goes down if they're not consecutive
              if(lastTargetI !== targetI - 1) score -= targetI;
              lastTargetI = targetI;
            }
            if(!successStrict) score *= 1000;
            score -= targetLen - searchLen;
            prepared.score = score;
            prepared.indexes = new Array(matchesBestLen); for(var i = matchesBestLen - 1; i >= 0; --i) prepared.indexes[i] = matchesBest[i];

            return prepared
          }
        },

        prepareLowerCodes: function(str) {
          var strLen = str.length;
          var lowerCodes = []; // new Array(strLen)    sparse array is too slow
          var lower = str.toLowerCase();
          for(var i = 0; i < strLen; ++i) lowerCodes[i] = lower.charCodeAt(i);
          return lowerCodes
        },
        prepareBeginningIndexes: function(target) {
          var targetLen = target.length;
          var beginningIndexes = []; var beginningIndexesLen = 0;
          var wasUpper = false;
          var wasAlphanum = false;
          for(var i = 0; i < targetLen; ++i) {
            var targetCode = target.charCodeAt(i);
            var isUpper = targetCode>=65&&targetCode<=90;
            var isAlphanum = isUpper || targetCode>=97&&targetCode<=122 || targetCode>=48&&targetCode<=57;
            var isBeginning = isUpper && !wasUpper || !wasAlphanum || !isAlphanum;
            wasUpper = isUpper;
            wasAlphanum = isAlphanum;
            if(isBeginning) beginningIndexes[beginningIndexesLen++] = i;
          }
          return beginningIndexes
        },
        prepareNextBeginningIndexes: function(target) {
          var targetLen = target.length;
          var beginningIndexes = fuzzysort.prepareBeginningIndexes(target);
          var nextBeginningIndexes = []; // new Array(targetLen)     sparse array is too slow
          var lastIsBeginning = beginningIndexes[0];
          var lastIsBeginningI = 0;
          for(var i = 0; i < targetLen; ++i) {
            if(lastIsBeginning > i) {
              nextBeginningIndexes[i] = lastIsBeginning;
            } else {
              lastIsBeginning = beginningIndexes[++lastIsBeginningI];
              nextBeginningIndexes[i] = lastIsBeginning===undefined ? targetLen : lastIsBeginning;
            }
          }
          return nextBeginningIndexes
        },

        cleanup: cleanup,
        new: fuzzysortNew,
      };
      return fuzzysort
    } // fuzzysortNew

    // This stuff is outside fuzzysortNew, because it's shared with instances of fuzzysort.new()
    var isNode = typeof commonjsRequire !== 'undefined' && typeof window === 'undefined';
    var MyMap = typeof Map === 'function' ? Map : function(){var s=Object.create(null);this.get=function(k){return s[k]};this.set=function(k,val){s[k]=val;return this};this.clear=function(){s=Object.create(null);};};
    var preparedCache = new MyMap();
    var preparedSearchCache = new MyMap();
    var noResults = []; noResults.total = 0;
    var matchesSimple = []; var matchesStrict = [];
    function cleanup() { preparedCache.clear(); preparedSearchCache.clear(); matchesSimple = []; matchesStrict = []; }
    function defaultScoreFn(a) {
      var max = -9007199254740991;
      for (var i = a.length - 1; i >= 0; --i) {
        var result = a[i]; if(result === null) continue
        var score = result.score;
        if(score > max) max = score;
      }
      if(max === -9007199254740991) return null
      return max
    }

    // prop = 'key'              2.5ms optimized for this case, seems to be about as fast as direct obj[prop]
    // prop = 'key1.key2'        10ms
    // prop = ['key1', 'key2']   27ms
    function getValue(obj, prop) {
      var tmp = obj[prop]; if(tmp !== undefined) return tmp
      var segs = prop;
      if(!Array.isArray(prop)) segs = prop.split('.');
      var len = segs.length;
      var i = -1;
      while (obj && (++i < len)) obj = obj[segs[i]];
      return obj
    }

    function isObj(x) { return typeof x === 'object' } // faster as a function

    // Hacked version of https://github.com/lemire/FastPriorityQueue.js
    var fastpriorityqueue=function(){var r=[],o=0,e={};function n(){for(var e=0,n=r[e],c=1;c<o;){var f=c+1;e=c,f<o&&r[f].score<r[c].score&&(e=f),r[e-1>>1]=r[e],c=1+(e<<1);}for(var a=e-1>>1;e>0&&n.score<r[a].score;a=(e=a)-1>>1)r[e]=r[a];r[e]=n;}return e.add=function(e){var n=o;r[o++]=e;for(var c=n-1>>1;n>0&&e.score<r[c].score;c=(n=c)-1>>1)r[n]=r[c];r[n]=e;},e.poll=function(){if(0!==o){var e=r[0];return r[0]=r[--o],n(),e}},e.peek=function(e){if(0!==o)return r[0]},e.replaceTop=function(o){r[0]=o,n();},e};
    var q = fastpriorityqueue(); // reuse this, except for async, it needs to make its own

    return fuzzysortNew()
    }); // UMD

    // TODO: (performance) wasm version!?
    // TODO: (performance) threads?
    // TODO: (performance) avoid cache misses
    // TODO: (performance) preparedCache is a memory leak
    // TODO: (like sublime) backslash === forwardslash
    // TODO: (like sublime) spaces: "a b" should do 2 searches 1 for a and 1 for b
    // TODO: (scoring) garbage in targets that allows most searches to strict match need a penality
    // TODO: (performance) idk if allowTypo is optimized
    }(fuzzysort$1));

    var fuzzysort = fuzzysort$1.exports;

    /* src/QuickSearchBar.svelte generated by Svelte v3.46.4 */

    function add_css(target) {
    	append_styles(target, "svelte-1uv6ukv", ".hidden.svelte-1uv6ukv.svelte-1uv6ukv{display:none}#background.svelte-1uv6ukv.svelte-1uv6ukv{position:fixed;z-index:1000;background-color:rgba(0, 0, 0, 0.3);width:100%;height:100%;left:0;top:0}#foreground.svelte-1uv6ukv.svelte-1uv6ukv{z-index:1111;position:fixed;left:10%;top:10%;width:80%;background-color:white;padding:10px}input.svelte-1uv6ukv.svelte-1uv6ukv{width:100%;height:30px}.list.svelte-1uv6ukv.svelte-1uv6ukv{max-height:500px;overflow-y:auto}.list.svelte-1uv6ukv.svelte-1uv6ukv,.list.svelte-1uv6ukv li.svelte-1uv6ukv{margin:0;padding:0;text-indent:0;list-style-type:none}.list.svelte-1uv6ukv li.svelte-1uv6ukv{height:14px;line-height:14px;padding:14px}.list.svelte-1uv6ukv li.svelte-1uv6ukv:focus{background-color:rgba(0, 0, 0, 0.1)}.list.svelte-1uv6ukv:not(:focus-within)>.svelte-1uv6ukv:first-child{background-color:rgba(0, 0, 0, 0.1)}");
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	child_ctx[23] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    const get_item_slot_changes = dirty => ({ option: dirty & /*availiableOptions*/ 32 });
    const get_item_slot_context = ctx => ({ option: /*option*/ ctx[21] });
    const get_input_slot_changes = dirty => ({});
    const get_input_slot_context = ctx => ({});

    // (185:21)      
    function fallback_block_1(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			input = element("input");
    			attr(input, "type", "text");
    			attr(input, "class", "svelte-1uv6ukv");
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			set_input_value(input, /*value*/ ctx[1]);
    			/*input_binding*/ ctx[13](input);

    			if (!mounted) {
    				dispose = listen(input, "input", /*input_input_handler*/ ctx[12]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*value*/ 2 && input.value !== /*value*/ ctx[1]) {
    				set_input_value(input, /*value*/ ctx[1]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(input);
    			/*input_binding*/ ctx[13](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (199:4) {:else}
    function create_else_block(ctx) {
    	let li;

    	return {
    		c() {
    			li = element("li");
    			li.textContent = "No option";
    			attr(li, "class", "svelte-1uv6ukv");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    		}
    	};
    }

    // (192:10) {#each keys as key}
    function create_each_block_1(ctx) {
    	let span;
    	let html_tag;
    	let raw_value = /*option*/ ctx[21].html[/*key*/ ctx[24]] + "";
    	let t;

    	return {
    		c() {
    			span = element("span");
    			html_tag = new HtmlTag();
    			t = space();
    			html_tag.a = t;
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			html_tag.m(raw_value, span);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*availiableOptions, keys*/ 40 && raw_value !== (raw_value = /*option*/ ctx[21].html[/*key*/ ctx[24]] + "")) html_tag.p(raw_value);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (191:35)            
    function fallback_block(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*keys*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*availiableOptions, keys*/ 40) {
    				each_value_1 = /*keys*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (189:4) {#each availiableOptions as option, i}
    function create_each_block(ctx) {
    	let li;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	const item_slot_template = /*#slots*/ ctx[10].item;
    	const item_slot = create_slot(item_slot_template, ctx, /*$$scope*/ ctx[9], get_item_slot_context);
    	const item_slot_or_fallback = item_slot || fallback_block(ctx);

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[14](/*option*/ ctx[21]);
    	}

    	return {
    		c() {
    			li = element("li");
    			if (item_slot_or_fallback) item_slot_or_fallback.c();
    			t = space();
    			attr(li, "tabindex", "0");
    			attr(li, "class", "svelte-1uv6ukv");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);

    			if (item_slot_or_fallback) {
    				item_slot_or_fallback.m(li, null);
    			}

    			append(li, t);
    			current = true;

    			if (!mounted) {
    				dispose = listen(li, "click", click_handler_1);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (item_slot) {
    				if (item_slot.p && (!current || dirty & /*$$scope, availiableOptions*/ 544)) {
    					update_slot_base(
    						item_slot,
    						item_slot_template,
    						ctx,
    						/*$$scope*/ ctx[9],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
    						: get_slot_changes(item_slot_template, /*$$scope*/ ctx[9], dirty, get_item_slot_changes),
    						get_item_slot_context
    					);
    				}
    			} else {
    				if (item_slot_or_fallback && item_slot_or_fallback.p && (!current || dirty & /*keys, availiableOptions*/ 40)) {
    					item_slot_or_fallback.p(ctx, !current ? -1 : dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(item_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(item_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			if (item_slot_or_fallback) item_slot_or_fallback.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let ul;
    	let current;
    	let mounted;
    	let dispose;
    	const input_slot_template = /*#slots*/ ctx[10].input;
    	const input_slot = create_slot(input_slot_template, ctx, /*$$scope*/ ctx[9], get_input_slot_context);
    	const input_slot_or_fallback = input_slot || fallback_block_1(ctx);
    	let each_value = /*availiableOptions*/ ctx[5];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block();
    	}

    	return {
    		c() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			if (input_slot_or_fallback) input_slot_or_fallback.c();
    			t1 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each_1_else) {
    				each_1_else.c();
    			}

    			attr(div0, "id", "background");
    			attr(div0, "class", "svelte-1uv6ukv");
    			toggle_class(div0, "hidden", /*hidden*/ ctx[0]);
    			attr(ul, "class", "list svelte-1uv6ukv");
    			attr(div1, "id", "foreground");
    			attr(div1, "class", "svelte-1uv6ukv");
    			toggle_class(div1, "hidden", /*hidden*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			insert(target, t0, anchor);
    			insert(target, div1, anchor);

    			if (input_slot_or_fallback) {
    				input_slot_or_fallback.m(div1, null);
    			}

    			append(div1, t1);
    			append(div1, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(ul, null);
    			}

    			/*ul_binding*/ ctx[15](ul);
    			current = true;

    			if (!mounted) {
    				dispose = listen(div0, "click", /*click_handler*/ ctx[11]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*hidden*/ 1) {
    				toggle_class(div0, "hidden", /*hidden*/ ctx[0]);
    			}

    			if (input_slot) {
    				if (input_slot.p && (!current || dirty & /*$$scope*/ 512)) {
    					update_slot_base(
    						input_slot,
    						input_slot_template,
    						ctx,
    						/*$$scope*/ ctx[9],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
    						: get_slot_changes(input_slot_template, /*$$scope*/ ctx[9], dirty, get_input_slot_changes),
    						get_input_slot_context
    					);
    				}
    			} else {
    				if (input_slot_or_fallback && input_slot_or_fallback.p && (!current || dirty & /*value, inputEl*/ 6)) {
    					input_slot_or_fallback.p(ctx, !current ? -1 : dirty);
    				}
    			}

    			if (dirty & /*onAction, availiableOptions, keys, $$scope*/ 616) {
    				each_value = /*availiableOptions*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();

    				if (each_value.length) {
    					if (each_1_else) {
    						each_1_else.d(1);
    						each_1_else = null;
    					}
    				} else if (!each_1_else) {
    					each_1_else = create_else_block();
    					each_1_else.c();
    					each_1_else.m(ul, null);
    				}
    			}

    			if (dirty & /*hidden*/ 1) {
    				toggle_class(div1, "hidden", /*hidden*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(input_slot_or_fallback, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(input_slot_or_fallback, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div0);
    			if (detaching) detach(t0);
    			if (detaching) detach(div1);
    			if (input_slot_or_fallback) input_slot_or_fallback.d(detaching);
    			destroy_each(each_blocks, detaching);
    			if (each_1_else) each_1_else.d();
    			/*ul_binding*/ ctx[15](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let filteredOptions;
    	let availiableOptions;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { hidden = true } = $$props;
    	let { options = [{ label: "Example", link: "/" }] } = $$props;
    	let { keys = ["label", "link"] } = $$props;
    	let { value = "" } = $$props;
    	let { inputEl = undefined } = $$props;
    	const dispatch = createEventDispatcher();
    	let listEl;

    	onMount(() => {
    		window.addEventListener("keydown", onKeyDown);

    		return () => {
    			window.removeEventListener("keydown", onKeyDown);
    		};
    	});

    	function onAction(option) {
    		dispatch("pick", option);
    		$$invalidate(0, hidden = true);
    	}

    	async function focusText(hidden) {
    		$$invalidate(1, value = "");
    		await tick();
    		inputEl.focus();
    	}

    	function getFilteredOptions(value, options, keys) {
    		const res = fuzzysort.go(value, options, { keys });
    		return res;
    	}

    	function renderOptions(value, filteredOptions, options) {
    		const visibleOptions = value ? filteredOptions.map(r => r.obj) : options;

    		return visibleOptions.map((obj, i) => {
    			let html = {};

    			for (let y = 0; y < keys.length; y++) {
    				if (filteredOptions[i] && filteredOptions[i][y]) {
    					html[keys[y]] = fuzzysort.highlight(filteredOptions[i][y], "<b>", "</b>");
    				} else {
    					html[keys[y]] = obj[keys[y]];
    				}
    			}

    			let item = { obj, html };
    			return item;
    		});
    	}

    	function onKeyDown(e) {
    		// CTRL + K
    		if (e.ctrlKey && e.keyCode == 75) {
    			$$invalidate(1, value = "");
    			$$invalidate(0, hidden = false);
    			inputEl.focus();
    			e.preventDefault();
    		}

    		if (hidden) return;

    		switch (e.keyCode.toString()) {
    			case "27":
    				$$invalidate(0, hidden = true);
    				break;
    			case "38":
    				if (document.activeElement === inputEl) {
    					listEl.lastChild.focus();
    				} else if (document.activeElement.previousSibling) {
    					document.activeElement.previousSibling.focus();
    				} else {
    					listEl.lastChild.focus();
    				}
    				e.preventDefault();
    				break;
    			case "40":
    				if (document.activeElement === inputEl) {
    					listEl.firstChild.focus();
    				} else if (document.activeElement.nextSibling) {
    					document.activeElement.nextSibling.focus();
    				} else {
    					listEl.firstChild.focus();
    				}
    				e.preventDefault();
    				break;
    			case "13":
    				const index = Array.prototype.slice.call(listEl.children).indexOf(document.activeElement);
    				let option;
    				option = availiableOptions[index === -1 ? 0 : index];
    				if (option) {
    					onAction(option.obj);
    				}
    				break;
    			default:
    				if (e.key.length === 1 && e.ctrlKey === false && e.altKey === false && e.metaKey === false || e.key === "Backspace") {
    					inputEl.focus();
    				}
    				break;
    		}
    	}

    	const click_handler = () => $$invalidate(0, hidden = true);

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(1, value);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			inputEl = $$value;
    			$$invalidate(2, inputEl);
    		});
    	}

    	const click_handler_1 = option => onAction(option.obj);

    	function ul_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			listEl = $$value;
    			$$invalidate(4, listEl);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('hidden' in $$props) $$invalidate(0, hidden = $$props.hidden);
    		if ('options' in $$props) $$invalidate(7, options = $$props.options);
    		if ('keys' in $$props) $$invalidate(3, keys = $$props.keys);
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    		if ('inputEl' in $$props) $$invalidate(2, inputEl = $$props.inputEl);
    		if ('$$scope' in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value, options, keys*/ 138) {
    			$$invalidate(8, filteredOptions = getFilteredOptions(value, options, keys));
    		}

    		if ($$self.$$.dirty & /*value, filteredOptions, options*/ 386) {
    			$$invalidate(5, availiableOptions = renderOptions(value, filteredOptions, options));
    		}

    		if ($$self.$$.dirty & /*hidden*/ 1) {
    			!hidden && focusText();
    		}
    	};

    	return [
    		hidden,
    		value,
    		inputEl,
    		keys,
    		listEl,
    		availiableOptions,
    		onAction,
    		options,
    		filteredOptions,
    		$$scope,
    		slots,
    		click_handler,
    		input_input_handler,
    		input_binding,
    		click_handler_1,
    		ul_binding
    	];
    }

    class QuickSearchBar extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				hidden: 0,
    				options: 7,
    				keys: 3,
    				value: 1,
    				inputEl: 2
    			},
    			add_css
    		);
    	}
    }

    return QuickSearchBar;

}));
