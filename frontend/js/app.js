/* ===== Config ===== */
const API_BASE = '/api';
const LAST_EXCEL_KEY = 'lastExcelId';

/* ===== State ===== */
const state = {
  excelList: [],
  selectedExcelId: null,
  selectedExcelName: '',
  contacts: [],
  notesMap: {},
  filterMode: 'all',
  searchQuery: '',
  noteModal: { rowIndex: null, noteId: null },
};

/* ===== DOM References ===== */
// Pages
const leadsPage        = document.getElementById('leadsPage');
const adminPage        = document.getElementById('adminPage');

// Leads page
const adminBtn         = document.getElementById('adminBtn');
const leadsExcelSelect = document.getElementById('leadsExcelSelect');
const contactsCount    = document.getElementById('contactsCount');
const searchInput      = document.getElementById('searchInput');
const filterChips      = document.querySelectorAll('.chip');
const contactsList     = document.getElementById('contactsList');

// Admin page
const adminBackBtn     = document.getElementById('adminBackBtn');
const fileInput        = document.getElementById('fileInput');
const dropZone         = document.getElementById('dropZone');
const selectedFileEl   = document.getElementById('selectedFile');
const uploadBtn        = document.getElementById('uploadBtn');
const uploadStatus     = document.getElementById('uploadStatus');
const adminFileList    = document.getElementById('adminFileList');

// Note modal
const noteModal        = document.getElementById('noteModal');
const modalBackdrop    = document.getElementById('modalBackdrop');
const modalContactName = document.getElementById('modalContactName');
const noteTextarea     = document.getElementById('noteTextarea');
const charCount        = document.getElementById('charCount');
const saveNoteBtn      = document.getElementById('saveNoteBtn');
const deleteNoteBtn    = document.getElementById('deleteNoteBtn');
const noteStatus       = document.getElementById('noteStatus');
const modalClose       = document.getElementById('modalClose');

const toast = document.getElementById('toast');

/* ===== Page Navigation ===== */
function showPage(page) {
  leadsPage.classList.toggle('active', page === 'leads');
  adminPage.classList.toggle('active', page === 'admin');
  window.scrollTo(0, 0);
}

adminBtn.addEventListener('click', () => showPage('admin'));
adminBackBtn.addEventListener('click', () => showPage('leads'));

/* ===== Toast ===== */
let toastTimer = null;
function showToast(message, type = 'default') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

/* ===== Status Message ===== */
function showStatus(el, message, type) {
  el.textContent = message;
  el.className = `status-msg ${type}`;
  el.classList.remove('hidden');
}

function hideStatus(el) { el.classList.add('hidden'); }

/* ===== API Helpers ===== */
async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

/* ===== File Upload ===== */
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    selectedFileEl.textContent = `📄 ${file.name}`;
    selectedFileEl.classList.remove('hidden');
    uploadBtn.disabled = false;
    hideStatus(uploadStatus);
  }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer?.files[0];
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change'));
  }
});

uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) return;

  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading…';
  hideStatus(uploadStatus);

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await apiFetch(`${API_BASE}/excel/upload`, { method: 'POST', body: formData });
    showStatus(uploadStatus, res.message, 'success');
    fileInput.value = '';
    selectedFileEl.classList.add('hidden');
    selectedFileEl.textContent = '';
    await loadExcelList();
    if (res.data?.id) {
      const item = state.excelList.find((i) => i.id === res.data.id);
      await selectExcel(res.data.id, item?.originalName ?? res.data.originalName);
      showPage('leads');
    }
  } catch (err) {
    showStatus(uploadStatus, err.message, 'error');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload';
  }
});

/* ===== Excel List ===== */
async function loadExcelList() {
  try {
    const res = await apiFetch(`${API_BASE}/excel/list`);
    state.excelList = res.data;
    renderLeadsDropdown();
    renderAdminFileList();
  } catch (err) {
    showToast('Failed to load file list: ' + err.message, 'error');
  }
}

