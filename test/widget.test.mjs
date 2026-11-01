import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { buildPackage, normalizeVersion, toWindowsFileTime } from '../scripts/build.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Minimal Mock DOM Element for testing Coherent GT / Flow HTML interactions in Node.js.
 */
class MockElement {
  constructor(tagName = 'div', ownerDocument = null) {
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = ownerDocument;
    this.id = '';
    this.className = '';
    this.style = {};
    this.dataset = {};
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.listeners = new Map();
    this.value = '';
    this.disabled = false;
    this.scrollTop = 0;
    this.scrollHeight = 100;
    this._textContent = '';
    this._innerHTML = '';

    const self = this;
    this.classList = {
      add(...tokens) {
        const set = new Set(self.className.split(/\s+/).filter(Boolean));
        for (const t of tokens) set.add(t);
        self.className = Array.from(set).join(' ');
      },
      remove(...tokens) {
        const set = new Set(self.className.split(/\s+/).filter(Boolean));
        for (const t of tokens) set.delete(t);
        self.className = Array.from(set).join(' ');
      },
      toggle(token, force) {
        const set = new Set(self.className.split(/\s+/).filter(Boolean));
        const shouldAdd = force !== undefined ? Boolean(force) : !set.has(token);
        if (shouldAdd) set.add(token);
        else set.delete(token);
        self.className = Array.from(set).join(' ');
      },
      contains(token) {
        return self.className.split(/\s+/).filter(Boolean).includes(token);
      }
    };
  }

  get textContent() {
    if (this.children.length > 0 && !this._textContent) {
      return this.children.map((c) => c.textContent).join('');
    }
    return this._textContent;
  }

  set textContent(val) {
    this._textContent = String(val ?? '');
    this._innerHTML = this._textContent;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = String(val ?? '');
    this._textContent = this._innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    this.children = [];
  }

  setAttribute(name, value) {
    const strVal = String(value);
    this.attributes.set(name, strVal);
    if (name === 'id') this.id = strVal;
    if (name === 'class') this.className = strVal;
    if (name.startsWith('data-')) {
      const camel = name
        .slice(5)
        .replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      this.dataset[camel] = strVal;
    }
  }

  getAttribute(name) {
    if (name === 'id' && this.id) return this.id;
    if (name === 'class' && this.className) return this.className;
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter((c) => c !== this);
      this.parentNode = null;
    }
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(handler);
  }

  dispatchEvent(event) {
    const handlers = this.listeners.get(event.type) || [];
    for (const fn of handlers) {
      fn.call(this, event);
    }
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this, preventDefault() {}, stopPropagation() {} });
  }

  focus() {}

  matchesSelector(selector) {
    const trimmed = selector.trim();
    if (trimmed.startsWith('#')) {
      return this.id === trimmed.slice(1);
    }
    if (trimmed.startsWith('.')) {
      const cls = trimmed.slice(1).split('[')[0];
      if (!this.classList.contains(cls)) return false;
      const attrMatch = trimmed.match(/\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]/);
      if (attrMatch) {
        const attrVal = this.getAttribute(attrMatch[1]);
        if (attrVal === null) return false;
        if (attrMatch[2] !== undefined && attrVal !== attrMatch[2]) return false;
      }
      return true;
    }
    return this.tagName.toLowerCase() === trimmed.toLowerCase();
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(',').map((s) => s.trim()).filter(Boolean);
    const results = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (selectors.some((sel) => child.matchesSelector(sel))) {
          results.push(child);
        }
        visit(child);
      }
    };
    visit(this);
    return results;
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (curr.matchesSelector && curr.matchesSelector(selector)) return curr;
      curr = curr.parentNode;
    }
    return null;
  }
}

/**
 * Helper to create a fetch response object compatible with both .json() and .text()
 */
function makeJsonResponse(status, payload) {
  const raw = JSON.stringify(payload);
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => payload,
    text: async () => raw
  };
}

/**
 * Builds a Mock Root Element populated with all IDs and tab/category buttons from src/code.html.
 */
function createMockDomFromCodeHtml() {
  const html = fs.readFileSync(path.join(ROOT_DIR, 'src', 'code.html'), 'utf8');
  const root = new MockElement('div');
  root.id = 'as-acars-root';

  const idMatches = html.matchAll(/id="([^"]+)"/g);
  for (const match of idMatches) {
    const id = match[1];
    if (id === 'as-acars-root') continue;
    const el = new MockElement('div', root);
    el.setAttribute('id', id);
    root.appendChild(el);
  }

  for (const tabName of ['vocc', 'docs', 'flight', 'settings']) {
    const btn = new MockElement('button', root);
    btn.setAttribute('class', 'as-acars-tab');
    btn.setAttribute('data-tab', tabName);
    root.appendChild(btn);
  }

  for (const catName of ['all', 'briefing', 'manuals', 'fdm', 'load']) {
    const btn = new MockElement('button', root);
    btn.setAttribute('class', 'as-acars-cat-btn');
    btn.setAttribute('data-cat', catName);
    root.appendChild(btn);
  }

  return root;
}

