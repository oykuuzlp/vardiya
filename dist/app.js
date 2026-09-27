const form = document.querySelector('#shift-form');
const dateInput = document.querySelector('#shift-date');
const today = new Date();
dateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

function calculateShift(start, end, rate) {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (minutes < 0) minutes += 24 * 60;
  const hours = minutes / 60;
  return { hours, earnings: Math.round(hours * rate * 100) / 100 };
}

function updatePreview() {
  const data = new FormData(form);
  const start = data.get('start');
  const end = data.get('end');
  const rate = Number(data.get('rate'));
  const error = document.querySelector('#error');
  if (!form.checkValidity()) {
    error.textContent = 'Tarih, saat ve ücret alanlarını geçerli değerlerle doldur.';
    document.querySelector('#hours').textContent = '—';
    document.querySelector('#earnings').textContent = '—';
    return;
  }
  error.textContent = start === end ? 'Saatler aynı: çalışma süresi 0 saat. Bitiş saatini değiştirebilirsin.' : '';
  const result = calculateShift(start, end, rate);
  const date = new Date(`${data.get('date')}T12:00:00`);
  document.querySelector('#date-label').textContent = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }).format(date);
  document.querySelector('#time-label').textContent = `${start} — ${end}${end < start ? ' · ertesi gün' : ''}`;
  document.querySelector('#shift-type').textContent = end < start ? 'Geceye uzanıyor' : 'Aynı gün';
  document.querySelector('#hours').textContent = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(result.hours);
  document.querySelector('#earnings').textContent = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(result.earnings);
}

form.addEventListener('input', updatePreview);

updatePreview();

const storageKey = 'vardiya.shifts.v1';
const statusElement = document.querySelector('#save-status');
let shifts = [];
let storageReady = true;
let calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const moneyFormat = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
const hourFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

function isValidShift(shift) {
  return shift && typeof shift.id === 'string' && typeof shift.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(shift.date) && !Number.isNaN(new Date(`${shift.date}T12:00:00`).getTime()) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(shift.start) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(shift.end) && Number.isFinite(shift.rate) && shift.rate >= 0 && shift.rate <= 1000000;
}

try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (!Array.isArray(stored) || !stored.every(isValidShift)) throw new Error('Invalid saved data');
  shifts = stored;
} catch {
  storageReady = false;
  statusElement.textContent = 'Kayıtlar okunamadı. Mevcut verileri korumak için yeni kayıt kapatıldı.';
}