function renderLeadsDropdown() {
  leadsExcelSelect.innerHTML = '<option value="">— Select a contacts list —</option>';
  state.excelList.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    const date = new Date(item.uploadDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    option.textContent = `${item.originalName} (${item.recordCount} · ${date})`;
    leadsExcelSelect.appendChild(option);
  });

  if (state.selectedExcelId && [...leadsExcelSelect.options].some((o) => o.value === state.selectedExcelId)) {
    leadsExcelSelect.value = state.selectedExcelId;
  }
}

function renderAdminFileList() {
  if (state.excelList.length === 0) {
    adminFileList.innerHTML = '<div class="empty-state"><p>No files uploaded yet.</p></div>';
    return;
  }

  adminFileList.innerHTML = '';
  state.excelList.forEach((item) => {
    const date = new Date(item.uploadDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    const row = document.createElement('div');
    row.className = 'file-list-item';
    row.innerHTML = `
      <div class="file-list-info">
        <div class="file-list-name">${escapeHtml(item.originalName)}</div>
        <div class="file-list-meta">${item.recordCount} contacts · ${date}</div>
      </div>
      <button class="file-delete-btn" data-id="${item.id}" aria-label="Delete ${escapeHtml(item.originalName)}">🗑</button>
    `;
    adminFileList.appendChild(row);
  });

  adminFileList.querySelectorAll('.file-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteExcelById(btn.dataset.id));
  });
}

/* ===== Excel Selection ===== */
leadsExcelSelect.addEventListener('change', async () => {
  const id = leadsExcelSelect.value;
  if (!id) {
    state.selectedExcelId = null;
    state.selectedExcelName = '';
    state.contacts = [];
    state.notesMap = {};
    contactsCount.textContent = '';
    contactsList.innerHTML = '<div class="empty-state"><p>Select a contacts list above to get started.</p></div>';
    localStorage.removeItem(LAST_EXCEL_KEY);
    return;
  }
  const name = leadsExcelSelect.selectedOptions[0]?.textContent ?? '';
  await selectExcel(id, name);
});

async function selectExcel(id, name) {
  state.selectedExcelId = id;
  state.selectedExcelName = name;
  leadsExcelSelect.value = id;
  localStorage.setItem(LAST_EXCEL_KEY, id);
  await loadContacts(id);
}

/* ===== Load Contacts ===== */
async function loadContacts(excelId) {
  contactsCount.textContent = '';
  contactsList.innerHTML = '<div class="loading-indicator"><div class="spinner"></div>Loading contacts…</div>';
  searchInput.value = '';
  state.searchQuery = '';
  state.filterMode = 'all';
  updateFilterChips();

  try {
    const [contactsRes, notesRes] = await Promise.all([
      apiFetch(`${API_BASE}/excel/${excelId}/contacts`),
      apiFetch(`${API_BASE}/notes/excel/${excelId}`),
    ]);

    state.contacts = contactsRes.data.records;
    state.notesMap = notesRes.data;
    contactsCount.textContent = `${state.contacts.length} contacts`;
    applyFilters();
  } catch (err) {
    contactsList.innerHTML = `<div class="empty-state"><p>Failed to load contacts: ${escapeHtml(err.message)}</p></div>`;
  }
}

/* ===== Delete Excel ===== */
async function deleteExcelById(id) {
  const item = state.excelList.find((i) => i.id === id);
  const name = item?.originalName ?? 'this file';
  if (!confirm(`Delete "${name}"?\n\nAll contacts and notes will be permanently removed.`)) return;

  try {
    await apiFetch(`${API_BASE}/excel/${id}`, { method: 'DELETE' });
    showToast('File deleted', 'success');
    if (state.selectedExcelId === id) {
      state.selectedExcelId = null;
      state.selectedExcelName = '';
      state.contacts = [];
      state.notesMap = {};
      contactsCount.textContent = '';
      contactsList.innerHTML = '<div class="empty-state"><p>Select a contacts list above to get started.</p></div>';
      localStorage.removeItem(LAST_EXCEL_KEY);
    }
    await loadExcelList();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

/* ===== Search ===== */
let searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.searchQuery = searchInput.value.trim().toLowerCase();
    applyFilters();
  }, 250);
});