/**
 * Loads src/code.js inside a sandboxed VM with a mock Parallel 42 Flow $api context.
 */
function createFlowTestHarness(customFetch) {
  const datastoreMemory = new Map();
  const openedUrls = [];
  const copiedTexts = [];
  const draggableCalls = [];
  const hooks = {};

  const flowContext = {
    $api: {
      datastore: {
        get: (key) => datastoreMemory.get(key),
        set: (key, val) => datastoreMemory.set(key, val),
        import: (defaults = {}) => ({
          ...defaults,
          ...Object.fromEntries(datastoreMemory.entries())
        }),
        export: (obj) => {
          for (const [k, v] of Object.entries(obj)) datastoreMemory.set(k, v);
        }
      },
      variables: {
        get: (name) => {
          if (name === 'A:PLANE LATITUDE' || name === 'PLANE LATITUDE') return -23.4356;
          if (name === 'A:PLANE LONGITUDE' || name === 'PLANE LONGITUDE') return -46.4731;
          return 0;
        }
      },
      airports: {
        find_airports_by_coords: (_key, _lon, _lat, _radius, _max, onAdded) => {
          if (typeof onAdded === 'function') {
            onAdded([{ icao: 'SBGR', ident: 'SBGR', name: 'Guarulhos' }]);
          }
        },
        find_airports_by_icao: (icao) => [{ icao, ident: icao }]
      },
      command: {
        open_browser: (url) => openedUrls.push(url),
        copy_text: (txt) => copiedTexts.push(txt),
        script_message_send: () => {}
      },
      html: {
        set_draggable: (el, handle) => draggableCalls.push({ el, handle })
      }
    }
  };

  const registerHook = (name) => (arg1, arg2) => {
    if (typeof arg1 === 'function') {
      hooks[name] = arg1.bind(flowContext);
    } else if (typeof arg2 === 'function') {
      hooks[name] = arg2.bind(flowContext);
      hooks[`${name}_prefixes`] = arg1;
    } else {
      hooks[name] = arg1;
    }
  };

  const mockRoot = createMockDomFromCodeHtml();

  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    Promise,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    fetch: customFetch,
    __flowThisContext: flowContext,
    navigator: {
      clipboard: {
        writeText: async (txt) => copiedTexts.push(txt)
      }
    },
    window: {
      open: (url) => openedUrls.push(url)
    },
    document: {
      querySelector: (sel) => (sel === '#as-acars-root' ? mockRoot : mockRoot.querySelector(sel)),
      createElement: (tag) => new MockElement(tag, mockRoot)
    },
    run: registerHook('run'),
    state: registerHook('state'),
    style: registerHook('style'),
    info: registerHook('info'),
    exit: registerHook('exit'),
    settings_define: registerHook('settings_define'),
    loop_1hz: registerHook('loop_1hz'),
    search: registerHook('search'),
    html_created: registerHook('html_created'),
    scroll: registerHook('scroll'),
    script_message_rcv: registerHook('script_message_rcv')
  };
  sandbox.globalThis = sandbox;

  const codeJs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'code.js'), 'utf8');
  vm.createContext(sandbox);
  // Execute with `this` bound to flowContext (where this.$api lives, matching P42Flow.js)
  vm.runInContext(`(function () {\n${codeJs}\n}).call(__flowThisContext);`, sandbox, { filename: 'src/code.js' });

  const instance = sandbox.__AIRSPACE_ACARS_FLOW__;

  return {
    hooks,
    instance,
    mockRoot,
    datastoreMemory,
    openedUrls,
    copiedTexts,
    draggableCalls
  };
}

test('buildPackage() generates valid MSFS 2024 Community package structure, manifest.json, and layout.json', () => {
  const result = buildPackage({ version: 'v1.2.3' });

  assert.equal(result.version, '1.2.3');
  assert.ok(fs.existsSync(result.templateFilePath), 'Template JSON must exist');
  assert.ok(fs.existsSync(result.layoutFilePath), 'layout.json must exist');
  assert.ok(fs.existsSync(result.manifestFilePath), 'manifest.json must exist');

  const templateJson = JSON.parse(fs.readFileSync(result.templateFilePath, 'utf8'));
  assert.equal(templateJson.app_version, '2024.1.2.3');
  assert.equal(templateJson.scripts.length, 1);

  const scriptDef = templateJson.scripts[0];
  assert.equal(scriptDef.name, 'Airspace ACARS');
  assert.equal(scriptDef.params.package, 'p42-util-airspace-acars');
  assert.equal(scriptDef.params.can_otto, true);
  assert.ok(scriptDef.params.code_js.includes('settings_define'));
  assert.ok(scriptDef.params.code_html.includes('as-acars-root'));
  assert.ok(scriptDef.params.code_css.includes('.as-acars-window'));

  const layoutJson = JSON.parse(fs.readFileSync(result.layoutFilePath, 'utf8'));
  assert.equal(layoutJson.content.length, 3);
  for (const item of layoutJson.content) {
    const absFile = path.join(result.packageRoot, ...item.path.split('/'));
    assert.ok(fs.existsSync(absFile), `File listed in layout.json must exist: ${item.path}`);
    assert.equal(fs.statSync(absFile).size, item.size, `Size in layout.json must match disk for ${item.path}`);
    assert.ok(item.date > 130000000000000000, 'Date must be a valid Windows FILETIME integer');
  }

  const manifestJson = JSON.parse(fs.readFileSync(result.manifestFilePath, 'utf8'));
  assert.equal(manifestJson.package_version, '1.2.3');
  assert.equal(manifestJson.content_type, 'MISC');
  assert.equal(manifestJson.total_package_size.length, 20);

  // Restore default 1.0.0 build
  buildPackage();
});