function saveShifts(nextShifts) {
  if (!storageReady) return false;
  try {
    localStorage.setItem(storageKey, JSON.stringify(nextShifts));
    shifts = nextShifts;
    return true;
  } catch {
    statusElement.textContent = 'Tarayıcı kayda izin vermedi. Vardiya kaydedilemedi.';
    return false;
  }
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function updateWeeklySummary() {
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekShifts = shifts.filter(shift => shift.date >= dateKey(weekStart) && shift.date < dateKey(weekEnd));
  const totals = weekShifts.reduce((total, shift) => {
    const result = calculateShift(shift.start, shift.end, shift.rate);
    return { hours: total.hours + result.hours, cents: total.cents + Math.round(result.earnings * 100) };
  }, { hours: 0, cents: 0 });
  const remaining = weekShifts.filter(shift => {
    const end = new Date(`${shift.date}T${shift.end}:00`);
    if (shift.end < shift.start) end.setDate(end.getDate() + 1);
    return end > now;
  }).length;
  const lastDay = new Date(weekEnd);
  lastDay.setDate(lastDay.getDate() - 1);
  const dateFormat = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
  document.querySelector('#weekly-range').textContent = `${dateFormat.format(weekStart)} – ${dateFormat.format(lastDay)}`;
  document.querySelector('#weekly-hours').textContent = `${hourFormat.format(totals.hours)} saat`;
  document.querySelector('#weekly-earnings').textContent = moneyFormat.format(totals.cents / 100);
  document.querySelector('#weekly-remaining').textContent = remaining;
}

function renderCalendar() {
  updateWeeklySummary();
  const grid = document.querySelector('#calendar-grid');
  const list = document.querySelector('#shift-list');
  grid.replaceChildren();
  list.replaceChildren();
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const prefix = dateKey(calendarMonth).slice(0, 7);
  const monthShifts = shifts.filter(shift => shift.date.startsWith(prefix)).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  document.querySelector('#month-label').textContent = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(calendarMonth);
  const totals = monthShifts.reduce((sum, shift) => {
    const result = calculateShift(shift.start, shift.end, shift.rate);
    return { hours: sum.hours + result.hours, earnings: sum.earnings + result.earnings };
  }, { hours: 0, earnings: 0 });
  document.querySelector('#month-summary').textContent = `${monthShifts.length} vardiya · ${hourFormat.format(totals.hours)} saat · ${moneyFormat.format(totals.earnings)} tahmini kazanç`;
  document.querySelector('#calendar-empty').textContent = monthShifts.length ? 'Gece vardiyaları başladıkları günde gösterilir.' : 'Bu ay henüz vardiya yok. Yukarıdan ilk vardiyanı kaydet.';
  const offset = (calendarMonth.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  for (let index = 0; index < Math.ceil((offset + days) / 7) * 7; index++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    const day = index - offset + 1;
    if (day > 0 && day <= days) {
      const key = dateKey(new Date(year, month, day));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `day-button${key === dateKey(today) ? ' today' : ''}`;
      button.textContent = day;
      button.setAttribute('aria-label', `${day} ${document.querySelector('#month-label').textContent} için vardiya oluştur`);
      button.addEventListener('click', () => {
        dateInput.value = key;
        updatePreview();
        dateInput.focus();
      });
      cell.append(button);
      for (const shift of monthShifts.filter(item => item.date === key)) {
        const chip = document.createElement('span');
        chip.className = `shift-chip${shift.end < shift.start ? ' night' : ''}`;
        chip.textContent = `${shift.start}–${shift.end}${shift.end < shift.start ? ' (+1)' : ''}`;
        cell.append(chip);
      }
    }
    grid.append(cell);
  }
  for (const shift of monthShifts) {
    const row = document.createElement('div');
    row.className = 'shift-row';
    const details = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = `${new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(`${shift.date}T12:00:00`))} · ${shift.start}–${shift.end}${shift.end < shift.start ? ' (ertesi gün)' : ''}`;
    const detail = document.createElement('p');
    const result = calculateShift(shift.start, shift.end, shift.rate);
    detail.textContent = `${hourFormat.format(result.hours)} saat · ${moneyFormat.format(result.earnings)}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-shift';
    remove.textContent = 'Sil';
    remove.setAttribute('aria-label', `${title.textContent} vardiyasını sil`);
    remove.addEventListener('click', () => {
      if (saveShifts(shifts.filter(item => item.id !== shift.id))) {
        renderCalendar();
        statusElement.textContent = 'Vardiya silindi.';
      }
    });
    details.append(title, detail);
    row.append(details, remove);
    list.append(row);
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const shift = { id: crypto.randomUUID(), date: data.get('date'), start: data.get('start'), end: data.get('end'), rate: Number(data.get('rate')) };
  if (!isValidShift(shift) || shift.start === shift.end) {
    statusElement.textContent = 'Başlangıç ve bitiş saatleri farklı olmalı.';
    return;
  }
  if (shifts.some(item => item.date === shift.date && item.start === shift.start && item.end === shift.end)) {
    statusElement.textContent = 'Bu vardiya zaten kayıtlı.';
    return;
  }
  if (saveShifts([...shifts, shift])) {
    calendarMonth = new Date(`${shift.date.slice(0, 7)}-01T12:00:00`);
    renderCalendar();
    statusElement.textContent = 'Vardiyan takvime kaydedildi.';
  }
});

for (const [selector, direction] of [['#previous-month', -1], ['#next-month', 1]]) {
  document.querySelector(selector).addEventListener('click', () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + direction, 1);
    renderCalendar();
  });
}

renderCalendar();

const taskStorageKey = 'vardiya.tasks.v1';
const taskForm = document.querySelector('#task-form');
const taskDate = document.querySelector('#task-date');
const taskText = document.querySelector('#task-text');
const taskStatus = document.querySelector('#task-status');
let tasks = [];
let taskStorageReady = true;
taskDate.value = dateKey(today);

try {
  const storedTasks = JSON.parse(localStorage.getItem(taskStorageKey) || '[]');
  if (!Array.isArray(storedTasks) || !storedTasks.every(task => task && typeof task.id === 'string' && typeof task.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.date) && typeof task.text === 'string' && task.text.trim().length > 0 && task.text.length <= 160 && typeof task.done === 'boolean')) throw new Error('Invalid tasks');
  tasks = storedTasks;
} catch {
  taskStorageReady = false;
  taskStatus.textContent = 'Görevler okunamadı. Mevcut kayıtları korumak için değişiklik yapılamıyor.';
}

function storeTasks(nextTasks) {
  if (!taskStorageReady) return false;
  try {
    localStorage.setItem(taskStorageKey, JSON.stringify(nextTasks));
    tasks = nextTasks;
    return true;
  } catch {
    taskStatus.textContent = 'Değişiklik kaydedilemedi. Tarayıcının depolama iznini kontrol et.';
    return false;
  }
}

function renderTasks() {
  const list = document.querySelector('#task-list');
  list.replaceChildren();
  const dayTasks = tasks.filter(task => task.date === taskDate.value);
  if (taskStorageReady) taskStatus.textContent = dayTasks.length ? `${dayTasks.filter(task => task.done).length} / ${dayTasks.length} tamamlandı` : 'Bu gün için henüz görev yok. İlk işini yukarıdan ekle.';
  for (const task of dayTasks) {
    const row = document.createElement('div');
    row.className = `task-row${task.done ? ' completed' : ''}`;
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.disabled = !taskStorageReady;
    const text = document.createElement('span');
    text.textContent = task.text;
    checkbox.addEventListener('change', () => {
      if (storeTasks(tasks.map(item => item.id === task.id ? { ...item, done: checkbox.checked } : item))) {
        row.classList.toggle('completed', checkbox.checked);
        const currentTasks = tasks.filter(item => item.date === taskDate.value);
        taskStatus.textContent = `${currentTasks.filter(item => item.done).length} / ${currentTasks.length} tamamlandı`;
      } else checkbox.checked = task.done;
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-shift';
    remove.textContent = 'Sil';
    remove.setAttribute('aria-label', `${task.text} görevini sil`);
    remove.disabled = !taskStorageReady;
    remove.addEventListener('click', () => {
      if (storeTasks(tasks.filter(item => item.id !== task.id))) {
        renderTasks();
        taskText.focus();
      }
    });
    label.append(checkbox, text);
    row.append(label, remove);
    list.append(row);
  }
}

taskForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!taskForm.reportValidity()) return;
  const text = taskText.value.trim();
  if (!text) {
    taskStatus.textContent = 'Yapılacak işi yazmalısın.';
    return;
  }
  if (storeTasks([...tasks, { id: crypto.randomUUID(), date: taskDate.value, text, done: false }])) {
    taskText.value = '';
    renderTasks();
    taskText.focus();
  }
});
taskDate.addEventListener('change', renderTasks);
renderTasks();

setInterval(updateWeeklySummary, 60000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateWeeklySummary();
});

const themeToggle = document.querySelector('#theme-toggle');
const themeStorageKey = 'vardiya.theme.v1';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const label = theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';
  themeToggle.innerHTML = theme === 'dark'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/></svg>';
  themeToggle.setAttribute('aria-label', label);
  themeToggle.title = label;
}

try {
  applyTheme(localStorage.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light');
} catch {
  applyTheme('light');
}

themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  try {
    localStorage.setItem(themeStorageKey, nextTheme);
  } catch {
    themeToggle.title = 'Tema bu sayfada değişti; tarayıcı tercihi kaydedemedi.';
  }
});
