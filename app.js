const defaultState = { weeks: [], presets: [], plan: [], nutrition: {} };
let state = loadState();
let currentWeek = 0;

function loadState() {
  try {
    return JSON.parse(localStorage.getItem('gym-planner')) || defaultState;
  } catch (e) {
    return defaultState;
  }
}
function saveState() {
  localStorage.setItem('gym-planner', JSON.stringify(state));
}

// Navigation
function initNav() {
  const buttons = document.querySelectorAll('#bottom-nav button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(btn.dataset.target).classList.add('active');
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// Weeks Module
function renderWeeks() {
  if (state.weeks.length === 0) {
    state.weeks.push([]);
  }
  const tabs = document.getElementById('week-tabs');
  tabs.innerHTML = '';
  state.weeks.forEach((w, idx) => {
    const li = document.createElement('li');
    li.textContent = 'Week ' + (idx + 1);
    li.dataset.index = idx;
    if (idx === currentWeek) li.classList.add('active');
    li.addEventListener('click', () => {
      currentWeek = idx;
      renderWeeks();
    });
    tabs.appendChild(li);
  });
  renderWeekContent();
}

function renderWeekContent() {
  const container = document.getElementById('week-content');
  container.innerHTML = '';
  const week = state.weeks[currentWeek] || [];
  week.forEach((block, idx) => {
    const div = document.createElement('div');
    div.className = 'workout';
    div.draggable = true;
    div.dataset.index = idx;
    div.innerHTML = `
      <i class="icon fas ${block.icon || 'fa-dumbbell'}"></i>
      <input type="checkbox" data-id="${block.id}" ${block.completed ? 'checked' : ''}>
      <div class="details">
        <strong>${block.name}</strong> - ${block.sets}x${block.reps} ${block.weight ? '@'+block.weight+'kg' : ''}
      </div>`;
    container.appendChild(div);
  });

  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = Number(e.target.dataset.id);
      const block = state.weeks[currentWeek].find(b => b.id === id);
      if (block) block.completed = e.target.checked;
      saveState();
    });
  });

  enableDrag(container);
}

function enableDrag(container) {
  let draggedIndex = null;
  container.querySelectorAll('.workout').forEach(item => {
    item.addEventListener('dragstart', e => {
      draggedIndex = Number(e.target.dataset.index);
      e.target.classList.add('dragging');
    });
    item.addEventListener('dragend', e => {
      e.target.classList.remove('dragging');
    });
  });
  container.addEventListener('dragover', e => e.preventDefault());
  container.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.workout');
    if (!target) return;
    const targetIndex = Number(target.dataset.index);
    const week = state.weeks[currentWeek];
    const [moved] = week.splice(draggedIndex, 1);
    week.splice(targetIndex, 0, moved);
    saveState();
    renderWeekContent();
  });
}

function addBlock() {
  const names = state.presets.map(p => p.name).join(', ');
  let choice = prompt('Enter exercise name or choose preset:\n' + names);
  if (!choice) return;
  let preset = state.presets.find(p => p.name === choice);
  let block;
  if (preset) {
    block = { ...preset, id: Date.now(), presetId: preset.id, completed: false };
  } else {
    const sets = prompt('Sets?', '3');
    const reps = prompt('Reps?', '10');
    const weight = prompt('Weight (kg)?');
    const icon = prompt('Font Awesome icon?', 'fa-dumbbell');
    block = {
      id: Date.now(),
      name: choice,
      sets: Number(sets),
      reps: Number(reps),
      weight: weight ? Number(weight) : null,
      notes: '',
      icon,
      completed: false
    };
  }
  state.weeks[currentWeek].push(block);
  saveState();
  renderWeekContent();
}

function addWeek() {
  const week = state.plan.map(pid => {
    const preset = state.presets.find(p => p.id === Number(pid));
    return preset ? { ...preset, id: Date.now() + Math.random(), presetId: preset.id, completed: false } : null;
  }).filter(Boolean);
  state.weeks.push(week);
  currentWeek = state.weeks.length - 1;
  saveState();
  renderWeeks();
}

document.getElementById('add-block').addEventListener('click', addBlock);
document.getElementById('add-week').addEventListener('click', addWeek);

// Planning Module
const presetForm = document.getElementById('preset-form');
presetForm.addEventListener('submit', e => {
  e.preventDefault();
  const preset = {
    id: Date.now(),
    name: document.getElementById('preset-name').value,
    sets: Number(document.getElementById('preset-sets').value),
    reps: Number(document.getElementById('preset-reps').value),
    weight: document.getElementById('preset-weight').value ? Number(document.getElementById('preset-weight').value) : null,
    notes: document.getElementById('preset-notes').value,
    icon: document.getElementById('preset-icon').value
  };
  state.presets.push(preset);
  presetForm.reset();
  saveState();
  renderPresets();
  renderPlan();
});