test('normalizeVersion() and toWindowsFileTime() helpers work accurately', () => {
  assert.equal(normalizeVersion('v2.4.9-beta.1'), '2.4.9');
  assert.equal(normalizeVersion('1.0.0'), '1.0.0');
  assert.equal(normalizeVersion('invalid'), '1.0.0');

  const fileTime = toWindowsFileTime(1730415600000);
  assert.equal(typeof fileTime, 'number');
  assert.ok(fileTime > 133000000000000000);
});

test('Flow hooks register and Device Code OAuth connects to a Virtual Airline', async () => {
  let tokenPollCount = 0;

  const mockFetch = async (url) => {
    if (url === 'https://airspace.ferrlab.com/api/tenants') {
      return makeJsonResponse(200, {
        data: [
          {
            id: 'samba-va',
            name: 'Samba Virtual',
            domains: ['samba.airspace.ferrlab.com']
          }
        ]
      });
    }

    if (url === 'https://samba.airspace.ferrlab.com/api/v2/acars/auth/request') {
      return makeJsonResponse(200, {
        user_code: 'ABCD-1234',
        authorization_token: 'auth-tok-xyz',
        expires_in: 600,
        poll_interval: 5
      });
    }

    if (url === 'https://samba.airspace.ferrlab.com/api/v2/acars/auth/token') {
      tokenPollCount += 1;
      if (tokenPollCount === 1) {
        return makeJsonResponse(202, { status: 'pending' });
      }
      return makeJsonResponse(200, {
        access_token: 'live-bearer-token-999'
      });
    }

    if (url.endsWith('/api/v2/acars/pilot')) {
      return makeJsonResponse(200, {
        id: 77,
        callsign: 'SMB101',
        name: 'Cmte. Ailton',
        rank: { name: 'Comandante' }
      });
    }

    if (url.endsWith('/api/v2/acars/booking')) {
      return makeJsonResponse(200, {
        callsign: 'SMB2024',
        flight_number: 'SMB2024',
        departure_airport: { icao: 'SBGR' },
        arrival_airport: { icao: 'SBRJ' },
        alternate_airport: { icao: 'SBGL' },
        aircraft: { registration: 'PR-SMB', icao: 'B738' },
        route: 'PUMAL UZ14 BITAK'
      });
    }

    if (url.includes('/api/v2/acars/messages')) {
      return makeJsonResponse(200, {
        data: [
          {
            id: 101,
            sender_id: 900,
            sender_name: 'SBGR_APP',
            sender_role: 'occ',
            type: 'acars',
            message: 'DESCEND AND MAINTAIN FL100',
            read_at: null,
            sent_at: '2026-10-31T20:00:00Z'
          }
        ]
      });
    }

    if (url.includes('/api/v2/acars/notams')) {
      return makeJsonResponse(200, {
        data: [
          {
            id: 'notam-1',
            title: 'Pista 09R/27L em obras',
            content: '<p>Atencao para taxiways fechadas em SBGR.</p>',
            created_at: '2026-10-31T18:00:00Z'
          }
        ]
      });
    }

    if (url.includes('/api/v2/acars/documents')) {
      return makeJsonResponse(200, { data: [] });
    }

    return makeJsonResponse(404, {});
  };

  const { hooks, instance, mockRoot, datastoreMemory } = createFlowTestHarness(mockFetch);

  // Verify all core Flow hooks were registered
  for (const hookName of ['run', 'state', 'style', 'info', 'exit', 'loop_1hz', 'search', 'html_created']) {
    assert.equal(typeof hooks[hookName], 'function', `Hook ${hookName} should be registered`);
  }
  assert.equal(typeof hooks.settings_define, 'object', 'settings_define should be registered with config object');
  assert.ok(Array.isArray(hooks.search_prefixes), 'search prefixes should be registered');

  // Initialize DOM via html_created
  hooks.html_created(mockRoot);
  await new Promise((r) => setTimeout(r, 30));

  assert.equal(instance.state.tenants.length, 1);
  assert.equal(instance.state.tenants[0].name, 'Samba Virtual');

  // Start Device Code OAuth for the loaded tenant
  const sambaTenant = instance.state.tenants[0];
  await instance.startDeviceCodeAuth(sambaTenant);
  instance.stopAuthPolling(); // Control polling manually in test

  assert.equal(instance.state.deviceCode, 'ABCD-1234');
  assert.equal(instance.state.authToken, 'auth-tok-xyz');
  assert.equal(mockRoot.querySelector('#as-acars-device-code').textContent, 'ABCD-1234');

  // First poll -> 202 pending
  await instance.pollDeviceTokenOnce();
  instance.stopAuthPolling();
  assert.equal(instance.getActiveToken(), null);

  // Second poll -> 200 access_token
  await instance.pollDeviceTokenOnce();
  instance.stopAuthPolling();
  await new Promise((r) => setTimeout(r, 30));

  assert.equal(instance.getActiveToken(), 'live-bearer-token-999');

  // Verify token persisted in Flow datastore
  const storedTokens = datastoreMemory.get('storedTokens');
  assert.equal(storedTokens['samba-va'].token, 'live-bearer-token-999');

  // Verify booking, pilot, NOTAMs and unread vOCC message state
  assert.equal(instance.state.pilot.callsign, 'SMB101');
  assert.equal(instance.state.booking.flight_number, 'SMB2024');
  assert.equal(instance.getUnreadMessages().length, 1);
  assert.equal(hooks.style(), 'armed', 'Wheel style should be armed when unread vOCC message exists');
  assert.ok(hooks.state().includes('vOCC (1)'), 'Wheel badge should display unread count');
});

