import { storage } from './storage.js';
import { utils } from './utils.js';
import { ui } from './ui.js';

const App = {
    state: { editingId: null, currentPhotos: [] },

    init: async () => {
        ui.refreshElements();
        await storage.init();
        App.setupEventListeners();
        App.handleRouting();
        App.initFilters();
        await App.loadDashboardData();
        await App.loadSettings();
        ui.populateDatalists(await storage.getSuggestions());
    },

    loadSettings: async () => {
        const settings = await storage.getSettings();
        App.renderCyclesList(settings.cycles || []);
        App.updateActiveCycleBadge(settings.cycles || []);
    },

    renderCyclesList: (cycles) => {
        const container = document.getElementById('cycles-list'); if (!container) return;
        container.innerHTML = cycles.length === 0 ? '<p class="text-xs text-slate-400 italic text-center py-4">No cycles defined.</p>' : '';
        cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).forEach(c => {
            const div = document.createElement('div');
            div.className = 'p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group';
            div.innerHTML = `<div><p class="text-sm font-black text-slate-900">${c.name}</p><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${utils.formatDate(c.startDate)} ${c.endDate ? ' - ' + utils.formatDate(c.endDate) : '(Ongoing)'}</p></div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button class="btn-edit-cycle text-indigo-600 p-2">✏️</button><button class="btn-delete-cycle text-red-600 p-2">🗑️</button></div>`;
            div.querySelector('.btn-edit-cycle').onclick = () => App.openCycleForm(c);
            div.querySelector('.btn-delete-cycle').onclick = () => App.deleteCycle(c.id);
            container.appendChild(div);
        });
    },

    openCycleForm: (cycle = null) => {
        const form = document.getElementById('cycle-form'), id = document.getElementById('cycle-edit-id'), name = document.getElementById('cycle-name'), start = document.getElementById('cycle-start'), end = document.getElementById('cycle-end');
        if (!form) return; form.classList.remove('hidden');
        if (cycle) { id.value = cycle.id; name.value = cycle.name; start.value = cycle.startDate; end.value = cycle.endDate || ''; }
        else { id.value = ''; name.value = ''; start.value = new Date().toISOString().split('T')[0]; end.value = ''; }
    },

    saveCycle: async () => {
        const name = document.getElementById('cycle-name').value, start = document.getElementById('cycle-start').value, end = document.getElementById('cycle-end').value, id = document.getElementById('cycle-edit-id').value;
        if (!name || !start) return alert('Name and Start Date required.');
        const s = await storage.getSettings(); if (!s.cycles) s.cycles = [];
        if (id) { const idx = s.cycles.findIndex(c => c.id === id); if (idx !== -1) s.cycles[idx] = { id, name, startDate: start, endDate: end }; }
        else { s.cycles.push({ id: crypto.randomUUID(), name, startDate: start, endDate: end }); }
        await storage.saveSettings(s); document.getElementById('cycle-form').classList.add('hidden'); await App.loadSettings();
    },

    deleteCycle: async (id) => { if (confirm('Delete cycle?')) { const s = await storage.getSettings(); s.cycles = s.cycles.filter(c => c.id !== id); await storage.saveSettings(s); await App.loadSettings(); } },

    updateActiveCycleBadge: (cycles) => {
        const container = document.getElementById('cycle-badges-container'); if (!container) return; container.innerHTML = '';
        const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const active = cycles.filter(c => todayStr >= c.startDate && todayStr <= (c.endDate || '9999-12-31'));
        if (active.length === 0) { container.innerHTML = '<span class="px-4 py-2 rounded-2xl text-[11px] font-extrabold bg-slate-800 text-slate-500 border border-slate-700 uppercase tracking-widest shadow-sm">No Active Cycle</span>'; return; }
        active.forEach(a => {
            const startParts = a.startDate.split('-').map(Number);
            const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
            const diffTime = today.getTime() - startDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const b = document.createElement('span'); b.className = 'px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-[11px] md:text-[13px] font-black bg-indigo-600 text-white border border-indigo-500 uppercase tracking-widest shadow-lg shadow-indigo-900/20 whitespace-nowrap';
            b.textContent = `${a.name} Day ${diffDays}`; container.appendChild(b);
        });
    },

    handleRouting: async () => {
        const hash = window.location.hash || '#dashboard', { viewDashboard, viewHistory, viewInsights, viewSettings, navLinks } = ui.elements;
        const vT = document.getElementById('view-title'), vS = document.getElementById('view-subtitle');
        if (viewDashboard) viewDashboard.classList.toggle('hidden', hash !== '#dashboard');
        if (viewHistory) viewHistory.classList.toggle('hidden', hash !== '#history');
        if (viewInsights) viewInsights.classList.toggle('hidden', hash !== '#insights');
        if (viewSettings) viewSettings.classList.toggle('hidden', hash !== '#settings');
        if (vT && vS) {
            switch(hash) {
                case '#dashboard': vT.textContent = 'Today'; vS.textContent = utils.formatDate(new Date()); break;
                case '#history': vT.textContent = 'History'; vS.textContent = 'Clinical Journal'; break;
                case '#insights': vT.textContent = 'Insights'; vS.textContent = 'Trends & Analytics'; break;
                case '#settings': vT.textContent = 'Settings'; vS.textContent = 'Configuration'; break;
            }
        }
        navLinks.forEach(l => { const act = l.getAttribute('href') === hash; if (l.closest('#sidebar')) { l.classList.toggle('active-nav', act); l.classList.toggle('text-slate-400', !act); } else if (l.closest('#mobile-nav')) { l.classList.toggle('text-indigo-400', act); l.classList.toggle('text-slate-500', !act); } });
        if (hash === '#history') await App.renderHistory(); if (hash === '#dashboard') await App.loadDashboardData(); if (hash === '#insights') await App.renderInsights();
    },

    setupEventListeners: () => {
        window.addEventListener('hashchange', App.handleRouting);
        const { btnAddMobile, btnClose, btnSave, chips, form } = ui.elements;
        if (document.getElementById('tab-history-list')) document.getElementById('tab-history-list').onclick = () => App.switchHistoryTab('list');
        if (document.getElementById('tab-history-calendar')) document.getElementById('tab-history-calendar').onclick = () => App.switchHistoryTab('calendar');
        if (btnAddMobile) btnAddMobile.onclick = () => App.openModal(); if (btnClose) btnClose.onclick = App.closeModal;
        chips.forEach(c => c.onclick = () => { const s = document.querySelector(`section[data-id="${c.dataset.section}"]`); if (s) { s.classList.toggle('hidden'); c.classList.toggle('bg-indigo-100'); c.classList.toggle('border-indigo-300'); c.classList.toggle('text-indigo-900'); } });
        ['food', 'fluid', 'meds'].forEach(t => { const b = document.getElementById(`btn-add-${t}-item`); if (b) b.onclick = () => App.addItemRow(t); });
        if (document.getElementById('btn-seed-data')) document.getElementById('btn-seed-data').onclick = App.seedTestData;
        if (document.getElementById('btn-clear-test-data')) document.getElementById('btn-clear-test-data').onclick = App.clearTestData;
        if (document.getElementById('btn-add-cycle')) document.getElementById('btn-add-cycle').onclick = () => App.openCycleForm();
        if (document.getElementById('btn-save-cycle')) document.getElementById('btn-save-cycle').onclick = App.saveCycle;
        if (document.getElementById('btn-cancel-cycle')) document.getElementById('btn-cancel-cycle').onclick = () => document.getElementById('cycle-form').classList.add('hidden');
        if (form) form.oninput = App.validateForm; if (btnSave) btnSave.onclick = (e) => App.saveEntry(e);
        if (document.getElementById('btn-export-csv')) document.getElementById('btn-export-csv').onclick = App.exportToCSV;
        if (document.getElementById('btn-export-json')) document.getElementById('btn-export-json').onclick = App.exportToJSON;
        if (document.getElementById('input-import-json')) document.getElementById('input-import-json').onchange = (e) => App.importFromJSON(e);
        if (ui.elements.inputPhoto) ui.elements.inputPhoto.onchange = (e) => App.handlePhotoUpload(e);
    },

    handlePhotoUpload: async (e) => {
        const files = Array.from(e.target.files); if (App.state.currentPhotos.length >= 5) { alert('Max 5 photos allowed.'); return; }
        let added = 0; for (const f of files) { if (App.state.currentPhotos.length < 5) { const b64 = await App.resizeImage(f, 800, 800); App.state.currentPhotos.push(b64); added++; } }
        App.renderPhotoPreviews(); App.validateForm(); if (ui.elements.inputPhoto) ui.elements.inputPhoto.value = '';
    },

    resizeImage: (file, mW, mH) => {
        return new Promise(res => { const r = new FileReader(); r.onload = (e) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); let w = i.width, h = i.height; if (w > h) { if (w > mW) { h *= mW / w; w = mW; } } else { if (h > mH) { w *= mH / h; h = mH; } } c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.drawImage(i, 0, 0, w, h); res(c.toDataURL('image/jpeg', 0.7)); }; i.src = e.target.result; }; r.readAsDataURL(file); });
    },

    renderPhotoPreviews: () => {
        const c = ui.elements.photoPreviews; if (!c) return; c.innerHTML = '';
        App.state.currentPhotos.forEach((p, i) => { const d = document.createElement('div'); d.className = 'relative animate-in zoom-in duration-200'; d.innerHTML = `<img src="${p}" class="photo-preview"><button type="button" class="photo-remove">×</button>`; d.querySelector('.photo-remove').onclick = () => { App.state.currentPhotos.splice(i, 1); App.renderPhotoPreviews(); App.validateForm(); }; c.appendChild(d); });
    },

    seedTestData: async () => {
        const now = new Date(), y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0'), todayStr = `${y}-${m}-${d}`;
        const entries = [
            { timestamp: `${todayStr}T07:00`, source: 'generated', temp: 36.5, notes: "Morning check.", fluid_items: [{ label: "Water", value: 250, unit: "ml" }] },
            { timestamp: `${todayStr}T11:45`, source: 'generated', temp: 37.2, anc: 0.45, platelets: 42, wbc: 3.2, notes: "Blood work results." }
        ];
        for (const e of entries) await storage.saveEntry(e); alert("Seeded data!"); location.reload();
    },

    clearTestData: async () => { if (confirm("Clear test data?")) { await storage.deleteEntriesBySource('generated'); location.reload(); } },

    addItemRow: (type, data = null) => {
        const c = document.getElementById(`${type}-list-container`); if (!c) return;
        const item = data || { label: '', value: '', unit: type === 'food' ? 'g' : (type === 'fluid' ? 'ml' : 'mg') };
        const r = document.createElement('div'); r.className = `${type}-row p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3 relative group`;
        r.innerHTML = `<div class="space-y-1"><label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Name</label><input type="text" list="${type}_labels" name="${type}_label[]" value="${item.label}" class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold outline-none"></div>
            <div class="grid grid-cols-2 gap-3"><div><label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Value</label><input type="number" step="0.1" name="${type}_value[]" value="${item.value}" class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold outline-none"></div>
            <div><label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unit</label><input type="text" list="${type}_units" name="${type}_unit[]" value="${item.unit}" class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold outline-none"></div></div>
            <button type="button" class="btn-remove-item absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">×</button>`;
        r.querySelector('.btn-remove-item').onclick = () => { r.remove(); App.validateForm(); }; c.appendChild(r);
    },

    openModal: (entry = null) => {
        const { modal, modalTitle, timestamp, form, sections, chips } = ui.elements; if (!modal) return; modal.classList.remove('hidden');
        ['food', 'fluid', 'meds'].forEach(t => { const c = document.getElementById(`${t}-list-container`); if (c) c.innerHTML = ''; });
        if (entry && entry.id) {
            App.state.editingId = entry.id; App.state.currentPhotos = entry.photos || []; App.renderPhotoPreviews();
            modalTitle.textContent = 'Edit Record'; timestamp.value = entry.timestamp;
            form.querySelectorAll('input, textarea, select').forEach(i => {
                if (i.name.includes('[]') || i.id === 'input-photo') return; const v = entry[i.name]; if (v === undefined || v === null || v === "") return;
                if (i.type === 'checkbox') i.checked = v === true; else i.value = v;
                const s = i.closest('section'); if (s && s.dataset.id !== 'photos' && s.classList.contains('hidden')) { s.classList.remove('hidden'); const chip = document.querySelector(`.chip[data-section="${s.dataset.id}"]`); if (chip) chip.classList.add('bg-indigo-100', 'border-indigo-300', 'text-indigo-900'); }
            });
            ['food', 'fluid', 'meds'].forEach(t => { if (entry[`${t}_items`]?.length > 0) { entry[`${t}_items`].forEach(it => App.addItemRow(t, it)); const s = document.querySelector(`section[data-id="${t}"]`), c = document.querySelector(`.chip[data-section="${t}"]`); if (s) s.classList.remove('hidden'); if (c) c.classList.add('bg-indigo-100', 'border-indigo-300', 'text-indigo-900'); } });
            if (App.state.currentPhotos.length > 0) { const s = document.querySelector('section[data-id="photos"]'), c = document.querySelector('.chip[data-section="photos"]'); if (s) s.classList.remove('hidden'); if (c) c.classList.add('bg-indigo-100', 'border-indigo-300', 'text-indigo-900'); }
        } else { App.state.editingId = null; App.state.currentPhotos = []; App.renderPhotoPreviews(); modalTitle.textContent = 'Add Record'; timestamp.value = (entry && entry.timestamp) ? entry.timestamp : utils.getLocalISOString(); }
        App.validateForm();
    },

    closeModal: () => {
        const { modal, form, sections, chips, emergencyAlert } = ui.elements;
        if (modal) modal.classList.add('hidden'); if (form) form.reset();
        App.state.currentPhotos = []; sections.forEach(s => s.classList.add('hidden'));
        chips.forEach(c => c.classList.remove('bg-indigo-100', 'border-indigo-300', 'text-indigo-900'));
        if (emergencyAlert) emergencyAlert.classList.add('hidden');
        ['food', 'fluid', 'meds'].forEach(t => { const c = document.getElementById(`${t}-list-container`); if (c) c.innerHTML = ''; });
    },

    validateForm: () => {
        const formData = new FormData(ui.elements.form); let hasData = App.state.currentPhotos.length > 0;
        for (let [k, v] of formData.entries()) { if (v && v !== "" && k !== 'notes' && k !== 'timestamp') hasData = true; }
        if (ui.elements.btnSave) ui.elements.btnSave.disabled = !hasData;
        const t = parseFloat(formData.get('temp')), a = parseFloat(formData.get('anc')), isE = t >= 38.0 || (!isNaN(a) && a < 0.5);
        if (ui.elements.emergencyAlert) ui.elements.emergencyAlert.classList.toggle('hidden', !isE);
    },

    saveEntry: async (e) => {
        if (e) e.preventDefault(); const formData = new FormData(ui.elements.form);
        const entry = { timestamp: ui.elements.timestamp.value, notes: formData.get('notes'), source: 'manual', food_items: [], fluid_items: [], meds_items: [] };
        const activeS = Array.from(ui.elements.sections).filter(s => !s.classList.contains('hidden')).map(s => s.dataset.id);
        ui.elements.form.querySelectorAll('input, select, textarea').forEach(i => { if (i.name === 'notes' || !i.name || i.name.includes('[]')) return; const s = i.closest('section'); if (!s || activeS.includes(s.dataset.id)) { if (i.type === 'checkbox') entry[i.name] = i.checked; else if (i.type === 'number') entry[i.name] = i.value !== "" ? parseFloat(i.value) : null; else entry[i.name] = i.value; } });
        const suggP = []; ['food', 'fluid', 'meds'].forEach(t => { if (activeS.includes(t)) { const ls = document.querySelectorAll(`input[name="${t}_label[]"]`), vs = document.querySelectorAll(`input[name="${t}_value[]"]`), us = document.querySelectorAll(`input[name="${t}_unit[]"]`); ls.forEach((el, i) => { if (el.value.trim()) { entry[`${t}_items`].push({ label: el.value.trim(), value: parseFloat(vs[i].value) || 0, unit: us[i].value.trim() }); suggP.push(storage.addSuggestion(`${t}_labels`, el.value.trim())); suggP.push(storage.addSuggestion(`${t}_units`, us[i].value.trim())); } }); } });
        await Promise.all(suggP); entry.photos = App.state.currentPhotos;
        if (App.state.editingId) await storage.updateEntry(App.state.editingId, entry); else await storage.saveEntry(entry);
        ui.populateDatalists(await storage.getSuggestions()); App.closeModal(); await App.loadDashboardData();
        if (window.location.hash === '#history') await App.renderHistory();
    },

    loadDashboardData: async () => {
        const entries = await storage.getEntries();
        const now = new Date(), y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0'), todayStr = `${y}-${m}-${d}`;
        const todayEntries = entries.filter(e => e.timestamp.split('T')[0] === todayStr).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latestANC = entries.find(e => e.anc != null)?.anc, latestPLT = entries.find(e => e.platelets != null)?.platelets, latestWBC = entries.find(e => e.wbc != null)?.wbc;
        ui.updateBadge('anc', latestANC, 0.5, 'low'); ui.updateBadge('platelets', latestPLT, 50, 'low'); ui.updateBadge('wbc', latestWBC, 4.0, 'low');
        ui.elements.todayList.innerHTML = '';
        if (todayEntries.length === 0) ui.elements.todayEmpty.classList.remove('hidden');
        else { ui.elements.todayEmpty.classList.add('hidden'); todayEntries.forEach(e => ui.elements.todayList.appendChild(ui.createEntryCard(e, App.openModalById, App.handleDelete))); }
        const dateEl = document.getElementById('current-date'); if (dateEl) dateEl.textContent = utils.formatDate(new Date());
    },

    renderHistory: async () => {
        const entries = await storage.getEntries(), mEl = document.getElementById('filter-month'), yEl = document.getElementById('filter-year');
        if (!mEl || !yEl) return; const selM = parseInt(mEl.value), selY = parseInt(yEl.value);
        const filtered = entries.filter(e => { const d = new Date(e.timestamp); return d.getMonth() === selM && d.getFullYear() === selY; });
        const isJournal = document.getElementById('tab-history-list').classList.contains('bg-white');
        if (filtered.length === 0) { ui.elements.historyGroupedList.innerHTML = ''; ui.elements.historyEmpty.classList.toggle('hidden', !isJournal); }
        else { ui.elements.historyEmpty.classList.add('hidden'); ui.renderGroupedList(ui.elements.historyGroupedList, filtered, App.openModalById, App.handleDelete); }
        App.renderCalendar(filtered, selM, selY);
    },

    switchHistoryTab: (tab) => {
        const tabL = document.getElementById('tab-history-list'), tabC = document.getElementById('tab-history-calendar'), contL = document.getElementById('history-content-list'), contC = document.getElementById('history-content-calendar'), empty = document.getElementById('history-empty'), list = document.getElementById('history-grouped-list');
        const act = ['bg-white', 'text-indigo-600', 'shadow-sm'], inact = ['text-slate-500', 'hover:text-slate-700'];
        if (tab === 'list') { tabL.classList.add(...act); tabL.classList.remove(...inact); tabC.classList.add(...inact); tabC.classList.remove(...act); contL.classList.remove('hidden'); contC.classList.add('hidden'); if (empty) empty.classList.toggle('hidden', list.children.length > 0); }
        else { tabC.classList.add(...act); tabC.classList.remove(...inact); tabL.classList.add(...inact); tabL.classList.remove(...act); contC.classList.remove('hidden'); contL.classList.add('hidden'); if (empty) empty.classList.add('hidden'); }
    },

    renderCalendar: (entries, month, year) => {
        const grid = document.getElementById('calendar-grid'); if (!grid) return; grid.innerHTML = '';
        const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
        let offset = firstDay === 0 ? 6 : firstDay - 1; for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('div'));
        const tStr = utils.formatDate(new Date());
        for (let d = 1; d <= daysInMonth; d++) {
            const cellDate = new Date(year, month, d), dateKey = utils.formatDate(cellDate), dayEntries = entries.filter(e => utils.formatDate(e.timestamp) === dateKey), isT = utils.formatDate(cellDate) === tStr;
            const div = document.createElement('div'); div.className = `min-h-[4rem] md:min-h-[6rem] p-2 rounded-2xl md:rounded-[1.5rem] border transition-all flex flex-col items-center justify-start gap-1 cursor-pointer ${dayEntries.length > 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50/50 border-slate-100'} ${isT ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}`;
            div.innerHTML = `<span class="text-sm md:text-base font-black ${dayEntries.length > 0 ? 'text-indigo-600' : 'text-slate-400'}">${d}</span>${dayEntries.length > 0 ? `<div class="mt-auto mb-1"><span class="block w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.6)]"></span></div>` : ''}`;
            div.onclick = (e) => App.openCalendarContextMenu(e, cellDate, dayEntries.length > 0); grid.appendChild(div);
        }
    },

    openCalendarContextMenu: (event, date, hasEntries) => {
        event.preventDefault(); const menu = document.getElementById('calendar-context-menu'), title = document.getElementById('ctx-menu-date'), btnV = document.getElementById('btn-ctx-view'), btnA = document.getElementById('btn-ctx-add');
        if (!menu || !title) return; title.textContent = utils.formatDate(date); btnV.classList.toggle('hidden', !hasEntries); menu.classList.remove('hidden');
        let x = event.clientX, y = event.clientY; if (x + 192 > window.innerWidth) x -= 192; if (y + 140 > window.innerHeight) y -= 140;
        menu.style.left = `${x}px`; menu.style.top = `${y}px`;
        btnV.onclick = () => { menu.classList.add('hidden'); App.switchHistoryTab('list'); const target = Array.from(document.querySelectorAll('h3')).find(h => h.textContent === utils.formatDate(date)); if (target) { target.closest('details').open = true; target.closest('details').scrollIntoView({ behavior: 'smooth' }); } };
        btnA.onclick = () => { menu.classList.add('hidden'); const iso = utils.getLocalISOString(date), final = (utils.formatDate(date) === utils.formatDate(new Date())) ? utils.getLocalISOString() : `${iso.split('T')[0]}T12:00`; App.openModal({ timestamp: final }); };
        const close = (e) => { if (!menu.contains(e.target)) { menu.classList.add('hidden'); document.removeEventListener('mousedown', close); } }; setTimeout(() => document.addEventListener('mousedown', close), 10);
    },

    renderInsights: async () => {
        const entries = (await storage.getEntries()).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); if (entries.length === 0) return;
        const dailyData = {}; entries.forEach(e => { const date = e.timestamp.split('T')[0]; if (!dailyData[date]) dailyData[date] = { anc: null, platelets: null, fluids: 0, food: 0, weight: null, maxTemp: 0 }; if (e.anc != null) dailyData[date].anc = e.anc; if (e.platelets != null) dailyData[date].platelets = e.platelets; if (e.weight != null) dailyData[date].weight = e.weight; if (e.temp != null) dailyData[date].maxTemp = Math.max(dailyData[date].maxTemp, e.temp); e.fluid_items?.forEach(i => dailyData[date].fluids += i.value); e.food_items?.forEach(i => dailyData[date].food += i.value); });
        const scorecardContainer = document.getElementById('insights-scorecards'); if (scorecardContainer) {
            const allAnc = Object.values(dailyData).map(d => d.anc).filter(v => v !== null), lowestAnc = allAnc.length ? Math.min(...allAnc).toFixed(2) : '--';
            const allWeights = Object.values(dailyData).map(d => d.weight).filter(v => v !== null); let weightTrend = '--'; if (allWeights.length >= 2) { const diff = (allWeights[allWeights.length - 1] - allWeights[0]).toFixed(1); weightTrend = (diff > 0 ? '+' : '') + diff + 'kg'; }
            const feverDays = Object.values(dailyData).filter(d => d.maxTemp >= 38.0).length, avgFluid = (Object.values(dailyData).reduce((sum, d) => sum + d.fluids, 0) / Object.keys(dailyData).length).toFixed(0);
            scorecardContainer.innerHTML = `<div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 text-center"><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lowest ANC</p><p class="text-2xl font-black ${lowestAnc < 0.5 ? 'text-red-600' : 'text-indigo-600'}">${lowestAnc}</p></div><div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 text-center"><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Weight Change</p><p class="text-2xl font-black text-slate-900">${weightTrend}</p></div><div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 text-center"><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fever Days</p><p class="text-2xl font-black ${feverDays > 0 ? 'text-orange-500' : 'text-slate-900'}">${feverDays}</p></div><div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 text-center"><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Fluids</p><p class="text-2xl font-black text-blue-600">${avgFluid}<span class="text-xs ml-0.5 opacity-50">ml</span></p></div>`;
        }
        const dates = Object.keys(dailyData), labels = dates.map(d => utils.formatDate(d).split(' (')[0]);
        App.drawTrendChart('chart-anc', labels, Object.values(dailyData).map(d => d.anc), 'ANC', '#6366f1'); App.drawTrendChart('chart-platelets', labels, Object.values(dailyData).map(d => d.platelets), 'Platelets', '#3b82f6'); App.drawTrendChart('chart-temp', labels, Object.values(dailyData).map(d => d.maxTemp || null), 'Max Temp', '#ef4444'); App.drawTrendChart('chart-weight', labels, Object.values(dailyData).map(d => d.weight), 'Weight', '#64748b');
        const intakeC = document.getElementById('intake-summary-container'); if (intakeC) { const last3 = Object.entries(dailyData).reverse().slice(0, 3); intakeC.innerHTML = last3.map(([date, data]) => `<div class="p-5 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col gap-3"><p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${utils.formatDate(date)}</p><div class="flex justify-between items-end"><div><p class="text-[10px] font-bold text-blue-500 uppercase">Fluids</p><p class="text-xl font-black text-slate-900">${data.fluids.toFixed(0)}<span class="text-xs ml-0.5 text-slate-400">ml</span></p></div><div class="text-right"><p class="text-[10px] font-bold text-orange-500 uppercase">Food</p><p class="text-xl font-black text-slate-900">${data.food.toFixed(0)}<span class="text-xs ml-0.5 text-slate-400">g</span></p></div></div></div>`).join(''); }
    },

    drawTrendChart: (canvasId, labels, data, label, color) => {
        const ctx = document.getElementById(canvasId); if (!ctx) return; const existing = Chart.getChart(canvasId); if (existing) existing.destroy();
        new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [{ label: label, data: data, borderColor: color, backgroundColor: color + '20', borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#fff', pointBorderColor: color, pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, spanGaps: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', cornerRadius: 12, displayColors: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' } }, x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' }, color: '#94a3b8' } } } } });
    },

    handleDelete: async (id) => { if (confirm('Delete this record?')) { await storage.deleteEntry(id); await App.loadDashboardData(); if (window.location.hash === '#history') await App.renderHistory(); } },

    openModalById: async (id) => { const entries = await storage.getEntries(), entry = entries.find(e => e.id === id); if (entry) App.openModal(entry); },

    exportToCSV: async () => {
        const entries = await storage.getEntries(); if (entries.length === 0) return alert('No data.');
        let csv = 'Timestamp,Temp,ANC,Platelets,Urine,Stool,Vomit,Notes\n';
        entries.forEach(e => { csv += `"${e.timestamp}",${e.temp || ''},${e.anc || ''},${e.platelets || ''},${e.urine_out || ''},${e.stool_freq || ''},${e.vomit_count || ''},"${(e.notes || '').replace(/"/g, '""')}"\n`; });
        const blob = new Blob([csv], { type: 'text/csv' }), url = window.URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `export.csv`; a.click();
    },

    exportToJSON: async () => {
        const entries = await storage.getEntries(), settings = await storage.getSettings(), data = { entries, settings, date: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), url = window.URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `backup.json`; a.click();
    },

    importFromJSON: async (e) => {
        const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
        reader.onload = async (event) => { try { const data = JSON.parse(event.target.result); if (!data.entries) throw new Error('Invalid file'); if (confirm(`Import ${data.entries.length} records?`)) { for (const entry of data.entries) { await storage.saveEntry({ ...entry, source: 'import' }); } if (data.settings) await storage.saveSettings(data.settings); location.reload(); } } catch (err) { alert('Error: ' + err.message); } }; reader.readAsText(file);
    }
};

document.addEventListener('DOMContentLoaded', App.init);
