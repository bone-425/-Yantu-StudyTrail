// 冒烟测试：最小 DOM 跑 app.js
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const APP_PATH = fileURLToPath(new URL("../app.js", import.meta.url));
const APP_CODE = fs.readFileSync(APP_PATH, "utf8");
const LEGACY_IDS = new Set([
  "mainQuoteAuthor",
  "pieDate",
  "piePrevDay",
  "pieNextDay",
  "pieChart",
  "pieTotal",
  "pieCompare",
  "pieLegend",
  "presetChips",
  "timerToggle",
]);

function createScenario({ legacyHtml = false, fakeDate = false } = {}) {
  const store = new Map();
  const listeners = new Map();
  let fakeNow = Date.now();
  const DateClass = fakeDate
    ? class extends Date {
        constructor(...args) {
          if (args.length === 0) super(fakeNow);
          else super(...args);
        }
        static now() {
          return fakeNow;
        }
      }
    : Date;

  function makeClassList() {
    const set = new Set();
    return {
      add: (...names) => names.forEach((name) => set.add(name)),
      remove: (...names) => names.forEach((name) => set.delete(name)),
      contains: (name) => set.has(name),
      toggle() {},
    };
  }

  function makeElement(id = "") {
    return {
      id,
      value: "",
      textContent: "",
      innerHTML: "",
      className: "",
      type: "",
      style: {},
      dataset: {},
      children: [],
      firstElementChild: null,
      classList: makeClassList(),
      addEventListener(type, fn) {
        if (!listeners.has(id)) listeners.set(id, {});
        if (!listeners.get(id)[type]) listeners.get(id)[type] = [];
        listeners.get(id)[type].push(fn);
      },
      removeEventListener() {},
      appendChild(child) {
        this.children.push(child);
        if (!this.firstElementChild) this.firstElementChild = child;
        return child;
      },
      append(...kids) {
        kids.forEach((kid) => this.appendChild(kid));
      },
      replaceChildren(...kids) {
        this.children = kids;
        this.firstElementChild = kids[0] || null;
      },
      remove() {},
      setAttribute() {},
      getAttribute() {
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      closest() {
        return null;
      },
      focus() {},
      select() {},
      requestSubmit() {
        this.dispatch("submit", {});
      },
      dispatch(type, event = {}) {
        (listeners.get(id)?.[type] || []).forEach((fn) =>
          fn({ preventDefault() {}, target: this, ...event })
        );
      },
    };
  }

  const elements = new Map();
  function getElement(id) {
    if (legacyHtml && LEGACY_IDS.has(id)) return null;
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  }

  const document = {
    getElementById: getElement,
    createElement: (tag) => makeElement(`created-${tag}`),
    createElementNS: (ns, tag) => makeElement(`svg-${tag}`),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener() {},
    body: { style: {} },
    execCommand: () => true,
  };

  const localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };

  const context = {
    document,
    localStorage,
    console,
    window: {
      crypto: { randomUUID: () => "test-uuid-0001" },
      confirm: () => true,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      matchMedia: () => ({ matches: false }),
    },
    navigator: { clipboard: { writeText: async () => {} } },
    Intl,
    Date: DateClass,
    Math,
    JSON,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    Promise,
    fetch: async () => {
      throw new Error("test: no network");
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    confirm: () => true,
    alert: () => {},
  };
  context.globalThis = context;
  context.self = context;
  context.window.document = document;

  vm.createContext(context);
  vm.runInContext(APP_CODE, context, { filename: "app.js" });

  return {
    store,
    getElement,
    advance(ms) {
      fakeNow += ms;
    },
  };
}

function check(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    return;
  }
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

// 正常页面
const normal = createScenario();
normal.getElement("focusInput").value = "英语阅读两篇";
normal.getElement("minutesInput").value = "45";
normal.getElement("moodInput").value = "4";
normal.getElement("checkinForm").dispatch("submit", {});

const savedRaw = normal.store.get("yantu-checkins-v1");
const saved = savedRaw ? JSON.parse(savedRaw) : {};
const savedDays = Object.keys(saved);
check(savedDays.length > 0 && saved[savedDays[0]].length > 0, "打卡已写入 localStorage");
check(normal.getElement("todayEntrySummary").textContent.includes("1 项"), "今日摘要立即更新");
check(normal.getElement("todayEntryCount").textContent === "1 项", "今日条数立即更新");
check(normal.getElement("pieTotal").textContent.includes("共 45 分钟"), "扇形图立即更新");
check(normal.getElement("presetChips").children.length >= 4, "默认项目已加载");

// 计时器：开始后再结束，不应报错
normal.getElement("focusInput").value = "英语单词";
normal.getElement("timerToggle").dispatch("click", {});
check(normal.getElement("timerToggle").textContent === "结束并记录", "计时已开始");
check(!normal.getElement("focusOverlay").classList.contains("hidden"), "计时开始进入沉浸界面");
normal.getElement("timerToggle").dispatch("click", {});
check(normal.getElement("toast").textContent.includes("不到半分钟"), "计时结束会提示时长不足");
check(normal.getElement("focusOverlay").classList.contains("hidden"), "结束后退出沉浸界面");

// 取整：90 秒记 2 分钟
const timing = createScenario({ fakeDate: true });
timing.getElement("focusInput").value = "英语单词";
timing.getElement("timerToggle").dispatch("click", {});
timing.advance(90 * 1000);
timing.getElement("timerToggle").dispatch("click", {});
const timingSaved = JSON.parse(timing.store.get("yantu-checkins-v1"));
const timingDay = Object.keys(timingSaved)[0];
check(timingSaved[timingDay][0].minutes === 2, "90 秒记 2 分钟");

// 取整：50 秒记 1 分钟
const timing2 = createScenario({ fakeDate: true });
timing2.getElement("focusInput").value = "英语单词";
timing2.getElement("timerToggle").dispatch("click", {});
timing2.advance(50 * 1000);
timing2.getElement("timerToggle").dispatch("click", {});
const saved2 = JSON.parse(timing2.store.get("yantu-checkins-v1"));
const day2 = Object.keys(saved2)[0];
check(saved2[day2][0].minutes === 1, "50 秒记 1 分钟");

// 取整：29 秒不记
const timing3 = createScenario({ fakeDate: true });
timing3.getElement("focusInput").value = "英语单词";
timing3.getElement("timerToggle").dispatch("click", {});
timing3.advance(29 * 1000);
timing3.getElement("timerToggle").dispatch("click", {});
check(!timing3.store.get("yantu-checkins-v1"), "不足 30 秒不记录");

// 旧页面
const legacy = createScenario({ legacyHtml: true });
legacy.getElement("focusInput").value = "补卡测试";
legacy.getElement("minutesInput").value = "30";
legacy.getElement("checkinForm").dispatch("submit", {});
check(Boolean(legacy.store.get("yantu-checkins-v1")), "旧页面缺饼图节点时仍能打卡");

if (process.exitCode) {
  console.error("冒烟测试未通过");
} else {
  console.log("冒烟测试全部通过");
}