/* ===== Filters ===== */
filterChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    state.filterMode = chip.dataset.filter;
    updateFilterChips();
    applyFilters();
  });
});

function updateFilterChips() {
  filterChips.forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.filter === state.filterMode);
  });
}

function applyFilters() {
  let result = state.contacts;

  if (state.filterMode === 'with-note') {
    result = result.filter((c) => !!state.notesMap[c.rowIndex]);
  } else if (state.filterMode === 'without-note') {
    result = result.filter((c) => !state.notesMap[c.rowIndex]);
  }

  if (state.searchQuery) {
    const q = state.searchQuery;
    result = result.filter((c) =>
      [c.name, c.company, c.designation, c.number, c.email, c.industry]
        .some((v) => v && v.toLowerCase().includes(q))
    );
  }

  renderContacts(result);
}

/* ===== Render Helpers ===== */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function splitMultiple(value) {
  return value.split('/').map((v) => v.trim()).filter(Boolean);
}

function sanitizeLinkedIn(raw) {
  if (!raw) return null;
  const t = raw.trim();
  const SKIP = ['nf', 'n/a', 'na', '-', '--', 'nil', 'none', 'null', 'not available', 'not found'];
  if (SKIP.includes(t.toLowerCase())) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/linkedin\.com/i.test(t)) return 'https://' + t;
  if (/^\/?in\//i.test(t)) return 'https://www.linkedin.com/' + t.replace(/^\//, '');
  return null;
}

function buildPhoneLinks(numberStr, rowIndex) {
  if (!numberStr) return '';
  const numbers = splitMultiple(numberStr);

  const buttons = numbers
    .map((n, i) => `
      <a class="phone-link" href="tel:${encodeURIComponent(n)}" aria-label="Call ${escapeHtml(n)}">
        <span class="call-icon">📞</span>
        <span class="call-label">${numbers.length > 1 ? `Number ${i + 1}` : 'Call'}</span>
        <span class="call-number">${escapeHtml(n)}</span>
      </a>`)
    .join('');

  const seqBtn = numbers.length > 1
    ? `<button class="seq-call-btn" data-numbers="${escapeHtml(numbers.join('|'))}" data-row="${rowIndex}">
         🔁 Call ${numbers.length} numbers in order
       </button>`
    : '';

  return buttons + seqBtn;
}

function buildEmailLinks(emailStr) {
  if (!emailStr) return escapeHtml(emailStr);
  const emails = splitMultiple(emailStr);
  return emails
    .map((e) => `<a class="email-link" href="mailto:${encodeURIComponent(e)}">${escapeHtml(e)}</a>`)
    .join(', ');
}

