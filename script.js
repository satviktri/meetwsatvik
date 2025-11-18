const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const meetingForm = document.getElementById("meetingForm");
const meetingList = document.getElementById("meetingList");
const meetingSearch = document.getElementById("meetingSearch");
const meetingCount = document.getElementById("meetingCount");
const templateBtn = document.getElementById("templateBtn");
const todoForm = document.getElementById("todoForm");
const todoList = document.getElementById("todoList");
const taskCount = document.getElementById("taskCount");
const showCompleted = document.getElementById("showCompleted");
const sideNotes = document.getElementById("sideNotes");
const clearSideNotes = document.getElementById("clearSideNotes");
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.querySelector(".theme-label");

const storageKey = "meetingNotebook";
const defaultData = {
  meetings: [],
  todos: [],
  sideNotes: "",
  theme: "light"
};

const stored = JSON.parse(localStorage.getItem(storageKey) || "null") || defaultData;
let appData = structuredClone(stored);

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(appData));
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderMeetings(filter = "") {
  meetingList.innerHTML = "";
  const filtered = appData.meetings.filter((meeting) =>
    meeting.title.toLowerCase().includes(filter.toLowerCase()) ||
    meeting.summary.toLowerCase().includes(filter.toLowerCase())
  );

  if (!filtered.length) {
    meetingList.classList.add("empty-state");
    meetingList.innerHTML = `<p>${filter ? "No matches found." : "No meetings logged yet. Add your first note to build momentum."}</p>`;
    meetingCount.textContent = appData.meetings.length;
    return;
  }

  meetingList.classList.remove("empty-state");

  filtered
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((meeting) => {
      const card = document.createElement("article");
      card.className = "meeting-card";
      card.innerHTML = `
        <h3>${meeting.title}</h3>
        <div class="meeting-meta">
          <span>${formatDate(meeting.date)}</span>
          <span class="tag">${meeting.focus}</span>
        </div>
        <p>${meeting.summary || "No summary"}</p>
        ${meeting.actions.length ? `<ol class="actions-list">${meeting.actions.map((item) => `<li>${item}</li>`).join("")}</ol>` : ""}
      `;
      meetingList.appendChild(card);
    });

  meetingCount.textContent = appData.meetings.length;
}

function renderTodos() {
  todoList.innerHTML = "";
  const items = appData.todos.filter((todo) => (showCompleted.checked ? true : !todo.done));

  if (!items.length) {
    todoList.classList.add("empty-state");
    todoList.innerHTML = `<li>${showCompleted.checked ? "No tasks yet" : "No active tasks"}</li>`;
    taskCount.textContent = appData.todos.filter((t) => !t.done).length;
    return;
  }

  todoList.classList.remove("empty-state");

  items
    .sort((a, b) => Number(a.done) - Number(b.done))
    .forEach((todo) => {
      const li = document.createElement("li");
      li.className = `todo-item ${todo.done ? "completed" : ""}`;
      li.innerHTML = `
        <div class="todo-details">
          <strong>${todo.text}</strong>
          <span>${todo.due ? `Due ${new Date(todo.due).toLocaleDateString()}` : "No due date"}</span>
        </div>
        <div class="todo-actions">
          <span class="badge ${todo.priority.toLowerCase()}">${todo.priority}</span>
          <button class="complete" data-id="${todo.id}">${todo.done ? "Undo" : "Complete"}</button>
          <button class="delete" data-id="${todo.id}">Delete</button>
        </div>
      `;
      todoList.appendChild(li);
    });

  taskCount.textContent = appData.todos.filter((t) => !t.done).length;
}

function loadTemplate() {
  document.getElementById("meetingSummary").value = `Discussion highlights:\n• What's blocking us?\n• Wins we should celebrate\n• Metrics pulse`;
  document.getElementById("meetingActions").value = `@Alex ⏤ Prepare stakeholder summary\n@Priya ⏤ Draft roadmap slides\n@Sam ⏤ Follow up with finance`;
}

function toggleTheme(force) {
  const theme = force || (document.body.classList.contains("dark") ? "light" : "dark");
  document.body.classList.toggle("dark", theme === "dark");
  themeLabel.textContent = theme === "dark" ? "Dark mode" : "Light mode";
  appData.theme = theme;
  persist();
}

meetingForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const meeting = {
    id: crypto.randomUUID(),
    title: meetingForm.meetingTitle.value.trim(),
    date: meetingForm.meetingDate.value,
    focus: meetingForm.meetingFocus.value,
    summary: meetingForm.meetingSummary.value.trim(),
    actions: meetingForm.meetingActions.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  };

  if (!meeting.title || !meeting.date) return;
  appData.meetings.push(meeting);
  persist();
  meetingForm.reset();
  renderMeetings(meetingSearch.value);
});

meetingSearch?.addEventListener("input", (event) => {
  renderMeetings(event.target.value);
});

templateBtn?.addEventListener("click", () => loadTemplate());

themeToggle?.addEventListener("click", () => toggleTheme());

todoForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const todo = {
    id: crypto.randomUUID(),
    text: todoForm.todoText.value.trim(),
    due: todoForm.todoDue.value,
    priority: todoForm.todoPriority.value,
    done: false
  };

  if (!todo.text) return;
  appData.todos.push(todo);
  persist();
  todoForm.reset();
  renderTodos();
});

showCompleted?.addEventListener("change", () => renderTodos());

todoList?.addEventListener("click", (event) => {
  const id = event.target.dataset.id;
  if (!id) return;
  if (event.target.classList.contains("delete")) {
    appData.todos = appData.todos.filter((todo) => todo.id !== id);
  } else if (event.target.classList.contains("complete")) {
    appData.todos = appData.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo));
  }
  persist();
  renderTodos();
});

sideNotes?.addEventListener("input", (event) => {
  appData.sideNotes = event.target.value;
  persist();
});

clearSideNotes?.addEventListener("click", () => {
  if (!sideNotes.value) return;
  if (confirm("Clear all side notes?")) {
    sideNotes.value = "";
    appData.sideNotes = "";
    persist();
  }
});

function bindTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((panel) => panel.classList.add("hidden"));
      tab.classList.add("active");
      const target = document.getElementById(`tab-${tab.dataset.tab}`);
      target?.classList.remove("hidden");
      target?.setAttribute("aria-hidden", "false");
    });
  });
}

function hydrate() {
  sideNotes.value = appData.sideNotes || "";
  toggleTheme(appData.theme);
  renderMeetings();
  renderTodos();
}

bindTabs();
hydrate();
