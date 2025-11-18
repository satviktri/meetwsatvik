const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const meetingForm = document.getElementById("meetingForm");
const meetingList = document.getElementById("meetingList");
const meetingSearch = document.getElementById("meetingSearch");
const meetingCount = document.getElementById("meetingCount");
const templateBtn = document.getElementById("templateBtn");
const meetingSubmit = document.getElementById("meetingSubmit");
const cancelEditBtn = document.getElementById("cancelEdit");
const peopleFilter = document.getElementById("peopleFilter");
const todoForm = document.getElementById("todoForm");
const todoList = document.getElementById("todoList");
const taskCount = document.getElementById("taskCount");
const showCompleted = document.getElementById("showCompleted");
const sideNotes = document.getElementById("sideNotes");
const clearSideNotes = document.getElementById("clearSideNotes");
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.querySelector(".theme-label");
const remoteForm = document.getElementById("remoteSyncForm");
const remoteOwnerInput = document.getElementById("remoteOwner");
const remoteRepoInput = document.getElementById("remoteRepo");
const remoteBranchInput = document.getElementById("remoteBranch");
const remoteFolderInput = document.getElementById("remoteFolder");
const remoteFileInput = document.getElementById("remoteFile");
const remoteTokenInput = document.getElementById("remoteToken");
const remoteAutoSyncInput = document.getElementById("remoteAutoSync");
const pullRemoteBtn = document.getElementById("pullRemote");
const pushRemoteBtn = document.getElementById("pushRemote");
const remoteStatusEl = document.getElementById("remoteStatus");

const storageKey = "meetingNotebook";
const remoteSettingsKey = "meetingNotebookRemote";
const defaultData = {
  meetings: [],
  todos: [],
  sideNotes: "",
  theme: "light"
};
const defaultRemoteSettings = {
  owner: "",
  repo: "",
  branch: "main",
  folder: "meeting-notes",
  file: "meetings.json",
  token: "",
  autoSync: false
};

const stored = JSON.parse(localStorage.getItem(storageKey) || "null") || defaultData;
let appData = structuredClone(stored);
const storedRemote = JSON.parse(localStorage.getItem(remoteSettingsKey) || "null") || defaultRemoteSettings;
let remoteSettings = { ...defaultRemoteSettings, ...storedRemote };
const meetingFilters = {
  text: "",
  person: "all"
};
let editingMeetingId = null;
let remoteSyncTimer = null;

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(appData));
}

function persistRemoteSettings() {
  localStorage.setItem(remoteSettingsKey, JSON.stringify(remoteSettings));
}

function setRemoteStatus(message, tone = "info") {
  if (!remoteStatusEl) return;
  remoteStatusEl.textContent = message || "";
  remoteStatusEl.dataset.tone = tone;
}

function isRemoteConfigured() {
  return Boolean(remoteSettings.owner && remoteSettings.repo && remoteSettings.branch && remoteSettings.file);
}

function updateRemoteControls(isBusy = false) {
  const configured = isRemoteConfigured();
  const disableActions = !configured || isBusy;
  if (pullRemoteBtn) pullRemoteBtn.disabled = disableActions;
  if (pushRemoteBtn) pushRemoteBtn.disabled = disableActions;
  if (remoteAutoSyncInput) remoteAutoSyncInput.disabled = !configured;
}

function populateRemoteForm() {
  if (!remoteForm) return;
  if (remoteOwnerInput) remoteOwnerInput.value = remoteSettings.owner;
  if (remoteRepoInput) remoteRepoInput.value = remoteSettings.repo;
  if (remoteBranchInput) remoteBranchInput.value = remoteSettings.branch;
  if (remoteFolderInput) remoteFolderInput.value = remoteSettings.folder;
  if (remoteFileInput) remoteFileInput.value = remoteSettings.file;
  if (remoteTokenInput) remoteTokenInput.value = remoteSettings.token;
  if (remoteAutoSyncInput) remoteAutoSyncInput.checked = Boolean(remoteSettings.autoSync);
  updateRemoteControls();
}