/* ===== Render Contacts ===== */
function renderContacts(contacts) {
  if (contacts.length === 0) {
    contactsList.innerHTML = '<div class="empty-state"><p>No contacts found.</p></div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  contacts.forEach((contact) => {
    const note = state.notesMap[contact.rowIndex];
    const hasNote = !!note;

    const card = document.createElement('div');
    card.className = 'contact-card';
    card.dataset.rowIndex = contact.rowIndex;

    card.innerHTML = `
      <div class="contact-main">
        <div class="contact-name">${escapeHtml(contact.name || '—')}</div>
        ${contact.company     ? `<div class="contact-company">${escapeHtml(contact.company)}</div>` : ''}
        ${contact.designation ? `<div class="contact-designation">${escapeHtml(contact.designation)}</div>` : ''}
        <div class="phone-list">${buildPhoneLinks(contact.number, contact.rowIndex)}</div>
        ${hasNote ? `<div class="note-badge has-note">📝 Has note</div>` : ''}
      </div>

      <div class="note-preview ${hasNote ? 'visible' : ''}" id="note-preview-${contact.rowIndex}">${hasNote ? escapeHtml(note.note) : ''}</div>

      <div class="more-details" id="more-details-${contact.rowIndex}">
        ${contact.email        ? `<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${buildEmailLinks(contact.email)}</span></div>` : ''}
        ${contact.location     ? `<div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${escapeHtml(contact.location)}</span></div>` : ''}
        ${contact.industry     ? `<div class="detail-row"><span class="detail-label">Industry</span><span class="detail-value">${escapeHtml(contact.industry)}</span></div>` : ''}
        ${contact.employeeSize ? `<div class="detail-row"><span class="detail-label">Emp. Size</span><span class="detail-value">${escapeHtml(contact.employeeSize)}</span></div>` : ''}
        ${(() => { const li = sanitizeLinkedIn(contact.linkedin); return li ? `<div class="detail-row"><span class="detail-label">LinkedIn</span><span class="detail-value"><a href="${escapeHtml(li)}" target="_blank" rel="noopener noreferrer">View Profile</a></span></div>` : ''; })()}
      </div>

      <div class="contact-actions">
        <button class="action-btn toggle-details-btn" data-row="${contact.rowIndex}" aria-expanded="false">
          ▼ More Details
        </button>
        <button class="action-btn note-btn ${hasNote ? 'note-active' : ''}" data-row="${contact.rowIndex}">
          📝 ${hasNote ? 'Edit Note' : 'Add Note'}
        </button>
      </div>
    `;

    fragment.appendChild(card);
  });

  contactsList.innerHTML = '';
  contactsList.appendChild(fragment);

  contactsList.querySelectorAll('.toggle-details-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.dataset.row;
      const detailsEl = document.getElementById(`more-details-${row}`);
      const isOpen = detailsEl.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);
      btn.textContent = isOpen ? '▲ Less Details' : '▼ More Details';
    });
  });

  contactsList.querySelectorAll('.note-btn').forEach((btn) => {
    btn.addEventListener('click', () => openNoteModal(parseInt(btn.dataset.row, 10)));
  });

  contactsList.querySelectorAll('.seq-call-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const numbers = btn.dataset.numbers.split('|').filter(Boolean);
      dialSequentially(numbers, 0);
    });
  });
}

/* ===== Note Modal ===== */
function openNoteModal(rowIndex) {
  const contact = state.contacts.find((c) => c.rowIndex === rowIndex);
  const existingNote = state.notesMap[rowIndex];

  state.noteModal.rowIndex = rowIndex;
  state.noteModal.noteId = existingNote?.id ?? null;

  modalContactName.textContent = contact
    ? `${contact.name || 'Contact'}${contact.company ? ' · ' + contact.company : ''}`
    : 'Note';

  noteTextarea.value = existingNote?.note ?? '';
  charCount.textContent = noteTextarea.value.length;
  hideStatus(noteStatus);
  deleteNoteBtn.hidden = !existingNote;

  noteModal.classList.remove('hidden');
  setTimeout(() => noteTextarea.focus(), 300);
}

function closeNoteModal() {
  noteModal.classList.add('hidden');
  noteTextarea.value = '';
  state.noteModal.rowIndex = null;
  state.noteModal.noteId = null;
}

modalClose.addEventListener('click', closeNoteModal);
modalBackdrop.addEventListener('click', closeNoteModal);

noteTextarea.addEventListener('input', () => {
  charCount.textContent = noteTextarea.value.length;
});

