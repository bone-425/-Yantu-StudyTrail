const STORAGE_KEYS = {
  records: "yantu-checkins-v1",
  settings: "yantu-settings-v1",
};

const PRESET_KEY = "yantu-presets-v1";
const DEFAULT_PRESETS = ["英语单词", "数学", "专业课", "政治"];

// 断网救急用
const FALLBACK_QUOTES = [
  { text: "千里之行，始于足下。", author: "老子《道德经》" },
  { text: "不积跬步，无以至千里；不积小流，无以成江海。", author: "荀子《劝学》" },
  { text: "天行健，君子以自强不息。", author: "《周易·乾》" },
  { text: "锲而不舍，金石可镂。", author: "荀子《劝学》" },
  { text: "纸上得来终觉浅，绝知此事要躬行。", author: "陆游《冬夜读书示子聿》" },
  { text: "凡是过去，皆为序章。", author: "莎士比亚《暴风雨》" },
  { text: "人可以被毁灭，但不能被打败。", author: "海明威《老人与海》" },
  { text: "只有经历过地狱般的磨砺，才能练就创造天堂的力量。", author: "泰戈尔《飞鸟集》" },
  { text: "那些杀不死我的，使我更强大。", author: "尼采《偶像的黄昏》" },
];

// 每日三句
// quotes.json 已经是打乱好的顺序，每天取三条
const QUOTE_CACHE_KEY = "yantu-quotes-cache-v3";
const QUOTE_POOL_MIN = 3;
let quotePool = [...FALLBACK_QUOTES];

const MOOD_LABELS = {
  1: "很难进入",
  2: "有点疲惫",
  3: "还可以",
  4: "状态不错",
  5: "非常专注",
};

const DAY_MS = 24 * 60 * 60 * 1000;

const state = {
  quoteIndices: [],
  calendarCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  editingTodayEntryId: null,
  dayEditingKey: null,
  dayEditingEntryId: null,
  lastSubmitAt: 0,
  lastDaySubmitAt: 0,
  pieDateKey: null,
  selectedPresetId: null,
  timerStartedAt: null,
  timerTimer: null,
};

const elements = {
  todayText: document.getElementById("todayText"),
  mainQuote: document.getElementById("mainQuote"),
  miniQuotes: document.getElementById("miniQuotes"),
  examDays: document.getElementById("examDays"),
  examCaption: document.getElementById("examCaption"),
  streakDays: document.getElementById("streakDays"),
  totalDays: document.getElementById("totalDays"),
  totalCaption: document.getElementById("totalCaption"),
  monthHours: document.getElementById("monthHours"),
  monthCaption: document.getElementById("monthCaption"),
  checkinDate: document.getElementById("checkinDate"),
  checkinForm: document.getElementById("checkinForm"),
  minutesInput: document.getElementById("minutesInput"),
  moodInput: document.getElementById("moodInput"),
  moodText: document.getElementById("moodText"),
  focusInput: document.getElementById("focusInput"),
  noteInput: document.getElementById("noteInput"),
  quickTimes: document.getElementById("quickTimes"),
  cancelTodayEdit: document.getElementById("cancelTodayEdit"),
  todayEntrySummary: document.getElementById("todayEntrySummary"),
  todayEntryCount: document.getElementById("todayEntryCount"),
  todayEntryList: document.getElementById("todayEntryList"),
  calendarTitle: document.getElementById("calendarTitle"),
  calendarGrid: document.getElementById("calendarGrid"),
  recentList: document.getElementById("recentList"),
  settingsModal: document.getElementById("settingsModal"),
  settingsForm: document.getElementById("settingsForm"),
  examNameInput: document.getElementById("examNameInput"),
  examDateInput: document.getElementById("examDateInput"),
  dayModal: document.getElementById("dayModal"),
  dayModalLabel: document.getElementById("dayModalLabel"),
  dayModalTitle: document.getElementById("dayModalTitle"),
  dayEditTitle: document.getElementById("dayEditTitle"),
  dayEditHint: document.getElementById("dayEditHint"),
  dayForm: document.getElementById("dayForm"),
  dayEntrySummary: document.getElementById("dayEntrySummary"),
  dayEntryList: document.getElementById("dayEntryList"),
  dayMinutesInput: document.getElementById("dayMinutesInput"),
  dayMoodInput: document.getElementById("dayMoodInput"),
  dayMoodText: document.getElementById("dayMoodText"),
  dayFocusInput: document.getElementById("dayFocusInput"),
  dayNoteInput: document.getElementById("dayNoteInput"),
  dayQuickTimes: document.getElementById("dayQuickTimes"),
  saveDayRecord: document.getElementById("saveDayRecord"),
  toast: document.getElementById("toast"),
  mainQuoteAuthor: document.getElementById("mainQuoteAuthor"),
  pieDate: document.getElementById("pieDate"),
  piePrevDay: document.getElementById("piePrevDay"),
  pieNextDay: document.getElementById("pieNextDay"),
  pieChart: document.getElementById("pieChart"),
  pieTotal: document.getElementById("pieTotal"),
  pieCompare: document.getElementById("pieCompare"),
  pieLegend: document.getElementById("pieLegend"),
  presetChips: document.getElementById("presetChips"),
  managePresets: document.getElementById("managePresets"),
  timerBox: document.getElementById("timerBox"),
  timerToggle: document.getElementById("timerToggle"),
  timerDisplay: document.getElementById("timerDisplay"),
  timerHint: document.getElementById("timerHint"),
  presetModal: document.getElementById("presetModal"),
  presetList: document.getElementById("presetList"),
  presetForm: document.getElementById("presetForm"),
  presetNameInput: document.getElementById("presetNameInput"),
  closePresetModal: document.getElementById("closePresetModal"),
  focusOverlay: document.getElementById("focusOverlay"),
  focusProject: document.getElementById("focusProject"),
  focusClock: document.getElementById("focusClock"),
  focusBack: document.getElementById("focusBack"),
  focusStop: document.getElementById("focusStop"),
};

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    showToast("浏览器没有允许保存，请检查存储权限。");
    return false;
  }
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function getDefaultExamDate() {
  const today = startOfDay(new Date());
  return formatDateKey(new Date(today.getFullYear() + 1, 11, 26));
}