test('vOCC message sending, confirming read, and background toast alert work properly', async () => {
  const confirmedBodies = [];
  const sentBodies = [];

  const mockFetch = async (url, options = {}) => {
    if (url.endsWith('/api/v2/acars/message/confirm') && options.method === 'PUT') {
      confirmedBodies.push(JSON.parse(options.body));
      return makeJsonResponse(200, { status: 'ok' });
    }
    if (url.endsWith('/api/v2/acars/message') && options.method === 'POST') {
      const parsed = JSON.parse(options.body);
      sentBodies.push(parsed);
      return makeJsonResponse(200, {
        data: {
          id: 202,
          sender_id: 77,
          sender_name: 'SMB101',
          sender_role: 'user',
          type: 'chat',
          message: parsed.message,
          sent_at: '2026-10-31T20:06:00Z',
          read_at: '2026-10-31T20:06:00Z'
        }
      });
    }
    if (url.includes('/api/v2/acars/messages')) {
      return makeJsonResponse(200, {
        data: [
          {
            id: 142,
            sender_id: 900,
            sender_name: 'VOCC_OPS',
            sender_role: 'occ',
            type: 'acars',
            message: 'PORTAO ALTERADO PARA B14',
            read_at: confirmedBodies.length > 0 ? '2026-10-31T20:05:00Z' : null,
            sent_at: '2026-10-31T20:04:00Z'
          }
        ]
      });
    }
    return makeJsonResponse(200, { data: [] });
  };

  const { hooks, instance, mockRoot } = createFlowTestHarness(mockFetch);

  // Pre-seed authenticated session with panel closed
  instance.store.activeTenant = {
    id: 'samba',
    name: 'Samba Virtual',
    domain: 'samba.airspace.ferrlab.com'
  };
  instance.store.storedTokens = {
    samba: {
      token: 'tok-123',
      tenant: instance.store.activeTenant
    }
  };
  instance.state.panelOpen = false;
  hooks.html_created(mockRoot);
  await new Promise((r) => setTimeout(r, 30));

  // Since panelOpen is false and a new unconfirmed vOCC message arrived, toast must be shown
  assert.ok(instance.state.toastMessage);
  assert.equal(instance.state.toastMessage.id, 142);
  assert.equal(
    mockRoot.querySelector('#as-acars-toast').classList.contains('as-acars-hidden'),
    false
  );

  // Confirm message read
  await instance.confirmMessageById(142);
  assert.equal(confirmedBodies.length, 1);
  assert.deepEqual(confirmedBodies[0], { message_id: 142 });
  assert.equal(instance.getUnreadMessages().length, 0);

  // Send a vOCC reply
  const ok = await instance.sendChatMessage('WILCO GATE B14');
  assert.equal(ok, true);
  assert.equal(sentBodies.length, 1);
  assert.deepEqual(sentBodies[0], {
    message: 'WILCO GATE B14'
  });

  // Verify chat list automatically scrolled to the bottom message
  const chatList = mockRoot.querySelector('#as-acars-chat-list');
  assert.equal(chatList.scrollTop, chatList.scrollHeight, 'Chat must auto-scroll to bottom after message send/receive');

  // Verify chat bubble styling and classes match official Airspace ACARS
  assert.ok(chatList.innerHTML.includes('as-acars-msg-bubble-acars'), 'Must render acars message bubble');
  assert.ok(chatList.innerHTML.includes('as-acars-msg-bubble-user'), 'Must render user message bubble');
  assert.ok(!chatList.innerHTML.includes('[Lida]'), 'User bubble must not have [Lida] suffix');

  const css = fs.readFileSync(path.join(ROOT_DIR, 'src', 'code.css'), 'utf8');
  assert.ok(!css.includes('.as-acars-msg-bubble-user {\n  background: #fc1a02;'), 'Must not have red background on user bubbles');
  assert.ok(!css.includes('.as-acars-msg-bubble-acars {\n  background: rgba(252, 26, 2'), 'Must not have red background on acars bubbles');
  assert.ok(css.includes('.as-acars-white-mode .as-acars-msg-bubble-user'), 'Must support user bubbles in White Mode');
  assert.ok(css.includes('.as-acars-white-mode .as-acars-msg-bubble-acars'), 'Must support acars bubbles in White Mode');
});