saveNoteBtn.addEventListener('click', async () => {
  const { rowIndex } = state.noteModal;
  const noteText = noteTextarea.value.trim();

  if (rowIndex === null) return;
  if (!noteText) { showStatus(noteStatus, 'Note cannot be empty.', 'error'); return; }

  saveNoteBtn.disabled = true;
  saveNoteBtn.textContent = 'Saving…';
  hideStatus(noteStatus);

  try {
    const res = await apiFetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excelId: state.selectedExcelId, rowIndex, note: noteText }),
    });

    state.notesMap[rowIndex] = { id: res.data._id, note: noteText, updatedAt: new Date() };
    updateContactNoteUI(rowIndex, noteText);
    showToast('Note saved', 'success');
    closeNoteModal();
    if (state.filterMode !== 'all') applyFilters();
  } catch (err) {
    showStatus(noteStatus, err.message, 'error');
  } finally {
    saveNoteBtn.disabled = false;
    saveNoteBtn.textContent = 'Save';
  }
});

deleteNoteBtn.addEventListener('click', async () => {
  const { rowIndex, noteId } = state.noteModal;
  if (!noteId) return;
  if (!confirm('Delete this note?')) return;

  deleteNoteBtn.disabled = true;

  try {
    await apiFetch(`${API_BASE}/notes/${noteId}`, { method: 'DELETE' });
    delete state.notesMap[rowIndex];
    updateContactNoteUI(rowIndex, null);
    showToast('Note deleted', 'success');
    closeNoteModal();
    if (state.filterMode !== 'all') applyFilters();
  } catch (err) {
    showStatus(noteStatus, err.message, 'error');
  } finally {
    deleteNoteBtn.disabled = false;
  }
});

function updateContactNoteUI(rowIndex, noteText) {
  const card = contactsList.querySelector(`[data-row-index="${rowIndex}"]`);
  if (!card) return;

  const notePreview = document.getElementById(`note-preview-${rowIndex}`);
  const noteBtn = card.querySelector('.note-btn');
  const badgeEl = card.querySelector('.note-badge');

  if (noteText) {
    if (notePreview) { notePreview.textContent = noteText; notePreview.classList.add('visible'); }
    if (noteBtn) { noteBtn.textContent = '📝 Edit Note'; noteBtn.classList.add('note-active'); }
    if (!badgeEl) {
      const badge = document.createElement('div');
      badge.className = 'note-badge has-note';
      badge.textContent = '📝 Has note';
      card.querySelector('.contact-main').appendChild(badge);
    }
  } else {
    if (notePreview) { notePreview.textContent = ''; notePreview.classList.remove('visible'); }
    if (noteBtn) { noteBtn.textContent = '📝 Add Note'; noteBtn.classList.remove('note-active'); }
    if (badgeEl) badgeEl.remove();
  }
}

/* ===== Sequential Dialing ===== */
function dialSequentially(numbers, index) {
  if (index >= numbers.length) return;

  const current = numbers[index];
  const isLast = index === numbers.length - 1;

  window.location.href = `tel:${current}`;
  if (isLast) return;

  const next = numbers[index + 1];

  function onVisible() {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', onVisible);
    setTimeout(() => {
      if (confirm(`Call finished.\n\nDial next number?\n📞 ${next}`)) {
        dialSequentially(numbers, index + 1);
      }
    }, 600);
  }

  document.addEventListener('visibilitychange', onVisible);
}

/* ===== Init ===== */
async function init() {
  contactsList.innerHTML = '<div class="loading-indicator"><div class="spinner"></div>Loading…</div>';

  await loadExcelList();

  const lastId = localStorage.getItem(LAST_EXCEL_KEY);
  if (lastId && state.excelList.some((item) => item.id === lastId)) {
    const item = state.excelList.find((i) => i.id === lastId);
    await selectExcel(lastId, item.originalName);
  } else if (state.excelList.length === 0) {
    showPage('admin');
    contactsList.innerHTML = '<div class="empty-state"><p>Upload a contacts list to get started.</p></div>';
  } else {
    contactsList.innerHTML = '<div class="empty-state"><p>Select a contacts list above to get started.</p></div>';
  }
}

init();
