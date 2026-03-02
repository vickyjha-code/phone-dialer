/* ===== Config ===== */
const API_BASE = '/api';

/* ===== State ===== */
const state = {
  selectedExcelId: null,
  selectedExcelName: '',
  contacts: [],
  notesMap: {},
  filterMode: 'all',      // 'all' | 'with-note' | 'without-note'
  searchQuery: '',
  noteModal: { rowIndex: null, noteId: null },
};

/* ===== DOM References ===== */
// Home page
const fileInput       = document.getElementById('fileInput');
const dropZone        = document.getElementById('dropZone');
const selectedFileEl  = document.getElementById('selectedFile');
const uploadBtn       = document.getElementById('uploadBtn');
const uploadStatus    = document.getElementById('uploadStatus');
const excelSelect     = document.getElementById('excelSelect');
const openExcelBtn    = document.getElementById('openExcelBtn');
const deleteExcelBtn  = document.getElementById('deleteExcelBtn');

// Contacts page
const homePage        = document.getElementById('homePage');
const contactsPage    = document.getElementById('contactsPage');
const backBtn         = document.getElementById('backBtn');
const contactsTitle   = document.getElementById('contactsTitle');
const contactsCount   = document.getElementById('contactsCount');
const headerDeleteBtn = document.getElementById('headerDeleteBtn');
const searchInput     = document.getElementById('searchInput');
const filterChips     = document.querySelectorAll('.chip');
const contactsList    = document.getElementById('contactsList');

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
  homePage.classList.toggle('active', page === 'home');
  contactsPage.classList.toggle('active', page === 'contacts');
  window.scrollTo(0, 0);
}

backBtn.addEventListener('click', () => showPage('home'));

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
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
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
      excelSelect.value = res.data.id;
      excelSelect.dispatchEvent(new Event('change'));
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
    const list = res.data;
    const currentVal = excelSelect.value;

    excelSelect.innerHTML = '<option value="">— Choose an uploaded file —</option>';
    list.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      const date = new Date(item.uploadDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      option.textContent = `${item.originalName} (${item.recordCount} contacts · ${date})`;
      excelSelect.appendChild(option);
    });

    if (currentVal && [...excelSelect.options].some((o) => o.value === currentVal)) {
      excelSelect.value = currentVal;
    }

    syncHomeButtons();
  } catch (err) {
    showToast('Failed to load file list: ' + err.message, 'error');
  }
}

function syncHomeButtons() {
  const hasSelection = !!excelSelect.value;
  openExcelBtn.disabled = !hasSelection;
  deleteExcelBtn.hidden = !hasSelection;
}

excelSelect.addEventListener('change', syncHomeButtons);

openExcelBtn.addEventListener('click', async () => {
  const id = excelSelect.value;
  if (!id) return;
  const name = excelSelect.selectedOptions[0]?.textContent ?? 'Contacts';
  state.selectedExcelId = id;
  state.selectedExcelName = name;
  await openContactsPage(id, name);
});

deleteExcelBtn.addEventListener('click', () => deleteCurrentExcel());
headerDeleteBtn.addEventListener('click', () => deleteCurrentExcel());

async function deleteCurrentExcel() {
  const id = state.selectedExcelId || excelSelect.value;
  if (!id) return;

  const name = state.selectedExcelName || excelSelect.selectedOptions[0]?.textContent || 'this file';
  if (!confirm(`Delete "${name}"?\n\nAll contacts and notes will be permanently removed.`)) return;

  try {
    await apiFetch(`${API_BASE}/excel/${id}`, { method: 'DELETE' });
    showToast('File deleted', 'success');
    state.selectedExcelId = null;
    state.contacts = [];
    state.notesMap = {};
    showPage('home');
    await loadExcelList();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

/* ===== Open Contacts Page ===== */
async function openContactsPage(excelId, name) {
  // Set title immediately and show page
  contactsTitle.textContent = name.replace(/\s*\(.*\)$/, ''); // strip "(N contacts · date)" suffix
  contactsCount.textContent = '';
  contactsList.innerHTML = '<div class="loading-indicator"><div class="spinner"></div>Loading contacts…</div>';
  searchInput.value = '';
  state.searchQuery = '';
  state.filterMode = 'all';
  updateFilterChips();
  showPage('contacts');

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

  // Note filter
  if (state.filterMode === 'with-note') {
    result = result.filter((c) => !!state.notesMap[c.rowIndex]);
  } else if (state.filterMode === 'without-note') {
    result = result.filter((c) => !state.notesMap[c.rowIndex]);
  }

  // Search filter
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

/**
 * Sanitize a raw LinkedIn cell value into a usable https:// URL.
 * Returns null if the value is blank, "NF", or unrecognisable.
 */
function sanitizeLinkedIn(raw) {
  if (!raw) return null;
  const t = raw.trim();

  // Known non-values
  const SKIP = ['nf', 'n/a', 'na', '-', '--', 'nil', 'none', 'null', 'not available', 'not found'];
  if (SKIP.includes(t.toLowerCase())) return null;

  // Already has a protocol
  if (/^https?:\/\//i.test(t)) return t;

  // Bare domain or path that contains any linkedin.com variant
  // e.g. linkedin.com/in/... | www.linkedin.com/in/... | in.linkedin.com/in/...
  if (/linkedin\.com/i.test(t)) return 'https://' + t;

  // Relative path like /in/username or in/username
  if (/^\/?in\//i.test(t)) return 'https://www.linkedin.com/' + t.replace(/^\//, '');

  return null; // unrecognised — don't render a broken link
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
        ${contact.company    ? `<div class="contact-company">${escapeHtml(contact.company)}</div>` : ''}
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

  if (!noteText) {
    showStatus(noteStatus, 'Note cannot be empty.', 'error');
    return;
  }

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
    // If filter is active re-apply so the card may hide/show
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
loadExcelList();