test('Airport & Documents search, HTML sanitizer, nearest MSFS airport, and Otto search bar work accurately', async () => {
  const mockDocs = [
    {
      id: 'doc-sbgr-1',
      title: 'SBGR — Briefing Operacional Guarulhos',
      source: 'SBGR',
      source_type: 'airport',
      type: 'html',
      updated_at: '2026-10-30T10:00:00Z',
      content:
        '<h2>Procedimentos SBGR</h2><script>alert("xss")</script><p onclick="evil()" class="fixed inset-0 z-50 safe-cls">Use pista preferencial 09L/09R.</p><a href="javascript:evil()">Link Ruim</a>'
    },
    {
      id: 'doc-manual-1',
      title: 'MGO — Manual Geral de Operacoes',
      source: 'Operacoes',
      source_type: 'document',
      type: 'html',
      updated_at: '2026-10-20T10:00:00Z',
      content: '<p>Capitulo 1: Padronizacao de Cabine.</p>'
    }
  ];

  const mockFetch = async (url) => {
    if (url.endsWith('/api/v2/acars/documents/doc-sbgr-1')) {
      return makeJsonResponse(200, { data: mockDocs[0] });
    }
    if (url.includes('/api/v2/acars/documents')) {
      return makeJsonResponse(200, { data: mockDocs });
    }
    return makeJsonResponse(200, { data: [] });
  };

  const { hooks, instance, mockRoot } = createFlowTestHarness(mockFetch);

  instance.store.activeTenant = {
    id: 'samba',
    name: 'Samba Virtual',
    domain: 'samba.airspace.ferrlab.com'
  };
  instance.store.storedTokens = {
    samba: {
      token: 'tok-123',
      tenant: instance.store.activeTenant
    }
  };
  instance.state.booking = {
    callsign: 'SMB100',
    flight_number: 'SMB100',
    departure_airport: { icao: 'SBGR' },
    arrival_airport: { icao: 'SBRJ' }
  };

  hooks.html_created(mockRoot);
  await new Promise((r) => setTimeout(r, 30));

  assert.equal(instance.state.documents.length, 2);

  // Filter by airport briefing category + "SBGR"
  instance.state.docCategory = 'briefing';
  instance.state.docSearch = 'SBGR';
  const filtered = instance.getFilteredDocuments();
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'doc-sbgr-1');

  // Open document and check HTML sanitization
  await instance.selectDocument('doc-sbgr-1');
  const readerHtml = mockRoot.querySelector('#as-acars-doc-body').innerHTML;
  assert.ok(readerHtml.includes('Procedimentos SBGR'), 'Safe heading should remain');
  assert.ok(!readerHtml.includes('<script'), 'Script tags must be stripped');
  assert.ok(!readerHtml.includes('onclick='), 'Inline event handlers must be stripped');
  assert.ok(!readerHtml.includes('javascript:'), 'javascript: URLs must be neutralized');
  assert.ok(!readerHtml.includes('fixed'), 'Overlay positioning classes must be stripped');
  assert.ok(readerHtml.includes('safe-cls'), 'Safe CSS classes must remain');

  // Lookup nearest MSFS 2024 airport
  instance.state.docSearch = '';
  instance.findNearestSimAirportAndSearch();
  assert.equal(instance.state.docSearch, 'SBGR');

  // Test Otto search bar integration
  let ottoResults = [];
  hooks.search('doc SBGR', (res) => {
    ottoResults = res;
  });
  assert.ok(ottoResults.length >= 1, 'Otto search for "doc SBGR" should return matching document');
  assert.ok(ottoResults.some((r) => r.uid === 'airspace_doc_doc-sbgr-1'));

  // Execute Otto callback action
  ottoResults[0].execute();
  assert.equal(instance.state.panelOpen, true);
  assert.equal(instance.state.activeTab, 'docs');
});

test('Automatic 401 Unauthorized response clears expired VA token and returns to tenant selector', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/api/v2/acars/messages')) {
      return makeJsonResponse(401, { message: 'Unauthenticated.' });
    }
    return makeJsonResponse(200, { data: [] });
  };

  const { hooks, instance, mockRoot, datastoreMemory } = createFlowTestHarness(mockFetch);

  instance.store.activeTenant = {
    id: 'samba',
    name: 'Samba Virtual',
    domain: 'samba.airspace.ferrlab.com'
  };
  instance.store.storedTokens = {
    samba: {
      token: 'expired-tok-000',
      tenant: instance.store.activeTenant
    }
  };
  instance.saveStore();

  hooks.html_created(mockRoot);
  await instance.fetchMessages();

  assert.equal(instance.getActiveToken(), null);
  assert.equal(instance.store.activeTenant, null);
  assert.equal(instance.state.activeView, 'tenants');
  assert.equal(datastoreMemory.get('activeTenant'), null);
});