function renderPresets() {
  const list = document.getElementById('preset-list');
  list.innerHTML = '';
  state.presets.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<span><i class="fas ${p.icon}"></i> ${p.name} ${p.sets}x${p.reps}</span><button data-id="${p.id}"><i class="fas fa-trash"></i></button>`;
    li.addEventListener('click', () => editPreset(p));
    li.querySelector('button').addEventListener('click', e => {
      e.stopPropagation();
      removePreset(p.id);
    });
    list.appendChild(li);
  });
  const select = document.getElementById('plan-select');
  select.innerHTML = '';
  state.presets.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });
}

function editPreset(p) {
  const name = prompt('Name', p.name);
  if (!name) return;
  const sets = prompt('Sets', p.sets);
  const reps = prompt('Reps', p.reps);
  const weight = prompt('Weight', p.weight || '');
  const notes = prompt('Notes', p.notes || '');
  const icon = prompt('Icon', p.icon);
  Object.assign(p, { name, sets: Number(sets), reps: Number(reps), weight: weight ? Number(weight) : null, notes, icon });
  cascadePreset(p);
  saveState();
  renderPresets();
  renderPlan();
  renderWeekContent();
}

function removePreset(id) {
  state.presets = state.presets.filter(p => p.id !== id);
  state.plan = state.plan.filter(pid => pid !== id);
  state.weeks.forEach(week => {
    for (let i = week.length - 1; i >= 0; i--) {
      if (week[i].presetId === id) week.splice(i, 1);
    }
  });
  saveState();
  renderPresets();
  renderPlan();
  renderWeekContent();
}

function cascadePreset(preset) {
  state.weeks.forEach(week => {
    week.forEach(block => {
      if (block.presetId === preset.id && !block.completed) {
        Object.assign(block, { ...preset });
      }
    });
  });
}

function renderPlan() {
  const list = document.getElementById('plan-list');
  list.innerHTML = '';
  state.plan.forEach((pid, idx) => {
    const preset = state.presets.find(p => p.id === Number(pid));
    if (!preset) return;
    const li = document.createElement('li');
    li.innerHTML = `<span>${preset.name}</span><button data-idx="${idx}"><i class="fas fa-trash"></i></button>`;
    li.querySelector('button').addEventListener('click', () => {
      state.plan.splice(idx, 1);
      saveState();
      renderPlan();
    });
    list.appendChild(li);
  });
}

document.getElementById('add-plan-item').addEventListener('click', () => {
  const sel = document.getElementById('plan-select');
  if (sel.value) {
    state.plan.push(Number(sel.value));
    saveState();
    renderPlan();
  }
});

// Nutrition Module
function initNutrition() {
  const dateInput = document.getElementById('nutri-date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  dateInput.addEventListener('change', () => renderNutrition(dateInput.value));

  const foodForm = document.getElementById('food-form');
  foodForm.addEventListener('submit', e => {
    e.preventDefault();
    const date = dateInput.value;
    const entry = {
      name: document.getElementById('food-name').value,
      calories: Number(document.getElementById('food-calories').value),
      protein: Number(document.getElementById('food-protein').value),
      carbs: Number(document.getElementById('food-carbs').value),
      fat: Number(document.getElementById('food-fat').value)
    };
    if (!state.nutrition[date]) state.nutrition[date] = [];
    state.nutrition[date].push(entry);
    foodForm.reset();
    saveState();
    renderNutrition(date);
  });
  renderNutrition(today);
}

function renderNutrition(date) {
  const list = document.getElementById('food-list');
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  list.innerHTML = '';
  const entries = state.nutrition[date] || [];
  entries.forEach((item, idx) => {
    totals.calories += item.calories;
    totals.protein += item.protein;
    totals.carbs += item.carbs;
    totals.fat += item.fat;
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.name} - ${item.calories} kcal P${item.protein} C${item.carbs} F${item.fat}</span><button data-idx="${idx}"><i class="fas fa-trash"></i></button>`;
    li.querySelector('button').addEventListener('click', () => {
      entries.splice(idx, 1);
      saveState();
      renderNutrition(date);
    });
    list.appendChild(li);
  });
  document.getElementById('macro-totals').textContent = `Total: ${totals.calories} kcal | P ${totals.protein}g C ${totals.carbs}g F ${totals.fat}g`;
}

// Initialize
function init() {
  initNav();
  renderWeeks();
  renderPresets();
  renderPlan();
  initNutrition();
}

document.addEventListener('DOMContentLoaded', init);
