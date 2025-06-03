class TodoApp {
  constructor() {
    this.todoForm = document.getElementById('todoForm');
    this.todoInput = document.getElementById('todoInput');
    this.dueDateInput = document.getElementById('dueDateInput');
    this.prioritySelect = document.getElementById('prioritySelect');
    this.categoryInput = document.getElementById('categoryInput');
    this.todoList = document.getElementById('todoList');
    this.filters = document.querySelectorAll('#filters button');
    this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
    this.clearAllBtn = document.getElementById('clearAllBtn');
    this.calendar = document.getElementById('calendar');
    this.timer = document.getElementById('timer');
    this.progressSummary = document.getElementById('progressSummary');
    this.searchInput = document.getElementById('searchInput');
    this.darkModeToggle = document.getElementById('darkModeToggle');
    this.bulkSelect = document.getElementById('bulkSelect');
    this.undoSnackbar = document.getElementById('undoSnackbar');
    this.undoBtn = document.getElementById('undoBtn');
    this.exportBtn = document.getElementById('exportBtn');
    this.importBtn = document.getElementById('importBtn');
    this.voiceCommandBtn = document.getElementById('voiceCommandBtn'); // Added this for voice recognition

    this.todos = JSON.parse(localStorage.getItem('todos')) || [];
    this.filter = 'all';
    this.selectedTasks = new Set();
    this.lastDeleted = null;

    this.init();
  }

  init() {
    this.registerEvents();
    this.render();
    this.updateCalendar();
    this.updateTimer();
    setInterval(() => this.updateTimer(), 1000);
    this.loadDarkMode();
  }

  registerEvents() {
    this.todoForm.onsubmit = e => this.handleAddTask(e);
    this.filters.forEach(btn => btn.onclick = e => this.handleFilterClick(e));
    this.clearCompletedBtn.onclick = () => this.clearCompletedTasks();
    this.clearAllBtn.onclick = () => this.clearAllTasks();
    this.searchInput.oninput = () => this.render();
    this.darkModeToggle.onclick = () => this.toggleDarkMode();
    this.bulkSelect.onchange = () => this.toggleSelectAll();
    this.undoBtn.onclick = () => this.undoDelete();
    this.exportBtn.onclick = () => this.exportTasks();
    this.importBtn.onclick = () => this.importTasks();
    this.voiceCommandBtn.onclick = () => this.startVoiceRecognition(); // Connect voice command button

    document.addEventListener('keydown', e => {
      if (e.key === 'Delete') this.deleteSelectedTasks();
    });
  }

  saveTodos() {
    localStorage.setItem('todos', JSON.stringify(this.todos));
    this.updateProgressSummary();
  }

  toggleDarkMode() {
    const dark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', dark ? 'enabled' : 'disabled');
    this.darkModeToggle.textContent = dark ? '☀️ Light Mode' : '🌙 Dark Mode';
  }

  loadDarkMode() {
    if (localStorage.getItem('darkMode') === 'enabled') {
      document.body.classList.add('dark');
      this.darkModeToggle.textContent = '☀️ Light Mode';
    }
  }

  updateCalendar() {
    this.calendar.textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  updateTimer() {
    this.timer.textContent = new Date().toLocaleTimeString(undefined, { hour12: false });
  }

  handleAddTask(e) {
    e.preventDefault();
    const text = this.todoInput.value.trim();
    if (text.length < 2) {
      alert('Task description must be at least 2 characters.');
      return;
    }

    // Add new task to the list
    this.todos.push({
      id: this.generateId(),
      text,
      dueDate: this.dueDateInput.value || null,
      priority: this.prioritySelect.value,
      category: this.categoryInput.value.trim() || null,
      completed: false,
      progress: 0, // Initialize progress as 0
      attachment: null, // Initialize attachment as null
      startTime: null, // Initialize start time
      endTime: null // Initialize end time
    });

    // Clear the input form for new data entry
    this.todoForm.reset();

    // Save to localStorage
    this.saveTodos();

    // Call render to update the view immediately after task is added
    this.render();
  }

  generateId() {
    return '_' + Math.random().toString(36).slice(2, 9);
  }

  isOverdue(dueDate, completed) {
    return dueDate && !completed && new Date(dueDate + 'T23:59:59') < new Date();
  }

  handleFilterClick(e) {
    this.filters.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    this.filter = e.target.dataset.filter;
    this.selectedTasks.clear();
    this.bulkSelect.checked = false;
    this.render();
  }

  clearCompletedTasks() {
    const completed = this.todos.filter(t => t.completed);
    if (!completed.length) return alert('No completed tasks.');
    if (confirm(`Delete ${completed.length} completed task(s)?`)) {
      this.lastDeleted = completed;
      this.todos = this.todos.filter(t => !t.completed);
      this.saveTodos();
      this.render();
      this.showUndoSnackbar('Deleted completed tasks');
    }
  }

  clearAllTasks() {
    if (!this.todos.length) return alert('No tasks to clear.');
    if (confirm('Delete ALL tasks?')) {
      this.lastDeleted = [...this.todos];
      this.todos = [];
      this.saveTodos();
      this.render();
      this.showUndoSnackbar('Deleted all tasks');
    }
  }

  toggleSelectAll() {
    const visibleTasks = this.todoList.querySelectorAll('li.todo-item');
    if (this.bulkSelect.checked) {
      visibleTasks.forEach(li => this.selectedTasks.add(li.dataset.id));
    } else {
      this.selectedTasks.clear();
    }
    this.render();
  }

  deleteSelectedTasks() {
    if (this.selectedTasks.size === 0) return;
    if (confirm(`Delete ${this.selectedTasks.size} selected task(s)?`)) {
      this.lastDeleted = this.todos.filter(t => this.selectedTasks.has(t.id));
      this.todos = this.todos.filter(t => !this.selectedTasks.has(t.id));
      this.selectedTasks.clear();
      this.bulkSelect.checked = false;
      this.saveTodos();
      this.render();
      this.showUndoSnackbar('Deleted selected tasks');
    }
  }

  undoDelete() {
    if (this.lastDeleted && this.lastDeleted.length) {
      this.todos.push(...this.lastDeleted);
      this.saveTodos();
      this.render();
      this.lastDeleted = null;
      this.hideUndoSnackbar();
    }
  }

  showUndoSnackbar(message) {
    this.undoSnackbar.hidden = false;
    this.undoSnackbar.classList.add('show');
    this.undoSnackbar.firstChild.textContent = message;
    clearTimeout(this.snackbarTimeout);
    this.snackbarTimeout = setTimeout(() => this.hideUndoSnackbar(), 5000);
  }

  hideUndoSnackbar() {
    this.undoSnackbar.classList.remove('show');
    setTimeout(() => this.undoSnackbar.hidden = true, 400);
  }

  render() {
    this.todoList.innerHTML = '';
    const q = this.searchInput.value.trim().toLowerCase();
    const filtered = this.todos.filter(t => {
      const matchesFilter = (
        this.filter === 'all' ||
        (this.filter === 'active' && !t.completed) ||
        (this.filter === 'completed' && t.completed) ||
        (this.filter === 'overdue' && this.isOverdue(t.dueDate, t.completed))
      );
      const matchesSearch = t.text.toLowerCase().includes(q) || (t.category && t.category.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'list-group-item text-center text-muted';
      emptyLi.textContent = 'No tasks to show.';
      this.todoList.appendChild(emptyLi);
      this.updateProgressSummary();
      return;
    }

    filtered.forEach(todo => this.todoList.appendChild(this.createTaskElement(todo, q)));

    this.updateProgressSummary();
  }

  createTaskElement(todo, searchQuery) {
    const li = document.createElement('li');
    li.className = 'todo-item list-group-item d-flex align-items-center';
    li.dataset.id = todo.id;
    if (todo.completed) li.classList.add('completed');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'form-check-input me-3';
    checkbox.checked = todo.completed;
    checkbox.title = `Mark "${todo.text}" as completed`;
    checkbox.onchange = () => {
      todo.completed = checkbox.checked;
      this.saveTodos();
      this.render();
    };
    li.appendChild(checkbox);

    const selectCheckbox = document.createElement('input');
    selectCheckbox.type = 'checkbox';
    selectCheckbox.className = 'form-check-input me-2 select-checkbox';
    selectCheckbox.title = 'Select task for bulk actions';
    selectCheckbox.checked = this.selectedTasks.has(todo.id);
    selectCheckbox.onchange = () => {
      if (selectCheckbox.checked) this.selectedTasks.add(todo.id);
      else this.selectedTasks.delete(todo.id);
      this.bulkSelect.checked = this.selectedTasks.size === this.todoList.querySelectorAll('li.todo-item').length;
    };
    li.appendChild(selectCheckbox);

    const taskInfo = document.createElement('div');
    taskInfo.className = 'task-info d-flex align-items-center flex-grow-1';

    const taskSpan = document.createElement('span');
    taskSpan.className = 'task-text fw-bold';
    taskSpan.innerHTML = this.highlightText(todo.text, searchQuery);
    taskInfo.appendChild(taskSpan);

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn ms-3';
    editBtn.title = 'Edit task';
    editBtn.innerHTML = '✏️';
    editBtn.onclick = () => this.enableEditMode(todo, li);
    taskInfo.appendChild(editBtn);

    li.appendChild(taskInfo);

    const dueSpan = document.createElement('span');
    dueSpan.className = 'due-date ms-3';
    if (this.isOverdue(todo.dueDate, todo.completed)) dueSpan.classList.add('overdue');
    dueSpan.textContent = todo.dueDate ? todo.dueDate : 'No due date';
    li.appendChild(dueSpan);

    const prioritySpan = document.createElement('span');
    prioritySpan.className = `priority-badge ms-3 priority-${todo.priority}`;
    prioritySpan.textContent = todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1);
    li.appendChild(prioritySpan);

    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'progress-bar-container ms-3';
    const progressBar = document.createElement('progress');
    progressBar.className = 'progress-bar';
    progressBar.value = todo.progress;
    progressBar.max = 100;
    progressBar.title = `${todo.progress}% completed`;

    const updateProgressBtn = document.createElement('button');
    updateProgressBtn.textContent = 'Update Progress';
    updateProgressBtn.onclick = () => this.updateProgress(todo, progressBar);

    progressBarContainer.appendChild(progressBar);
    progressBarContainer.appendChild(updateProgressBtn);
    li.appendChild(progressBarContainer);

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn ms-3';
    delBtn.innerHTML = '&times;';
    delBtn.onclick = () => {
      if (confirm(`Delete task "${todo.text}"?`)) {
        this.lastDeleted = [todo];
        this.todos = this.todos.filter(t => t.id !== todo.id);
        this.selectedTasks.delete(todo.id);
        this.saveTodos();
        this.render();
        this.showUndoSnackbar('Task deleted');
      }
    };
    li.appendChild(delBtn);

    return li;
  }

  enableEditMode(todo, li) {
    const inputField = document.createElement('input');
    inputField.value = todo.text;
    inputField.className = 'form-control me-3';

    const prioritySelect = document.createElement('select');
    prioritySelect.className = 'form-select';
    ['low', 'medium', 'high'].forEach(level => {
      const option = document.createElement('option');
      option.value = level;
      option.textContent = level.charAt(0).toUpperCase() + level.slice(1);
      if (level === todo.priority) option.selected = true;
      prioritySelect.appendChild(option);
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn ms-3';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = () => {
      todo.text = inputField.value.trim();
      todo.priority = prioritySelect.value;
      this.saveTodos();
      this.render();
    };

    li.innerHTML = '';
    li.appendChild(inputField);
    li.appendChild(prioritySelect);
    li.appendChild(saveBtn);
  }

  highlightText(text, query) {
    if (!query) return text;
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(re, '<mark>$1</mark>');
  }

  updateProgress(todo, progressBar) {
    if (todo.progress < 100) {
      todo.progress += 10;
      progressBar.value = todo.progress;

      if (todo.progress === 100) {
        todo.completed = true;
        alert('Task completed!');
      }

      this.saveTodos();
    } else {
      alert('Task is already complete!');
    }
  }

  updateProgressSummary() {
    const total = this.todos.length;
    const completed = this.todos.filter(t => t.completed).length;
    this.progressSummary.textContent = `Total: ${total} | Active: ${total - completed} | Completed: ${completed}`;
  }

  exportTasks() {
    const dataStr = JSON.stringify(this.todos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileName = 'tasks.json';
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', exportFileName);
    link.click();
  }

  importTasks() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const importedTasks = JSON.parse(event.target.result);
        this.todos.push(...importedTasks);
        this.saveTodos();
        this.render();
      };
      reader.readAsText(file);
    };
    fileInput.click();
  }

  startVoiceRecognition() {
    const recognition = new window.SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let taskDescription = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        taskDescription += event.results[i][0].transcript;
      }

      this.todoInput.value = taskDescription;
    };

    recognition.start();

    recognition.onend = () => {
      this.voiceCommandBtn.textContent = 'Start Voice Command';
    };

    recognition.onerror = (event) => {
      alert('Error occurred during voice recognition: ' + event.error);
      this.voiceCommandBtn.textContent = 'Start Voice Command';
    };
  }
}

document.addEventListener('DOMContentLoaded', () => new TodoApp());