function buildRemotePath(settings = remoteSettings) {
  const folder = (settings.folder || "").trim().replace(/^\/+|\/+$/g, "");
  const file = (settings.file || "meetings.json").trim() || "meetings.json";
  return folder ? `${folder}/${file}` : file;
}

function encodeContent(str) {
  const bytes = new TextEncoder().encode(str);
  const binary = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binary);
}

function decodeContent(str) {
  const binary = atob(str);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getRemoteHeaders(settings = remoteSettings) {
  const headers = {
    Accept: "application/vnd.github+json"
  };
  if (settings.token?.trim()) {
    headers.Authorization = `Bearer ${settings.token.trim()}`;
  }
  return headers;
}

function getRemoteContentUrl(settings = remoteSettings) {
  const path = buildRemotePath(settings)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${path}`;
}

async function fetchRemoteFile(settings = remoteSettings) {
  const url = `${getRemoteContentUrl(settings)}?ref=${encodeURIComponent(settings.branch)}`;
  const response = await fetch(url, { headers: getRemoteHeaders(settings) });
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Unable to reach GitHub");
  }
  return response.json();
}

function queueRemoteSync() {
  if (!remoteSettings.autoSync || !isRemoteConfigured()) return;
  clearTimeout(remoteSyncTimer);
  remoteSyncTimer = setTimeout(() => {
    syncMeetingsToGitHub({ silent: true }).catch((error) => console.error(error));
  }, 800);
}

async function syncMeetingsToGitHub({ silent = false } = {}) {
  if (!isRemoteConfigured()) {
    if (!silent) setRemoteStatus("Add your repo details first.", "warning");
    return;
  }
  if (!silent) setRemoteStatus("Syncing with GitHub…", "info");
  updateRemoteControls(true);
  try {
    const remoteFile = await fetchRemoteFile();
    const payload = {
      exportedAt: new Date().toISOString(),
      meetings: appData.meetings
    };
    const body = {
      message: `Sync meeting notes (${new Date().toLocaleString()})`,
      content: encodeContent(JSON.stringify(payload, null, 2)),
      branch: remoteSettings.branch || "main"
    };
    if (remoteFile?.sha) {
      body.sha = remoteFile.sha;
    }
    const response = await fetch(getRemoteContentUrl(), {
      method: "PUT",
      headers: {
        ...getRemoteHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Unable to push file");
    }
    if (!silent) setRemoteStatus("Meetings synced to GitHub.", "success");
  } catch (error) {
    if (!silent) setRemoteStatus(`GitHub sync failed: ${error.message}`, "error");
    console.error(error);
  } finally {
    updateRemoteControls(false);
  }
}

async function pullMeetingsFromGitHub({ silent = false } = {}) {
  if (!isRemoteConfigured()) {
    if (!silent) setRemoteStatus("Add your repo details first.", "warning");
    return;
  }
  if (!silent) setRemoteStatus("Fetching latest meetings…", "info");
  updateRemoteControls(true);
  try {
    const remoteFile = await fetchRemoteFile();
    if (!remoteFile?.content) {
      if (!silent) setRemoteStatus("No meeting file found on GitHub yet.", "warning");
      return;
    }
    const decoded = decodeContent(remoteFile.content);
    const parsed = JSON.parse(decoded);
    const meetings = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.meetings)
      ? parsed.meetings
      : [];
    if (!Array.isArray(meetings)) {
      throw new Error("Remote file is not a list of meetings");
    }
    appData.meetings = meetings;
    persist();
    refreshPeopleFilterOptions();
    renderMeetings();
    if (!silent)
      setRemoteStatus(
        `Loaded ${meetings.length} meeting${meetings.length === 1 ? "" : "s"} from GitHub.`,
        "success"
      );
  } catch (error) {
    if (!silent) setRemoteStatus(`GitHub pull failed: ${error.message}`, "error");
    console.error(error);
  } finally {
    updateRemoteControls(false);
  }
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

function resetMeetingForm() {
  if (!meetingForm) return;
  meetingForm.reset();
  editingMeetingId = null;
  meetingForm.classList.remove("is-editing");
  if (meetingSubmit) meetingSubmit.textContent = "Save note";
  if (cancelEditBtn) cancelEditBtn.hidden = true;
}

function populateMeetingForm(meeting) {
  if (!meetingForm) return;
  meetingForm.meetingTitle.value = meeting.title;
  meetingForm.meetingDate.value = meeting.date;
  meetingForm.meetingFocus.value = meeting.focus;
  meetingForm.meetingSummary.value = meeting.summary || "";
  meetingForm.meetingPeople.value = (Array.isArray(meeting.people) ? meeting.people : []).join(", ");
  meetingForm.meetingActions.value = (Array.isArray(meeting.actions) ? meeting.actions : []).join("\n");
}

function startEditingMeeting(id) {
  if (!meetingForm) return;
  const meeting = appData.meetings.find((entry) => entry.id === id);
  if (!meeting) return;
  populateMeetingForm(meeting);
  editingMeetingId = id;
  meetingForm.classList.add("is-editing");
  if (meetingSubmit) meetingSubmit.textContent = "Update note";
  if (cancelEditBtn) cancelEditBtn.hidden = false;
  document.querySelector('[data-tab="meetings"]')?.click();
  meetingForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderMeetings() {
  meetingList.innerHTML = "";
  const textFilter = meetingFilters.text.toLowerCase();
  const personFilter = meetingFilters.person;
  const filtered = appData.meetings.filter((meeting) => {
    const people = Array.isArray(meeting.people) ? meeting.people : [];
    const matchesText =
      !textFilter ||
      meeting.title.toLowerCase().includes(textFilter) ||
      (meeting.summary || "").toLowerCase().includes(textFilter);
    const matchesPerson = personFilter === "all" ? true : people.includes(personFilter);
    return matchesText && matchesPerson;
  });

  if (!filtered.length) {
    meetingList.classList.add("empty-state");
    const hasActiveFilter = Boolean(textFilter) || personFilter !== "all";
    const emptyMessage = hasActiveFilter
      ? "No matches found."
      : "No previous meetings logged yet. Add your first note to build momentum.";
    meetingList.innerHTML = `<p>${emptyMessage}</p>`;
    meetingCount.textContent = appData.meetings.length;
    return;
  }

  meetingList.classList.remove("empty-state");

  filtered
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((meeting) => {
      const people = Array.isArray(meeting.people) ? meeting.people : [];
      const actions = Array.isArray(meeting.actions) ? meeting.actions : [];
      const card = document.createElement("article");
      card.className = "meeting-card";
      card.innerHTML = `
        <h3>${meeting.title}</h3>
        <div class="meeting-meta">
          <span>${formatDate(meeting.date)}</span>
          <span class="tag">${meeting.focus}</span>
        </div>
        ${people.length ? `<div class="meeting-people">${people.map((person) => `<span>${person}</span>`).join("")}</div>` : ""}
        <p>${meeting.summary || "No summary"}</p>
        ${actions.length ? `<ol class="actions-list">${actions.map((item) => `<li>${item}</li>`).join("")}</ol>` : ""}
        <div class="meeting-card-actions">
          <button class="text-button edit-meeting" data-meeting-id="${meeting.id}">Edit</button>
          <button class="text-button danger delete-meeting" data-meeting-id="${meeting.id}">Remove</button>
        </div>
      `;
      meetingList.appendChild(card);
    });

  meetingCount.textContent = appData.meetings.length;
}

function refreshPeopleFilterOptions() {
  if (!peopleFilter) return;
  const previousValue = peopleFilter.value;
  const uniquePeople = [
    ...new Set(
      appData.meetings.flatMap((meeting) => (Array.isArray(meeting.people) ? meeting.people : []))
    )
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  peopleFilter.innerHTML = '<option value="all">All people</option>';
  uniquePeople.forEach((person) => {
    const option = document.createElement("option");
    option.value = person;
    option.textContent = person;
    peopleFilter.appendChild(option);
  });

  const canKeepSelection = uniquePeople.includes(previousValue);
  const nextValue = canKeepSelection ? previousValue : "all";
  peopleFilter.value = nextValue;
  peopleFilter.disabled = uniquePeople.length === 0;

  meetingFilters.person = peopleFilter.value;
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
    id: editingMeetingId || crypto.randomUUID(),
    title: meetingForm.meetingTitle.value.trim(),
    date: meetingForm.meetingDate.value,
    focus: meetingForm.meetingFocus.value,
    summary: meetingForm.meetingSummary.value.trim(),
    people: meetingForm.meetingPeople.value
      .split(",")
      .map((person) => person.trim())
      .filter(Boolean),
    actions: meetingForm.meetingActions.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  };

  if (!meeting.title || !meeting.date) return;
  if (editingMeetingId) {
    appData.meetings = appData.meetings.map((entry) => (entry.id === editingMeetingId ? meeting : entry));
  } else {
    appData.meetings.push(meeting);
  }
  persist();
  resetMeetingForm();
  refreshPeopleFilterOptions();
  renderMeetings();
  queueRemoteSync();
});

cancelEditBtn?.addEventListener("click", () => resetMeetingForm());

meetingSearch?.addEventListener("input", (event) => {
  meetingFilters.text = event.target.value.trim().toLowerCase();
  renderMeetings();
});

peopleFilter?.addEventListener("change", (event) => {
  meetingFilters.person = event.target.value;
  renderMeetings();
});

templateBtn?.addEventListener("click", () => loadTemplate());

themeToggle?.addEventListener("click", () => toggleTheme());

meetingList?.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-meeting-id]");
  if (!target) return;
  const id = target.dataset.meetingId;
  if (target.classList.contains("delete-meeting")) {
    if (confirm("Remove this meeting note?")) {
      appData.meetings = appData.meetings.filter((meeting) => meeting.id !== id);
      if (editingMeetingId === id) {
        resetMeetingForm();
      }
      persist();
      refreshPeopleFilterOptions();
      renderMeetings();
      queueRemoteSync();
    }
  } else if (target.classList.contains("edit-meeting")) {
    startEditingMeeting(id);
  }
});

remoteForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  remoteSettings = {
    ...remoteSettings,
    owner: remoteOwnerInput?.value.trim() || "",
    repo: remoteRepoInput?.value.trim() || "",
    branch: remoteBranchInput?.value.trim() || "main",
    folder: remoteFolderInput?.value.trim() || "",
    file: remoteFileInput?.value.trim() || "meetings.json",
    token: remoteTokenInput?.value.trim() || "",
    autoSync: Boolean(remoteAutoSyncInput?.checked)
  };
  persistRemoteSettings();
  populateRemoteForm();
  setRemoteStatus("Remote settings saved.", "success");
});

pullRemoteBtn?.addEventListener("click", () => pullMeetingsFromGitHub());
pushRemoteBtn?.addEventListener("click", () => syncMeetingsToGitHub());

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
  populateRemoteForm();
  sideNotes.value = appData.sideNotes || "";
  toggleTheme(appData.theme);
  meetingFilters.text = meetingSearch?.value.trim().toLowerCase() || "";
  refreshPeopleFilterOptions();
  renderMeetings();
  renderTodos();
}

bindTabs();
hydrate();
if (isRemoteConfigured() && appData.meetings.length === 0) {
  pullMeetingsFromGitHub({ silent: true });
}