test('Coherent GT compatibility: ASCII-escaped coui:// template JSON, findClosest fallback, and Coherent input focus bridge', async () => {
  const result = buildPackage();
  const rawTemplateContent = fs.readFileSync(result.templateFilePath, 'utf8');

  // Ensure no raw non-ASCII bytes exist in the template file or source files so coui://, FlowShare, and MSFS clipboard never corrupt accents
  assert.equal(/[\u0080-\uffff]/.test(rawTemplateContent), false, 'Template JSON must be 100% ASCII-safe on disk');
  for (const rel of ['src/code.js', 'src/code.html', 'src/code.css']) {
    const content = fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8');
    assert.equal(/[\u0080-\uffff]/.test(content), false, `${rel} must be 100% 7-bit ASCII on disk`);
  }

  // Ensure HTML entities are present in code_html and deserialized strings remain 100% ASCII for FlowShare.exe
  const parsed = JSON.parse(rawTemplateContent);
  assert.equal(/[\u0080-\uffff]/.test(parsed.scripts[0].params.code_js), false, 'Deserialized code_js must be 100% ASCII for FlowShare');
  assert.equal(/[\u0080-\uffff]/.test(parsed.scripts[0].params.code_html), false, 'Deserialized code_html must be 100% ASCII for FlowShare');
  assert.equal(/[\u0080-\uffff]/.test(parsed.scripts[0].params.code_css), false, 'Deserialized code_css must be 100% ASCII for FlowShare');
  assert.ok(parsed.scripts[0].params.code_html.includes('Selecione sua Companhia Aerea'));
  assert.ok(parsed.scripts[0].params.code_html.includes('Abrir Pagina de Autorizacao'));
  assert.ok(
    parsed.scripts[0].params.code_html.includes('<div class="as-acars-brand" data-dragarea="airspace_acars_panel">'),
    'data-dragarea must be on .as-acars-brand so header action buttons stay clickable outside [data-dragarea]'
  );
  assert.equal(
    /^\s*box-shadow\s*:\s*(?!none\b)\S+/m.test(parsed.scripts[0].params.code_css),
    false,
    'code_css must not use active box-shadow to avoid Coherent GT 9-slice shadow blur artifacts'
  );

  // Test findClosest fallback when native .closest is absent (Chrome 49 / Coherent GT)
  const { instance, mockRoot, hooks, openedUrls, copiedTexts } = createFlowTestHarness(async () =>
    makeJsonResponse(200, {
      user_code: '385658',
      authorization_token: 'tok-abc',
      poll_interval: 5
    })
  );
  hooks.html_created(mockRoot);

  // Verify clicking #as-acars-btn-open-auth opens external browser with /acars/authorize?code=385658 and copies code
  await instance.startDeviceCodeAuth({
    id: 'voe-samba',
    name: 'Voe Samba',
    domain: 'samba.airspace.ferrlab.com'
  });
  instance.stopAuthPolling();

  const openAuthBtn = mockRoot.querySelector('#as-acars-btn-open-auth');
  mockRoot.dispatchEvent({ type: 'click', target: openAuthBtn, preventDefault() {}, stopPropagation() {} });

  assert.equal(openedUrls.length, 1, 'Clicking red authorize button must call this.$api.command.open_browser');
  assert.equal(openedUrls[0], 'https://samba.airspace.ferrlab.com/acars/authorize?code=385658');
  assert.ok(copiedTexts.includes('385658'), 'Device code should also be copied to clipboard');

  const parentItem = new MockElement('div', mockRoot);
  parentItem.setAttribute('class', 'as-acars-tenant-item');
  parentItem.setAttribute('data-tenant-id', 'voe-samba');
  delete parentItem.closest;

  const childSpan = new MockElement('div', mockRoot);
  childSpan.setAttribute('class', 'as-acars-tenant-name');
  delete childSpan.closest;
  parentItem.appendChild(childSpan);

  const textNodeTarget = { nodeType: 3, parentNode: childSpan };
  const found = instance.findClosest(textNodeTarget, '.as-acars-tenant-item');
  assert.equal(found, parentItem, 'findClosest must traverse from text/child nodes without native .closest');
});

