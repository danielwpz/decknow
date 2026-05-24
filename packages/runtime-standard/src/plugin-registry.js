const PLUGIN_NAME_PATTERN = /^[a-z0-9][a-z0-9-:.]*$/;

export function createPluginRegistry(environment = {}) {
  const env = resolveEnvironment(environment);
  const plugins = new Map();
  const elementOwners = new Map();
  const selectableSelectors = new Set();
  const themeOwners = new Map();

  function registerPlugin(plugin) {
    const record = normalizePlugin(plugin);
    assertCanRegister(record);

    for (const [name, klass] of Object.entries(record.elements)) {
      registerElement(name, klass, record.name);
    }

    for (const selector of record.selectable) {
      selectableSelectors.add(selector);
    }

    for (const theme of record.themes) {
      if (themeOwners.has(theme)) {
        throw new Error(
          `Decknow theme "${theme}" is already provided by plugin "${themeOwners.get(theme)}".`
        );
      }
      themeOwners.set(theme, record.name);
    }

    const styleIds = injectPluginStyles(record);
    record.styleIds = styleIds;
    plugins.set(record.name, record);
    return pluginSummary(record);
  }

  function assertCanRegister(record) {
    if (plugins.has(record.name)) {
      throw new Error(`Decknow plugin "${record.name}" is already registered.`);
    }

    for (const [name, klass] of Object.entries(record.elements)) {
      if (!name.includes("-")) {
        throw new Error(
          `Custom element "${name}" from plugin "${record.name}" must include a hyphen.`
        );
      }
      if (typeof klass !== "function") {
        throw new Error(
          `Custom element "${name}" from plugin "${record.name}" must be a constructor.`
        );
      }
      if (elementOwners.has(name)) {
        throw new Error(
          `Custom element "${name}" is already registered by plugin "${elementOwners.get(name)}".`
        );
      }
      if (env.customElements?.get(name)) {
        throw new Error(`Custom element "${name}" is already defined outside Decknow plugins.`);
      }
    }

    for (const theme of record.themes) {
      if (themeOwners.has(theme)) {
        throw new Error(
          `Decknow theme "${theme}" is already provided by plugin "${themeOwners.get(theme)}".`
        );
      }
    }
  }

  function registerElement(name, klass, pluginName) {
    env.customElements?.define(name, klass);
    elementOwners.set(name, pluginName);
  }

  function injectPluginStyles(record) {
    if (!record.styles.length || !env.document) return [];
    const ids = [];
    const host = env.document.head || env.document.documentElement;
    for (const styleEntry of record.styles) {
      const id = pluginStyleId(record.name, styleEntry.id);
      ids.push(id);
      if (env.document.getElementById(id)) continue;
      const style = env.document.createElement("style");
      style.id = id;
      style.dataset.dkPlugin = record.name;
      style.textContent = styleEntry.css;
      host.appendChild(style);
    }
    return ids;
  }

  function getPlugin(name) {
    const record = plugins.get(name);
    return record ? pluginSummary(record) : null;
  }

  function getPlugins() {
    return Array.from(plugins.values(), pluginSummary);
  }

  function getSelectableSelectors() {
    return Array.from(selectableSelectors);
  }

  function getElementNames() {
    return Array.from(elementOwners.keys());
  }

  function getThemeNames() {
    return Array.from(themeOwners.keys());
  }

  function getManifest() {
    return {
      plugins: getPlugins(),
      elements: getElementNames(),
      selectable: getSelectableSelectors(),
      themes: getThemeNames(),
    };
  }

  return {
    registerPlugin,
    getPlugin,
    getPlugins,
    getSelectableSelectors,
    getElementNames,
    getThemeNames,
    getManifest,
  };
}

export function normalizePlugin(plugin) {
  if (!plugin || typeof plugin !== "object") {
    throw new Error("Decknow plugin must be an object.");
  }
  if (!plugin.name || typeof plugin.name !== "string") {
    throw new Error("Decknow plugin requires a string name.");
  }
  if (!PLUGIN_NAME_PATTERN.test(plugin.name)) {
    throw new Error(
      `Decknow plugin name "${plugin.name}" must use lowercase letters, numbers, hyphens, colons, or dots.`
    );
  }

  const elements = normalizeElements(plugin.elements);
  return {
    name: plugin.name,
    version: plugin.version || "0.0.0",
    kind: plugin.kind || "component",
    elements,
    selectable: normalizeStringList(plugin.selectable, Object.keys(elements)),
    themes: normalizeStringList(plugin.themes, []),
    styles: normalizeStyles(plugin.styles),
    schema: plugin.schema || null,
    meta: plugin.meta || {},
  };
}

function normalizeElements(elements = {}) {
  if (Array.isArray(elements)) {
    return Object.fromEntries(elements);
  }
  if (!elements || typeof elements !== "object") return {};
  return { ...elements };
}

function normalizeStyles(styles) {
  if (!styles) return [];
  const entries = Array.isArray(styles) ? styles : [styles];
  return entries
    .map((entry, index) => {
      if (typeof entry === "string")
        return { id: index === 0 ? "default" : String(index), css: entry };
      if (!entry || typeof entry !== "object") return null;
      return {
        id: entry.id || (index === 0 ? "default" : String(index)),
        css: String(entry.css || ""),
      };
    })
    .filter((entry) => entry?.css);
}

function normalizeStringList(value, fallback) {
  if (value === undefined || value === null) return [...fallback];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "object") return Object.keys(value);
  return [String(value)].filter(Boolean);
}

function pluginSummary(record) {
  return {
    name: record.name,
    version: record.version,
    kind: record.kind,
    elements: Object.keys(record.elements),
    selectable: [...record.selectable],
    themes: [...record.themes],
    styleIds: [...(record.styleIds || [])],
    schema: record.schema,
    meta: record.meta,
  };
}

function pluginStyleId(pluginName, styleId) {
  return `decknow-plugin-${safeId(pluginName)}-${safeId(styleId || "default")}-styles`;
}

function safeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function resolveEnvironment(environment) {
  return {
    document: environment.document || globalThis.document,
    customElements: environment.customElements || globalThis.customElements,
  };
}
