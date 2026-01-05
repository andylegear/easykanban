// EasyKanban - Client-side Kanban Board Application

// Data structure
let boardData = {
    swimlanes: []
};

// Current editing state
let currentTask = null;
let currentSwimlane = null;
let selectedColor = '#ffd93d';

// DOM Elements
const boardContent = document.getElementById('boardContent');
const taskModal = document.getElementById('taskModal');
const swimlaneModal = document.getElementById('swimlaneModal');
const addSwimlaneBtn = document.getElementById('addSwimlaneBtn');
const saveBtn = document.getElementById('saveBtn');
const loadFile = document.getElementById('loadFile');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    renderBoard();
});

// Event Listeners
function initializeEventListeners() {
    addSwimlaneBtn.addEventListener('click', () => openSwimlaneModal());
    saveBtn.addEventListener('click', saveToFile);
    loadFile.addEventListener('change', loadFromFile);
    
    // Task modal
    document.getElementById('saveTaskBtn').addEventListener('click', saveTask);
    document.getElementById('deleteTaskBtn').addEventListener('click', deleteTask);
    
    // Swimlane modal
    document.getElementById('saveSwimlaneBtn').addEventListener('click', saveSwimlane);
    document.getElementById('deleteSwimlaneBtn').addEventListener('click', deleteSwimlane);
    
    // Color picker
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', (e) => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedColor = e.target.dataset.color;
        });
    });
    
    // Close modals on outside click
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) closeTaskModal();
    });
    swimlaneModal.addEventListener('click', (e) => {
        if (e.target === swimlaneModal) closeSwimlaneModal();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTaskModal();
            closeSwimlaneModal();
        }
    });
}