test('Language removed from Flow wheel settings, defaults to English, and can be switched inside Settings tab with White Mode', () => {
  const { hooks, instance, mockRoot } = createFlowTestHarness();
  assert.equal(typeof hooks.settings_define, 'object');
  assert.equal(hooks.settings_define.language, undefined, 'Language must be removed from Flow wheel settings');
  assert.equal(instance.store.language, 'en', 'Default language must be English');

  assert.ok(hooks.settings_define.toast_duration);
  assert.equal(hooks.settings_define.toast_duration.type, 'text');
  assert.equal(hooks.settings_define.toast_duration.value, '15');

  // Test changing toast_duration through settings
  hooks.settings_define.toast_duration.changed('30');
  assert.equal(instance.store.toast_duration, 30);

  // Mount DOM and test Settings tab language change
  hooks.html_created(mockRoot);

  const ptChoiceBtn = new MockElement('button', mockRoot);
  ptChoiceBtn.setAttribute('class', 'as-acars-btn as-acars-lang-choice');
  ptChoiceBtn.setAttribute('data-lang', 'pt-br');
  mockRoot.appendChild(ptChoiceBtn);

  mockRoot.dispatchEvent({ type: 'click', target: ptChoiceBtn, preventDefault() {}, stopPropagation() {} });
  assert.equal(instance.store.language, 'pt-br', 'Clicking language choice inside settings tab must update store.language');

  // Test White Mode toggle
  const whiteThemeBtn = new MockElement('button', mockRoot);
  whiteThemeBtn.setAttribute('class', 'as-acars-btn as-acars-theme-choice');
  whiteThemeBtn.setAttribute('data-theme', 'white');
  mockRoot.appendChild(whiteThemeBtn);

  mockRoot.dispatchEvent({ type: 'click', target: whiteThemeBtn, preventDefault() {}, stopPropagation() {} });
  assert.equal(instance.store.white_mode, true, 'Clicking White Mode choice must update store.white_mode to true');
  assert.ok(mockRoot.classList.contains('as-acars-white-mode'), 'Root element must have .as-acars-white-mode class');
  const toastEl = mockRoot.querySelector('#as-acars-toast');
  assert.ok(toastEl.classList.contains('as-acars-white-mode'), 'Toast element must have .as-acars-white-mode class in White Mode');

  // Test White Mode custom switch toggle
  const whiteSwitch = mockRoot.querySelector('#as-acars-switch-white');
  if (whiteSwitch) {
    instance.store.white_mode = false;
    mockRoot.dispatchEvent({ type: 'click', target: whiteSwitch, preventDefault() {}, stopPropagation() {} });
    assert.equal(instance.store.white_mode, true, 'Clicking #as-acars-switch-white must toggle store.white_mode to true');
    mockRoot.dispatchEvent({ type: 'click', target: whiteSwitch, preventDefault() {}, stopPropagation() {} });
    assert.equal(instance.store.white_mode, false, 'Clicking #as-acars-switch-white again must toggle store.white_mode to false');
  }

  // Test Toast Alerts custom switch toggle
  const toastSwitch = mockRoot.querySelector('#as-acars-switch-toast');
  if (toastSwitch) {
    instance.store.vocc_toast_enabled = true;
    mockRoot.dispatchEvent({ type: 'click', target: toastSwitch, preventDefault() {}, stopPropagation() {} });
    assert.equal(instance.store.vocc_toast_enabled, false, 'Clicking #as-acars-switch-toast must toggle store.vocc_toast_enabled to false');
    mockRoot.dispatchEvent({ type: 'click', target: toastSwitch, preventDefault() {}, stopPropagation() {} });
    assert.equal(instance.store.vocc_toast_enabled, true, 'Clicking #as-acars-switch-toast again must toggle store.vocc_toast_enabled to true');
  }
});

test('Toast auto-dismiss timer closes floating vOCC alert after configured duration', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/api/v2/acars/messages')) {
      return makeJsonResponse(200, {
        data: [
          {
            id: 999,
            sender: { id: 99, name: 'vOCC Dispatch', role: 'dispatch' },
            message: 'HELLO vOCC DISPATCH',
            read_at: null,
            sent_at: new Date().toISOString()
          }
        ]
      });
    }
    return makeJsonResponse(200, { data: [] });
  };

  const { hooks, instance, mockRoot } = createFlowTestHarness(mockFetch);
  instance.store.activeTenant = { id: 'samba', name: 'Samba Virtual', domain: 'samba.airspace.ferrlab.com' };
  instance.store.storedTokens = { samba: { token: 'tok-123', tenant: instance.store.activeTenant } };
  instance.store.toast_duration = 1; // 1 second timeout
  instance.state.panelOpen = false;

  hooks.html_created(mockRoot);
  await new Promise((r) => setTimeout(r, 40));

  assert.ok(instance.state.toastMessage, 'Toast message should be populated');
  const toastEl = mockRoot.querySelector('#as-acars-toast');
  assert.equal(toastEl.classList.contains('as-acars-hidden'), false);

  // Wait for 1.1s for auto-dismiss timer to fire
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal(instance.state.toastMessage, null);
  assert.equal(toastEl.classList.contains('as-acars-hidden'), true);
});