function getDefaultExamName() {
  return `${new Date().getFullYear() + 1} 考研`;
}

function getSettings() {
  const saved = readStorage(STORAGE_KEYS.settings, {});
  const currentYear = new Date().getFullYear();
  const legacyExamName =
    !saved.examName ||
    saved.examName === "考研初试" ||
    saved.examName === `${currentYear} 考研`;
  const legacyExamDate = saved.examDate === formatDateKey(new Date(currentYear, 11, 26));

  return {
    examName: legacyExamName ? getDefaultExamName() : saved.examName,
    examDate: !saved.examDate || legacyExamDate ? getDefaultExamDate() : saved.examDate,
  };
}

function saveSettings(settings) {
  writeStorage(STORAGE_KEYS.settings, settings);
}

function createEntryId() {
  return `entry_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeDayEntries(value, dateKey) {
  const rawEntries = Array.isArray(value) ? value : value ? [value] : [];
  return rawEntries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry, index) => ({
      id: entry.id || `${dateKey}_${index}_${createEntryId()}`,
      task: String(entry.task || entry.focus || "完成一次打卡").trim(),
      minutes: Math.max(0, Math.min(1440, Number(entry.minutes) || 0)),
      mood: Math.max(1, Math.min(5, Number(entry.mood) || 3)),
      note: String(entry.note || "").trim(),
      createdAt: entry.createdAt || entry.checkedAt || `${dateKey}T12:00:00`,
      backfilled: Boolean(entry.backfilled),
    }));
}

let recordsMigrationDone = false;

function getRecords() {
  const stored = readStorage(STORAGE_KEYS.records, {});
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return {};
  }

  const normalized = Object.fromEntries(
    Object.entries(stored)
      .map(([key, value]) => [key, normalizeDayEntries(value, key)])
      .filter(([, entries]) => entries.length > 0)
  );

  const needsMigration = Object.values(stored).some((value) => !Array.isArray(value));
  if (!recordsMigrationDone && needsMigration) {
    recordsMigrationDone = true;
    writeStorage(STORAGE_KEYS.records, normalized);
  } else {
    recordsMigrationDone = true;
  }

  return normalized;
}

function saveRecords(records) {
  return writeStorage(STORAGE_KEYS.records, records);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatDuration(minutes) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  if (safeMinutes === 0) {
    return "0 分钟";
  }

  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  if (hours === 0) {
    return `${rest} 分钟`;
  }
  if (rest === 0) {
    return `${hours} 小时`;
  }
  return `${hours} 小时 ${rest} 分钟`;
}

function formatHours(minutes) {
  const value = Math.max(0, Number(minutes) || 0) / 60;
  if (value === 0) {
    return "0";
  }
  return value >= 10 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2200);
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

const QUOTE_EPOCH = new Date(2026, 0, 1);
const QUOTES_PER_DAY = 3;

function getQuoteDayIndex(date = new Date()) {
  const today = startOfDay(date);
  return Math.max(0, Math.floor((today - startOfDay(QUOTE_EPOCH)) / 86400000));
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return function next() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 每轮重新洗牌，轮内不重复
function getRoundOrder(length, round) {
  const order = Array.from({ length }, (_, index) => index);
  const random = seededRandom(20261021 + round * 7919);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [order[index], order[target]] = [order[target], order[index]];
  }
  return order;
}

function applyDailyQuotes() {
  const pool = getQuotePool();
  const daysPerRound = Math.floor(pool.length / QUOTES_PER_DAY);
  if (daysPerRound < 1) {
    state.quoteIndices = [0, 0, 0];
    return;
  }

  const dayIndex = getQuoteDayIndex();
  const round = Math.floor(dayIndex / daysPerRound);
  const position = dayIndex % daysPerRound;
  const order = getRoundOrder(pool.length, round);
  const start = position * QUOTES_PER_DAY;
  state.quoteIndices = order.slice(start, start + QUOTES_PER_DAY);
}

function normalizeQuotePool(rawPool) {
  if (!Array.isArray(rawPool)) {
    return [];
  }
  return rawPool
    .map((item) => ({
      text: String(item?.text ?? item ?? "").trim(),
      author: String(item?.author ?? "").trim(),
    }))
    .filter((item) => item.text && item.author);
}

// 读今天的缓存
function restoreQuoteCache() {
  const cached = readStorage(QUOTE_CACHE_KEY, null);
  if (!cached || cached.at !== getTodayKey() || !Array.isArray(cached.pool)) {
    return;
  }
  const cleaned = normalizeQuotePool(cached.pool);
  if (cleaned.length >= QUOTE_POOL_MIN) {
    quotePool = cleaned;
  }
}

async function loadRemoteQuotes() {
  try {
    const response = await fetch(`quotes.json?v=${getTodayKey()}`, { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    const cleaned = normalizeQuotePool(Array.isArray(data) ? data : data?.quotes);
    if (cleaned.length < QUOTE_POOL_MIN) {
      return;
    }
    quotePool = cleaned;
    writeStorage(QUOTE_CACHE_KEY, { at: getTodayKey(), pool: cleaned });
    applyDailyQuotes();
    renderQuotes();
  } catch (error) {
    // 拿不到就用兜底
  }
}

function getQuotePool() {
  return quotePool.length >= QUOTE_POOL_MIN ? quotePool : FALLBACK_QUOTES;
}

function renderQuotes() {
  const pool = getQuotePool();
  const [mainIndex, secondIndex, thirdIndex] = state.quoteIndices;
  const main = pool[mainIndex] || FALLBACK_QUOTES[0];
  elements.mainQuote.textContent = `“${main.text}”`;
  if (elements.mainQuoteAuthor) {
    elements.mainQuoteAuthor.textContent = `—— ${main.author}`;
  }

  const secondary = [
    { label: "第二句", index: secondIndex },
    { label: "第三句", index: thirdIndex },
  ];

  elements.miniQuotes.innerHTML = secondary
    .map((item, slot) => {
      const quote = pool[item.index] || FALLBACK_QUOTES[0];
      return `
        <button class="mini-quote" type="button" data-slot="${slot + 1}">
          <span>${item.label}</span>
          <p>${escapeHtml(quote.text)}</p>
          <em class="mini-quote-author">${escapeHtml(quote.author)}</em>
        </button>
      `;
    })
    .join("");

  elements.miniQuotes.querySelectorAll(".mini-quote").forEach((button) => {
    button.addEventListener("click", () => {
      const slot = Number(button.dataset.slot);
      [state.quoteIndices[0], state.quoteIndices[slot]] = [
        state.quoteIndices[slot],
        state.quoteIndices[0],
      ];
      renderQuotes();
    });
  });
}

async function copyCurrentQuote() {
  const quote = getQuotePool()[state.quoteIndices[0]] || FALLBACK_QUOTES[0];
  const text = `${quote.text} —— ${quote.author}`;

  try {
    await navigator.clipboard.writeText(text);
    showToast("已经复制到剪贴板。");
    return;
  } catch (error) {
    const temporaryInput = document.createElement("textarea");
    temporaryInput.value = text;
    temporaryInput.style.position = "fixed";
    temporaryInput.style.opacity = "0";
    document.body.appendChild(temporaryInput);
    temporaryInput.select();
    const copied = document.execCommand("copy");
    temporaryInput.remove();
    showToast(copied ? "已经复制到剪贴板。" : "没有复制成功，请手动选择文字。");
  }
}

function getCurrentStreak(records) {
  let cursor = startOfDay(new Date());
  if (!records[formatDateKey(cursor)]?.length) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (records[formatDateKey(cursor)]?.length) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function renderStats(records) {
  const settings = getSettings();
  const today = startOfDay(new Date());
  const examDate = dateFromKey(settings.examDate);
  const daysLeft = Math.ceil((examDate.getTime() - today.getTime()) / DAY_MS);

  if (daysLeft > 0) {
    elements.examDays.textContent = daysLeft;
    elements.examCaption.textContent = `${settings.examName} · ${formatShortDate(examDate)}`;
  } else if (daysLeft === 0) {
    elements.examDays.textContent = "0";
    elements.examCaption.textContent = `今天就是${settings.examName}`;
  } else {
    elements.examDays.textContent = "--";
    elements.examCaption.textContent = "日期已过，可以在设置里修改";
  }

  const totalDays = Object.keys(records).length;
  elements.streakDays.textContent = getCurrentStreak(records);
  elements.totalDays.textContent = totalDays;
  elements.totalCaption.textContent = totalDays === 0 ? "从今天开始记录" : "每一天都算数";

  const monthPrefix = getTodayKey().slice(0, 7);
  const monthEntries = Object.entries(records).filter(([key]) => key.startsWith(monthPrefix));
  const monthMinutes = monthEntries.reduce(
    (sum, [, entries]) =>
      sum + entries.reduce((entrySum, entry) => entrySum + (Number(entry.minutes) || 0), 0),
    0
  );
  elements.monthHours.textContent = formatHours(monthMinutes);
  elements.monthCaption.textContent =
    monthEntries.length === 0 ? "这个月还没有记录" : `已经记录 ${monthEntries.length} 天`;
}

function syncMoodRange() {
  const value = Number(elements.moodInput.value);
  const percent = ((value - 1) / 4) * 100;
  elements.moodInput.style.background = `linear-gradient(90deg, var(--accent) ${percent}%, #dfe5e5 ${percent}%)`;
  elements.moodText.textContent = MOOD_LABELS[value] || MOOD_LABELS[3];
}

function clearQuickTimeActive() {
  elements.quickTimes.querySelectorAll("button").forEach((button) => {
    button.classList.remove("active");
  });
}

function fillForm(entry) {
  elements.minutesInput.value = entry ? entry.minutes || "" : "";
  elements.moodInput.value = entry ? entry.mood || 3 : 3;
  elements.focusInput.value = entry ? entry.task || "" : "";
  elements.noteInput.value = entry ? entry.note || "" : "";
  clearQuickTimeActive();
  syncMoodRange();
}

function resetTodayForm() {
  state.editingTodayEntryId = null;
  fillForm(null);
  const submitButton = document.getElementById("submitCheckin");
  if (submitButton) {
    submitButton.innerHTML = `
    <svg><use href="#icon-check"></use></svg>
    添加一条打卡
  `;
  }
  elements.cancelTodayEdit.classList.add("hidden");
  state.selectedPresetId = null;
  renderPresetChips();
  updateTimerUI();
}

function renderEntryList(container, entries, dateKey, emptyText, scope) {
  if (entries.length === 0) {
    container.innerHTML = `<div class="entry-empty">${escapeHtml(emptyText)}</div>`;
    return;
  }

  container.innerHTML = entries
    .map((entry) => {
      const meta = `${formatDuration(entry.minutes)} · ${MOOD_LABELS[entry.mood] || MOOD_LABELS[3]}${
        entry.backfilled ? " · 补卡" : ""
      }`;
      return `
        <article class="entry-item" data-entry-id="${entry.id}">
          <span class="entry-status"><svg><use href="#icon-check"></use></svg></span>
          <div class="entry-copy">
            <strong>${escapeHtml(entry.task)}</strong>
            <span>${escapeHtml(meta)}</span>
            ${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ""}
          </div>
          <div class="entry-actions">
            <button type="button" data-edit-entry="${entry.id}" data-date="${dateKey}" data-scope="${scope}">修改</button>
            <button type="button" data-delete-entry="${entry.id}" data-date="${dateKey}" data-scope="${scope}">删除</button>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-edit-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.scope === "today") {
        editTodayEntry(button.dataset.editEntry);
      } else {
        editDayEntry(button.dataset.editEntry);
      }
    });
  });
  container.querySelectorAll("[data-delete-entry]").forEach((button) => {
    button.addEventListener("click", () =>
      deleteEntry(button.dataset.date, button.dataset.deleteEntry, button.dataset.scope)
    );
  });
}

function renderToday(records) {
  const todayKey = getTodayKey();
  const entries = records[todayKey] || [];
  const totalMinutes = entries.reduce((sum, entry) => sum + (Number(entry.minutes) || 0), 0);

  elements.todayEntrySummary.textContent =
    entries.length > 0 ? `${entries.length} 项 · ${formatDuration(totalMinutes)}` : "还没有打卡";
  elements.todayEntryCount.textContent = `${entries.length} 项`;
  renderEntryList(
    elements.todayEntryList,
    entries,
    todayKey,
    "还没有打卡，写下刚完成的一件事。",
    "today"
  );
}

function renderCalendar(records) {
  const year = state.calendarCursor.getFullYear();
  const month = state.calendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const todayKey = getTodayKey();

  elements.calendarTitle.textContent = `${year} 年 ${month + 1} 月`;
  elements.calendarGrid.innerHTML = "";

  for (let index = 0; index < mondayOffset; index += 1) {
    const blank = document.createElement("span");
    blank.className = "calendar-blank";
    elements.calendarGrid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = formatDateKey(date);
    const button = document.createElement("button");
    const entries = records[key] || [];
    const hasRecord = entries.length > 0;

    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;

    if (hasRecord) {
      button.classList.add("has-record");
      button.setAttribute(
        "aria-label",
        `${month + 1}月${day}日，已打卡 ${entries.length} 项`
      );
    } else if (key <= todayKey) {
      button.classList.add("can-backfill");
      button.setAttribute("aria-label", `${month + 1}月${day}日，可以补卡`);
    }

    if (key === todayKey) {
      button.classList.add("today");
    }

    if (key > todayKey) {
      button.classList.add("future");
      button.disabled = true;
      button.setAttribute("aria-label", `${month + 1}月${day}日，还不能记录`);
    } else {
      button.addEventListener("click", () => openDayEditor(key));
    }

    elements.calendarGrid.appendChild(button);
  }
}

function renderRecent(records) {
  const recentEntries = Object.entries(records)
    .flatMap(([dateKey, entries]) => entries.map((entry) => ({ dateKey, ...entry })))
    .sort((first, second) => {
      const firstTime = new Date(first.createdAt).getTime() || dateFromKey(first.dateKey).getTime();
      const secondTime =
        new Date(second.createdAt).getTime() || dateFromKey(second.dateKey).getTime();
      return secondTime - firstTime;
    })
    .slice(0, 6);

  if (recentEntries.length === 0) {
    elements.recentList.innerHTML = `
      <div class="empty-state">
        第一条记录还在等你。<br>
        今天做一点，晚上写下来。
      </div>
    `;
    return;
  }

  elements.recentList.innerHTML = recentEntries
    .map((entry) => {
      const date = dateFromKey(entry.dateKey);
      const mood = MOOD_LABELS[entry.mood] || MOOD_LABELS[3];
      return `
        <button class="recent-item" type="button" data-date="${entry.dateKey}">
          <span class="recent-date">
            <strong>${date.getDate()}</strong>
            <span>${date.getMonth() + 1}月</span>
          </span>
          <span class="recent-copy">
            <strong>${escapeHtml(entry.task)}</strong>
            <span>${entry.backfilled ? "补卡 · " : ""}${mood}</span>
          </span>
          <span class="recent-time">${formatDuration(entry.minutes)}</span>
        </button>
      `;
    })
    .join("");

  elements.recentList.querySelectorAll(".recent-item").forEach((button) => {
    button.addEventListener("click", () => openDayEditor(button.dataset.date));
  });
}

function editTodayEntry(entryId) {
  const entry = (getRecords()[getTodayKey()] || []).find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  state.editingTodayEntryId = entryId;
  fillForm(entry);
  document.getElementById("submitCheckin").innerHTML = `
    <svg><use href="#icon-pencil"></use></svg>
    保存修改
  `;
  elements.cancelTodayEdit.classList.remove("hidden");
  elements.focusInput.focus();
  elements.checkinForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function editDayEntry(entryId) {
  const key = state.dayEditingKey;
  const entry = key
    ? (getRecords()[key] || []).find((item) => item.id === entryId)
    : null;
  if (!entry) {
    return;
  }

  state.dayEditingEntryId = entryId;
  fillDayForm(entry);
  elements.dayEditTitle.textContent = "修改这条打卡";
  elements.dayEditHint.textContent = "修改完成后，这一天的统计会自动更新。";
  elements.saveDayRecord.textContent = "保存修改";
}

function deleteEntry(dateKey, entryId, scope) {
  if (!confirm("确定删除这条打卡吗？")) {
    return;
  }

  const records = getRecords();
  const entries = (records[dateKey] || []).filter((entry) => entry.id !== entryId);
  if (entries.length === 0) {
    delete records[dateKey];
  } else {
    records[dateKey] = entries;
  }

  if (!saveRecords(records)) {
    return;
  }

  if (state.editingTodayEntryId === entryId) {
    resetTodayForm();
  }
  if (state.dayEditingEntryId === entryId) {
    resetDayForm();
  }

  renderAll();
  if (scope === "day" && state.dayEditingKey) {
    renderDayEditorContent();
  }
  showToast("这条打卡已经删除。");
}

// 打卡项目
function createPresetId() {
  return `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function getPresets() {
  const saved = readStorage(PRESET_KEY, null);
  if (Array.isArray(saved)) {
    return saved
      .filter((item) => item && typeof item.name === "string" && item.name.trim())
      .map((item) => ({
        id: item.id || createPresetId(),
        name: item.name.trim().slice(0, 20),
      }));
  }
  const defaults = DEFAULT_PRESETS.map((name) => ({ id: createPresetId(), name }));
  writeStorage(PRESET_KEY, defaults);
  return defaults;
}

function savePresets(presets) {
  return writeStorage(PRESET_KEY, presets);
}

function renderPresetChips() {
  if (!elements.presetChips) {
    return;
  }
  const presets = getPresets();
  elements.presetChips.replaceChildren();
  if (!presets.length) {
    const hint = document.createElement("span");
    hint.className = "preset-empty";
    hint.textContent = "还没有项目，点右边添加。";
    elements.presetChips.appendChild(hint);
    return;
  }
  presets.forEach((preset) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "preset-chip";
    chip.dataset.presetId = preset.id;
    chip.textContent = preset.name;
    if (preset.id === state.selectedPresetId) {
      chip.classList.add("active");
    }
    chip.addEventListener("click", () => selectPreset(preset));
    elements.presetChips.appendChild(chip);
  });
}

function selectPreset(preset) {
  state.selectedPresetId = preset.id;
  elements.focusInput.value = preset.name;
  renderPresetChips();
  updateTimerUI();
}

function renderPresetList() {
  if (!elements.presetList) {
    return;
  }
  const presets = getPresets();
  elements.presetList.replaceChildren();
  if (!presets.length) {
    const empty = document.createElement("p");
    empty.className = "preset-empty";
    empty.textContent = "还没有项目，在下面加一个。";
    elements.presetList.appendChild(empty);
    return;
  }
  presets.forEach((preset) => {
    const row = document.createElement("div");
    row.className = "preset-row";

    const name = document.createElement("span");
    name.textContent = preset.name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-button danger";
    remove.textContent = "删除";
    remove.addEventListener("click", () => deletePreset(preset.id));

    row.append(name, remove);
    elements.presetList.appendChild(row);
  });
}

function addPreset(name) {
  const value = String(name || "").trim().slice(0, 20);
  if (!value) {
    showToast("先写个项目名。");
    return false;
  }
  const presets = getPresets();
  if (presets.some((preset) => preset.name === value)) {
    showToast("这个项目已经有了。");
    return false;
  }
  presets.push({ id: createPresetId(), name: value });
  savePresets(presets);
  renderPresetChips();
  renderPresetList();
  return true;
}

function deletePreset(id) {
  const presets = getPresets().filter((preset) => preset.id !== id);
  savePresets(presets);
  if (state.selectedPresetId === id) {
    state.selectedPresetId = null;
    elements.focusInput.value = "";
  }
  renderPresetChips();
  renderPresetList();
  updateTimerUI();
}

function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function roundMinutes(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds < 30 ? minutes : minutes + 1;
}

function updateTimerUI() {
  if (!elements.timerToggle) {
    return;
  }
  const running = Boolean(state.timerStartedAt);
  elements.timerToggle.textContent = running ? "结束并记录" : "开始计时";
  elements.timerBox.classList.toggle("is-running", running);

  const clock = running ? formatClock(Date.now() - state.timerStartedAt) : "00:00";
  if (elements.focusClock) {
    elements.focusClock.textContent = clock;
  }

  if (!running) {
    elements.timerDisplay.textContent = "00:00";
    elements.timerHint.textContent = elements.focusInput.value.trim()
      ? "按分钟取整"
      : "先选一个项目";
    return;
  }

  elements.timerDisplay.textContent = clock;
  elements.timerHint.textContent = "计时中，结束后自动记一条";
}

function openFocusMode() {
  if (!elements.focusOverlay) {
    return;
  }
  elements.focusProject.textContent = elements.focusInput.value.trim() || "专注中";
  elements.focusOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  updateTimerUI();
}

function closeFocusMode() {
  if (!elements.focusOverlay) {
    return;
  }
  elements.focusOverlay.classList.add("hidden");
  if (!document.querySelector(".modal-backdrop:not(.hidden)")) {
    document.body.style.overflow = "";
  }
}

function startTimer() {
  if (!elements.focusInput.value.trim()) {
    showToast("先选一个项目，或者写下要做什么。");
    elements.focusInput.focus();
    return;
  }
  state.timerStartedAt = Date.now();
  window.clearInterval(state.timerTimer);
  state.timerTimer = window.setInterval(updateTimerUI, 500);
  openFocusMode();
  updateTimerUI();
}

function stopTimer() {
  if (!state.timerStartedAt) {
    return;
  }
  const elapsed = Date.now() - state.timerStartedAt;
  state.timerStartedAt = null;
  window.clearInterval(state.timerTimer);
  state.timerTimer = null;

  const minutes = roundMinutes(elapsed);
  closeFocusMode();
  updateTimerUI();

  if (minutes <= 0) {
    showToast("不到半分钟，这次没记。");
    return;
  }
  const task = elements.focusInput.value.trim();
  if (!task) {
    showToast("先选一个项目。");
    return;
  }

  elements.minutesInput.value = String(minutes);
  state.lastSubmitAt = 0;
  elements.checkinForm.requestSubmit();
}

function toggleTimer() {
  if (state.timerStartedAt) {
    stopTimer();
  } else {
    startTimer();
  }
}

function initPresets() {
  if (!elements.presetChips || !elements.presetForm || !elements.timerToggle) {
    return;
  }
  renderPresetChips();
  renderPresetList();
  updateTimerUI();

  elements.managePresets.addEventListener("click", () => {
    renderPresetList();
    openModal(elements.presetModal);
  });
  elements.closePresetModal.addEventListener("click", () => closeModal(elements.presetModal));
  elements.presetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (addPreset(elements.presetNameInput.value)) {
      elements.presetNameInput.value = "";
      showToast("项目已添加。");
    }
  });
  elements.timerToggle.addEventListener("click", toggleTimer);
}

// 扇形图
const PIE_COLORS = ["#c65e3d", "#46685c", "#d99b3c", "#4c7a9c", "#8a6a9e", "#b06a87", "#5f8f7a", "#9c7a4c"];

function setPieDate(key) {
  const safeKey = key > getTodayKey() ? getTodayKey() : key;
  state.pieDateKey = safeKey;
  elements.pieDate.value = safeKey;
  renderPie();
}

function shiftPieDate(amount) {
  const current = dateFromKey(state.pieDateKey || getTodayKey());
  const next = addDays(current, amount);
  if (next > startOfDay(new Date())) {
    return;
  }
  setPieDate(formatDateKey(next));
}

function polarPoint(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function describePieSlice(cx, cy, radius, startAngle, endAngle) {
  const start = polarPoint(cx, cy, radius, startAngle);
  const end = polarPoint(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function renderPie() {
  if (!elements.pieChart || !elements.pieDate || !elements.pieLegend || !elements.pieTotal) {
    return;
  }

  const key = state.pieDateKey || getTodayKey();
  elements.pieDate.value = key;

  const entries = (getRecords()[key] || []).filter((entry) => Number(entry.minutes) > 0);
  const total = entries.reduce((sum, entry) => sum + Number(entry.minutes), 0);

  elements.pieChart.replaceChildren();
  elements.pieLegend.replaceChildren();
  elements.pieTotal.textContent = "";
  if (elements.pieCompare) {
    elements.pieCompare.textContent = "";
  }

  if (!entries.length || total <= 0) {
    const empty = document.createElement("p");
    empty.className = "pie-empty";
    empty.textContent =
      key === getTodayKey()
        ? "今天还没有记录时长的打卡，先记一条吧。"
        : "这一天没有记录时长的打卡。";
    elements.pieChart.appendChild(empty);
    return;
  }

  const svgNs = "http://www.w3.org/2000/svg";
  const center = 110;
  const radius = 100;
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", "0 0 220 220");
  svg.setAttribute("class", "pie-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${key} 的打卡时间分布`);

  let angle = 0;
  entries.forEach((entry, index) => {
    const minutes = Number(entry.minutes);
    const portion = minutes / total;
    const color = PIE_COLORS[index % PIE_COLORS.length];
    const title = document.createElementNS(svgNs, "title");
    title.textContent = `${entry.task}：${formatDuration(minutes)}（${Math.round(portion * 100)}%）`;

    if (entries.length === 1) {
      const circle = document.createElementNS(svgNs, "circle");
      circle.setAttribute("cx", String(center));
      circle.setAttribute("cy", String(center));
      circle.setAttribute("r", String(radius));
      circle.setAttribute("fill", color);
      circle.appendChild(title);
      svg.appendChild(circle);
    } else {
      const path = document.createElementNS(svgNs, "path");
      path.setAttribute("d", describePieSlice(center, center, radius, angle, angle + portion * 360));
      path.setAttribute("fill", color);
      path.setAttribute("stroke", "#ffffff");
      path.setAttribute("stroke-width", "2");
      path.appendChild(title);
      svg.appendChild(path);
    }
    angle += portion * 360;
  });

  elements.pieChart.appendChild(svg);

  const date = dateFromKey(key);
  elements.pieTotal.textContent = `${
    key === getTodayKey() ? "今天" : formatShortDate(date)
  } · ${entries.length} 项 · 共 ${formatDuration(total)}`;

  const previousDate = addDays(date, -1);
  const previousTotal = (getRecords()[formatDateKey(previousDate)] || []).reduce(
    (sum, entry) => sum + Number(entry.minutes || 0),
    0
  );
  if (previousTotal <= 0) {
    if (elements.pieCompare) {
      elements.pieCompare.textContent = `前一天（${formatShortDate(previousDate)}）没有记录。`;
    }
  } else if (elements.pieCompare) {
    const diff = total - previousTotal;
    elements.pieCompare.textContent =
      diff === 0
        ? "和前一天的总时长持平。"
        : `比前一天${diff > 0 ? "多" : "少"} ${formatDuration(Math.abs(diff))}。`;
  }

  entries.forEach((entry, index) => {
    const portion = Number(entry.minutes) / total;
    const item = document.createElement("li");

    const dot = document.createElement("span");
    dot.className = "pie-dot";
    dot.style.background = PIE_COLORS[index % PIE_COLORS.length];

    const name = document.createElement("span");
    name.className = "pie-name";
    name.textContent = entry.task;

    const value = document.createElement("span");
    value.className = "pie-value";
    value.textContent = `${formatDuration(entry.minutes)} · ${Math.round(portion * 100)}%`;

    item.append(dot, name, value);
    elements.pieLegend.appendChild(item);
  });
}

function renderAll() {
  const records = getRecords();
  const now = new Date();

  elements.todayText.textContent = formatLongDate(now);
  elements.checkinDate.textContent = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(now);

  renderStats(records);
  renderToday(records);
  renderCalendar(records);
  renderRecent(records);
  renderPie();
}

function openModal(modal) {
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  modal.classList.add("hidden");
  const anyOpenModal = document.querySelector(".modal-backdrop:not(.hidden)");
  if (!anyOpenModal) {
    document.body.style.overflow = "";
  }
}

function openSettings() {
  const settings = getSettings();
  elements.examNameInput.value = settings.examName;
  elements.examDateInput.value = settings.examDate;
  openModal(elements.settingsModal);
}

function fillDayForm(entry) {
  elements.dayMinutesInput.value = entry ? entry.minutes || "" : "";
  elements.dayMoodInput.value = entry ? entry.mood || 3 : 3;
  elements.dayFocusInput.value = entry ? entry.task || "" : "";
  elements.dayNoteInput.value = entry ? entry.note || "" : "";
  elements.dayQuickTimes.querySelectorAll("button").forEach((button) => {
    button.classList.remove("active");
  });
  syncDayMoodRange();
}

function resetDayForm() {
  state.dayEditingEntryId = null;
  fillDayForm(null);
  elements.dayEditTitle.textContent = "继续补记这一天";
  elements.dayEditHint.textContent = "不同的事情可以一条一条添加。";
  elements.saveDayRecord.textContent = "添加打卡";
}

function syncDayMoodRange() {
  const value = Number(elements.dayMoodInput.value);
  const percent = ((value - 1) / 4) * 100;
  elements.dayMoodInput.style.background =
    `linear-gradient(90deg, var(--accent) ${percent}%, #dfe5e5 ${percent}%)`;
  elements.dayMoodText.textContent = MOOD_LABELS[value] || MOOD_LABELS[3];
}

function openDayEditor(key) {
  const records = getRecords();
  const todayKey = getTodayKey();
  if (key > todayKey) {
    return;
  }

  const date = dateFromKey(key);
  state.dayEditingKey = key;
  elements.dayModalTitle.textContent = formatLongDate(date);
  resetDayForm();
  renderDayEditorContent();
  openModal(elements.dayModal);
}

function renderDayEditorContent() {
  const key = state.dayEditingKey;
  if (!key) {
    return;
  }

  const entries = getRecords()[key] || [];
  const totalMinutes = entries.reduce((sum, entry) => sum + (Number(entry.minutes) || 0), 0);
  elements.dayEntrySummary.textContent =
    entries.length > 0 ? `${entries.length} 项 · ${formatDuration(totalMinutes)}` : "0 项";
  renderEntryList(
    elements.dayEntryList,
    entries,
    key,
    "还没有打卡，写下这天完成的第一件事。",
    "day"
  );

  if (!state.dayEditingEntryId) {
    elements.dayModalLabel.textContent = entries.length > 0 ? "继续打卡" : "补卡记录";
    elements.dayEditTitle.textContent =
      key === getTodayKey() ? "继续添加今天完成的事" : "继续补记这一天";
    elements.dayEditHint.textContent =
      entries.length > 0
        ? "不同的事情可以一条一条添加。"
        : key === getTodayKey()
          ? "把今天完成的事记下来，也可以添加很多条。"
          : "补上的每一点努力都算数。";
    elements.saveDayRecord.textContent = "添加打卡";
  }
}

function submitDayRecord(event) {
  event.preventDefault();

  const now = Date.now();
  if (now - state.lastDaySubmitAt < 350) {
    return;
  }
  state.lastDaySubmitAt = now;

  const key = state.dayEditingKey;
  if (!key || key > getTodayKey()) {
    showToast("这个日期暂时不能记录。");
    return;
  }

  try {
    const records = getRecords();
    const entries = records[key] || [];
    const task = elements.dayFocusInput.value.trim();
    if (!task) {
      showToast("先写一下这件事是什么。");
      return;
    }

    const minutes = Math.max(
      0,
      Math.min(1440, Number.parseInt(elements.dayMinutesInput.value, 10) || 0)
    );
    const previousEntry = state.dayEditingEntryId
      ? entries.find((entry) => entry.id === state.dayEditingEntryId)
      : null;
    const nextEntry = {
      id: previousEntry?.id || createEntryId(),
      task,
      minutes,
      mood: Number(elements.dayMoodInput.value) || 3,
      note: elements.dayNoteInput.value.trim(),
      createdAt: previousEntry?.createdAt || new Date().toISOString(),
      backfilled: key !== getTodayKey(),
    };

    if (previousEntry) {
      records[key] = entries.map((entry) => (entry.id === previousEntry.id ? nextEntry : entry));
    } else {
      records[key] = [...entries, nextEntry];
    }

    if (!saveRecords(records)) {
      return;
    }

    resetDayForm();
    renderAll();
    renderDayEditorContent();
    showToast(
      previousEntry ? "这条打卡已经更新。" : "已经为这一天添加一条打卡。"
    );
  } catch (error) {
    console.error("保存日期记录时出错", error);
    showToast("保存没有成功，请稍后再试。");
  }
}

function submitCheckin(event) {
  if (event) {
    event.preventDefault();
  }

  const now = Date.now();
  if (now - state.lastSubmitAt < 350) {
    return;
  }
  state.lastSubmitAt = now;

  try {
    const records = getRecords();
    const todayKey = getTodayKey();
    const entries = records[todayKey] || [];
    const task = elements.focusInput.value.trim();
    if (!task) {
      showToast("先写一下这件事是什么。");
      return;
    }

    const minutes = Math.max(
      0,
      Math.min(1440, Number.parseInt(elements.minutesInput.value, 10) || 0)
    );
    const previousEntry = state.editingTodayEntryId
      ? entries.find((entry) => entry.id === state.editingTodayEntryId)
      : null;
    const nextEntry = {
      id: previousEntry?.id || createEntryId(),
      task,
      minutes,
      mood: Number(elements.moodInput.value) || 3,
      note: elements.noteInput.value.trim(),
      createdAt: previousEntry?.createdAt || new Date().toISOString(),
      backfilled: false,
    };

    if (previousEntry) {
      records[todayKey] = entries.map((entry) =>
        entry.id === previousEntry.id ? nextEntry : entry
      );
    } else {
      records[todayKey] = [...entries, nextEntry];
    }

    if (!saveRecords(records)) {
      return;
    }

    const wasEditing = Boolean(previousEntry);
    resetTodayForm();
    try {
      renderAll();
    } catch (renderError) {
      console.error("刷新界面时出错", renderError);
    }
    showToast(wasEditing ? "这条打卡已经更新。" : "已经添加一条今日打卡。");
  } catch (error) {
    console.error("保存打卡时出错", error);
    showToast("保存没有成功，请刷新后再试。");
  }
}

function bindEvents() {
  document.getElementById("copyQuote").addEventListener("click", copyCurrentQuote);
  document.getElementById("openSettings").addEventListener("click", openSettings);

  if (elements.focusBack && elements.focusStop) {
    elements.focusBack.addEventListener("click", closeFocusMode);
    elements.focusStop.addEventListener("click", stopTimer);
  }

  if (elements.timerDisplay) {
    elements.timerDisplay.addEventListener("click", () => {
      if (state.timerStartedAt) {
        openFocusMode();
      }
    });
  }

  if (elements.pieDate && elements.piePrevDay && elements.pieNextDay) {
    elements.pieDate.addEventListener("change", () => {
      if (elements.pieDate.value) {
        setPieDate(elements.pieDate.value);
      }
    });
    elements.piePrevDay.addEventListener("click", () => shiftPieDate(-1));
    elements.pieNextDay.addEventListener("click", () => shiftPieDate(1));
  }

  elements.quickTimes.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-minutes]");
    if (!button) {
      return;
    }
    elements.minutesInput.value = button.dataset.minutes;
    clearQuickTimeActive();
    button.classList.add("active");
  });

  elements.minutesInput.addEventListener("input", clearQuickTimeActive);
  elements.moodInput.addEventListener("input", syncMoodRange);
  elements.dayMoodInput.addEventListener("input", syncDayMoodRange);
  elements.dayMinutesInput.addEventListener("input", () => {
    elements.dayQuickTimes.querySelectorAll("button").forEach((button) => {
      button.classList.remove("active");
    });
  });
  elements.dayQuickTimes.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-minutes]");
    if (!button) {
      return;
    }
    elements.dayMinutesInput.value = button.dataset.minutes;
    elements.dayQuickTimes.querySelectorAll("button").forEach((item) => {
      item.classList.remove("active");
    });
    button.classList.add("active");
  });
  elements.checkinForm.addEventListener("submit", submitCheckin);
  elements.dayForm.addEventListener("submit", submitDayRecord);
  elements.cancelTodayEdit.addEventListener("click", resetTodayForm);
  elements.focusInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      elements.checkinForm.requestSubmit();
    }
  });

  document.getElementById("prevMonth").addEventListener("click", () => {
    state.calendarCursor = new Date(
      state.calendarCursor.getFullYear(),
      state.calendarCursor.getMonth() - 1,
      1
    );
    renderCalendar(getRecords());
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    state.calendarCursor = new Date(
      state.calendarCursor.getFullYear(),
      state.calendarCursor.getMonth() + 1,
      1
    );
    renderCalendar(getRecords());
  });

  elements.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const examName = elements.examNameInput.value.trim() || getDefaultExamName();
    const examDate = elements.examDateInput.value;

    if (!examDate) {
      showToast("先选择考试日期。");
      return;
    }

    saveSettings({ examName, examDate });
    closeModal(elements.settingsModal);
    renderStats(getRecords());
    showToast("考试日期已经保存。");
  });

  document.getElementById("closeSettings").addEventListener("click", () => closeModal(elements.settingsModal));
  document.getElementById("cancelSettings").addEventListener("click", () => closeModal(elements.settingsModal));
  document.getElementById("closeDayModal").addEventListener("click", () => closeModal(elements.dayModal));
  document.getElementById("cancelDayEdit").addEventListener("click", () => closeModal(elements.dayModal));

  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        closeModal(backdrop);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (elements.focusOverlay && !elements.focusOverlay.classList.contains("hidden")) {
      closeFocusMode();
      return;
    }
    document.querySelectorAll(".modal-backdrop:not(.hidden)").forEach((modal) => {
      closeModal(modal);
    });
  });
}

function init() {
  state.calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  state.pieDateKey = getTodayKey();
  if (elements.pieDate) {
    elements.pieDate.max = getTodayKey();
  }
  restoreQuoteCache();
  applyDailyQuotes();
  renderQuotes();
  syncMoodRange();
  bindEvents();
  renderAll();
  initPresets();
  loadRemoteQuotes();
}

init();