// Generate unique ID
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Render the board
function renderBoard() {
    if (boardData.swimlanes.length === 0) {
        boardContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">No swimlanes yet. Add your first swimlane to get started!</div>
                <button class="btn btn-primary" onclick="openSwimlaneModal()">+ Add Swimlane</button>
            </div>
        `;
        return;
    }
    
    boardContent.innerHTML = boardData.swimlanes.map(swimlane => renderSwimlane(swimlane)).join('');
    
    // Re-attach drag and drop listeners
    attachDragListeners();
}

// Render a single swimlane
function renderSwimlane(swimlane) {
    return `
        <div class="swimlane" data-swimlane-id="${swimlane.id}">
            <div class="swimlane-info">
                <div class="swimlane-name" onclick="openSwimlaneModal('${swimlane.id}')">${escapeHtml(swimlane.name)}</div>
                <div class="swimlane-actions">
                    <button class="btn btn-secondary" onclick="openSwimlaneModal('${swimlane.id}')">✏️ Edit</button>
                </div>
            </div>
            <div class="swimlane-columns">
                <div class="column" data-status="todo" data-swimlane-id="${swimlane.id}">
                    ${renderTasks(swimlane.tasks.filter(t => t.status === 'todo'))}
                    <button class="add-task-btn" onclick="openTaskModal('${swimlane.id}', 'todo')">+ Add Task</button>
                </div>
                <div class="column" data-status="inprogress" data-swimlane-id="${swimlane.id}">
                    ${renderTasks(swimlane.tasks.filter(t => t.status === 'inprogress'))}
                    <button class="add-task-btn" onclick="openTaskModal('${swimlane.id}', 'inprogress')">+ Add Task</button>
                </div>
                <div class="column" data-status="done" data-swimlane-id="${swimlane.id}">
                    ${renderTasks(swimlane.tasks.filter(t => t.status === 'done'))}
                    <button class="add-task-btn" onclick="openTaskModal('${swimlane.id}', 'done')">+ Add Task</button>
                </div>
            </div>
        </div>
    `;
}

// Render tasks
function renderTasks(tasks) {
    return tasks.map(task => `
        <div class="task-card" draggable="true" data-task-id="${task.id}" style="border-left-color: ${task.color}">
            <div class="task-card-header">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <button class="task-edit-btn" onclick="editTask('${task.id}')">✏️</button>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            ${task.labels && task.labels.length > 0 ? `
                <div class="task-labels">
                    ${task.labels.map(label => `<span class="task-label">${escapeHtml(label)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Drag and Drop functionality
function attachDragListeners() {
    const taskCards = document.querySelectorAll('.task-card');
    const columns = document.querySelectorAll('.column');
    
    taskCards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
    
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragleave', handleDragLeave);
        column.addEventListener('drop', handleDrop);
    });
}

let draggedTask = null;

function handleDragStart(e) {
    draggedTask = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.column').forEach(col => col.classList.remove('drag-over'));
    draggedTask = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = e.currentTarget.dataset.status;
    const newSwimlaneId = e.currentTarget.dataset.swimlaneId;
    
    // Find and update the task
    let task = null;
    let oldSwimlaneIndex = -1;
    let taskIndex = -1;
    
    for (let i = 0; i < boardData.swimlanes.length; i++) {
        const swimlane = boardData.swimlanes[i];
        const idx = swimlane.tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            task = swimlane.tasks[idx];
            oldSwimlaneIndex = i;
            taskIndex = idx;
            break;
        }
    }
    
    if (task) {
        // Remove from old location
        boardData.swimlanes[oldSwimlaneIndex].tasks.splice(taskIndex, 1);
        
        // Update status
        task.status = newStatus;
        
        // Add to new swimlane
        const newSwimlane = boardData.swimlanes.find(s => s.id === newSwimlaneId);
        if (newSwimlane) {
            newSwimlane.tasks.push(task);
        }
        
        renderBoard();
    }
}

// Task Modal Functions
function openTaskModal(swimlaneId, status, taskId = null) {
    currentTask = taskId ? findTask(taskId) : null;
    currentSwimlane = swimlaneId;
    
    document.getElementById('modalTitle').textContent = currentTask ? 'Edit Task' : 'Add Task';
    document.getElementById('taskTitle').value = currentTask ? currentTask.title : '';
    document.getElementById('taskDescription').value = currentTask ? currentTask.description || '' : '';
    document.getElementById('taskLabels').value = currentTask && currentTask.labels ? currentTask.labels.join(', ') : '';
    
    selectedColor = currentTask ? currentTask.color : '#ffd93d';
    document.querySelectorAll('.color-option').forEach(o => {
        o.classList.toggle('selected', o.dataset.color === selectedColor);
    });
    
    document.getElementById('deleteTaskBtn').style.display = currentTask ? 'block' : 'none';
    
    // Store status for new tasks
    taskModal.dataset.status = status;
    taskModal.dataset.taskId = taskId || '';
    
    taskModal.classList.add('active');
    document.getElementById('taskTitle').focus();
}

function editTask(taskId) {
    const task = findTask(taskId);
    if (task) {
        const swimlane = findTaskSwimlane(taskId);
        openTaskModal(swimlane.id, task.status, taskId);
    }
}

function closeTaskModal() {
    taskModal.classList.remove('active');
    currentTask = null;
}

function saveTask() {
    const title = document.getElementById('taskTitle').value.trim();
    if (!title) {
        alert('Please enter a task title');
        return;
    }
    
    const description = document.getElementById('taskDescription').value.trim();
    const labelsInput = document.getElementById('taskLabels').value.trim();
    const labels = labelsInput ? labelsInput.split(',').map(l => l.trim()).filter(l => l) : [];
    
    const taskData = {
        title,
        description,
        labels,
        color: selectedColor
    };
    
    if (currentTask) {
        // Update existing task
        Object.assign(currentTask, taskData);
    } else {
        // Create new task
        const swimlane = boardData.swimlanes.find(s => s.id === currentSwimlane);
        if (swimlane) {
            swimlane.tasks.push({
                id: generateId(),
                status: taskModal.dataset.status,
                ...taskData
            });
        }
    }
    
    closeTaskModal();
    renderBoard();
}

function deleteTask() {
    if (!currentTask) return;
    
    if (confirm('Are you sure you want to delete this task?')) {
        const swimlane = findTaskSwimlane(currentTask.id);
        if (swimlane) {
            swimlane.tasks = swimlane.tasks.filter(t => t.id !== currentTask.id);
        }
        closeTaskModal();
        renderBoard();
    }
}

// Swimlane Modal Functions
function openSwimlaneModal(swimlaneId = null) {
    currentSwimlane = swimlaneId ? boardData.swimlanes.find(s => s.id === swimlaneId) : null;
    
    document.getElementById('swimlaneModalTitle').textContent = currentSwimlane ? 'Edit Swimlane' : 'Add Swimlane';
    document.getElementById('swimlaneName').value = currentSwimlane ? currentSwimlane.name : '';
    document.getElementById('deleteSwimlaneBtn').style.display = currentSwimlane ? 'block' : 'none';
    
    swimlaneModal.classList.add('active');
    document.getElementById('swimlaneName').focus();
}

function closeSwimlaneModal() {
    swimlaneModal.classList.remove('active');
    currentSwimlane = null;
}

function saveSwimlane() {
    const name = document.getElementById('swimlaneName').value.trim();
    if (!name) {
        alert('Please enter a swimlane name');
        return;
    }
    
    if (currentSwimlane) {
        // Update existing swimlane
        currentSwimlane.name = name;
    } else {
        // Create new swimlane
        boardData.swimlanes.push({
            id: generateId(),
            name,
            tasks: []
        });
    }
    
    closeSwimlaneModal();
    renderBoard();
}

function deleteSwimlane() {
    if (!currentSwimlane) return;
    
    const taskCount = currentSwimlane.tasks.length;
    const message = taskCount > 0 
        ? `This swimlane has ${taskCount} task(s). Are you sure you want to delete it?`
        : 'Are you sure you want to delete this swimlane?';
    
    if (confirm(message)) {
        boardData.swimlanes = boardData.swimlanes.filter(s => s.id !== currentSwimlane.id);
        closeSwimlaneModal();
        renderBoard();
    }
}

// Helper Functions
function findTask(taskId) {
    for (const swimlane of boardData.swimlanes) {
        const task = swimlane.tasks.find(t => t.id === taskId);
        if (task) return task;
    }
    return null;
}

function findTaskSwimlane(taskId) {
    return boardData.swimlanes.find(s => s.tasks.some(t => t.id === taskId));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Save/Load Functions
function saveToFile() {
    const dataStr = JSON.stringify(boardData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'easykanban-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function loadFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            // Validate data structure
            if (!data.swimlanes || !Array.isArray(data.swimlanes)) {
                throw new Error('Invalid file format');
            }
            
            boardData = data;
            renderBoard();
            alert('Board loaded successfully!');
        } catch (error) {
            alert('Error loading file: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // Reset file input so same file can be loaded again
    e.target.value = '';
}

// Export functions for global access (used in onclick handlers)
window.openSwimlaneModal = openSwimlaneModal;
window.openTaskModal = openTaskModal;
window.editTask = editTask;
window.closeTaskModal = closeTaskModal;
window.closeSwimlaneModal = closeSwimlaneModal;