test('Toast close button and dismiss link immediately dismiss the toast notification', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/api/v2/acars/messages')) {
      return makeJsonResponse(200, {
        data: [
          {
            id: 888,
            sender: { id: 88, name: 'vOCC OCC', role: 'occ' },
            message: 'TEST DISMISS BUTTON',
            read_at: null,
            sent_at: new Date().toISOString()
          }
        ]
      });
    }
    return makeJsonResponse(200, { data: [] });
  };

  const { hooks, instance, mockRoot } = createFlowTestHarness(mockFetch);
  instance.store.activeTenant = { id: 'samba', name: 'Samba Virtual', domain: 'samba.airspace.ferrlab.com' };
  instance.store.storedTokens = { samba: { token: 'tok-123', tenant: instance.store.activeTenant } };
  instance.store.toast_duration = 30; // 30s timeout so it does not auto-close
  instance.state.panelOpen = false;

  hooks.html_created(mockRoot);
  await new Promise((r) => setTimeout(r, 40));

  assert.ok(instance.state.toastMessage, 'Toast message should be shown');
  const toastEl = mockRoot.querySelector('#as-acars-toast');
  assert.equal(toastEl.classList.contains('as-acars-hidden'), false);

  const closeBtn = mockRoot.querySelector('#as-acars-toast-close');
  assert.ok(closeBtn, '#as-acars-toast-close must exist');
  closeBtn.dispatchEvent({ type: 'click', target: closeBtn, preventDefault() {}, stopPropagation() {} });

  assert.equal(instance.state.toastMessage, null, 'Toast message should be cleared after clicking X');
  assert.equal(toastEl.classList.contains('as-acars-hidden'), true, 'Toast element should be hidden after clicking X');
});

test('CSS neutralizes colors, constrains service logos, and HTML excludes quick replies', () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, 'src', 'code.css'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT_DIR, 'src', 'code.html'), 'utf8');

  // Service logo constraint in Documents
  assert.ok(
    css.includes('.as-acars-doc-html table img') || css.includes('.as-acars-doc-html td img'),
    'Must constrain service logos inside tables'
  );
  assert.ok(
    css.includes('max-height: 38px') || css.includes('max-height: 40px'),
    'Must limit max-height of service logos'
  );

  // Quick replies removed
  assert.equal(html.includes('as-acars-quick-replies'), false, 'Quick replies bar must be removed from HTML');

  // Switches present in HTML
  assert.ok(html.includes('id="as-acars-switch-white"'), 'Must have switch for White Mode');
  assert.ok(html.includes('id="as-acars-switch-toast"'), 'Must have switch for vOCC Toast Alerts');
  assert.ok(html.includes('id="as-acars-update-banner"'), 'Must have update banner in HTML');
});

test('GitHub release update checker detects newer releases, renders banner, and handles download/dismiss', async () => {
  const mockFetch = async (url) => {
    if (url.includes('api.github.com/repos') && url.includes('releases/latest')) {
      return makeJsonResponse(200, {
        tag_name: 'v2.0.0',
        name: 'Release v2.0.0',
        html_url: 'https://github.com/GordelaG/p42-util-airspace-acars/releases/tag/v2.0.0',
        body: 'Release notes v2.0.0'
      });
    }
    return makeJsonResponse(200, { data: [] });
  };

  const { hooks, instance, mockRoot, openedUrls } = createFlowTestHarness(mockFetch);
  hooks.html_created(mockRoot);

  // Trigger check manually via button click
  const checkBtn = mockRoot.querySelector('#as-acars-btn-check-updates');
  assert.ok(checkBtn, 'Check updates button must exist in settings');
  mockRoot.dispatchEvent({ type: 'click', target: checkBtn, preventDefault() {}, stopPropagation() {} });

  await new Promise((r) => setTimeout(r, 60));

  assert.ok(instance.state.updateInfo, 'updateInfo must be populated');
  assert.equal(instance.state.updateInfo.version, 'v2.0.0');
  assert.equal(instance.state.updateInfo.isNewer, true);

  const banner = mockRoot.querySelector('#as-acars-update-banner');
  assert.ok(banner, 'Update banner must exist');
  assert.equal(banner.classList.contains('as-acars-hidden'), false, 'Update banner must be visible');

  const newVerEl = mockRoot.querySelector('#as-acars-update-new-version');
  assert.equal(newVerEl.textContent, 'v2.0.0');

  // Test Download button in banner
  const downloadBtn = mockRoot.querySelector('#as-acars-btn-update-download');
  assert.ok(downloadBtn, 'Download button must exist in banner');
  mockRoot.dispatchEvent({ type: 'click', target: downloadBtn, preventDefault() {}, stopPropagation() {} });
  assert.equal(openedUrls.length, 1);
  assert.equal(openedUrls[0], 'https://github.com/GordelaG/p42-util-airspace-acars/releases/tag/v2.0.0');

  // Test Dismiss button in banner
  const dismissBtn = mockRoot.querySelector('#as-acars-btn-update-dismiss');
  assert.ok(dismissBtn, 'Dismiss button must exist in banner');
  mockRoot.dispatchEvent({ type: 'click', target: dismissBtn, preventDefault() {}, stopPropagation() {} });
  assert.equal(instance.state.updateBannerDismissed, true);
  assert.equal(banner.classList.contains('as-acars-hidden'), true, 'Banner must be hidden after dismiss');
});





