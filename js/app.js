import { storage } from './storage.js';
import { utils } from './utils.js';
import { ui } from './ui.js';

const App = {
    state: { editingId: null, currentPhotos: [], settings: null, chartRange: '1M' },

    init: async () => {
        ui.refreshElements();
        await storage.init();
        App.state.settings = await storage.getSettings();
        App.initFilters();
        App.setupEventListeners();
        App.handleRouting();
        await App.loadDashboardData();
        await App.loadSettings();
        ui.populateDatalists(await storage.getSuggestions());
    },

    loadSettings: async () => {
        const settings = await storage.getSettings();
        App.state.settings = settings;
        App.renderCyclesList(settings.cycles || []);
        App.updateActiveCycleBadge(settings.cycles || []);
        
        if (settings.emergency_thresholds) {
            Object.entries(settings.emergency_thresholds).forEach(([key, range]) => {
                const minEl = document.getElementById(`threshold-${key}-min`);
                const maxEl = document.getElementById(`threshold-${key}-max`);
                if (minEl) minEl.value = (range.min !== null && range.min !== undefined) ? range.min : '';
                if (maxEl) maxEl.value = (range.max !== null && range.max !== undefined) ? range.max : '';
            });
        }
    },

    saveThresholds: async () => {
        const s = await storage.getSettings();
        if (!s.emergency_thresholds) s.emergency_thresholds = {};
        
        ['temp', 'anc', 'platelets', 'hb', 'wbc', 'bp_sys'].forEach(key => {
            const minEl = document.getElementById(`threshold-${key}-min`);
            const maxEl = document.getElementById(`threshold-${key}-max`);
            if (minEl && maxEl) {
                s.emergency_thresholds[key] = {
                    min: minEl.value !== "" ? parseFloat(minEl.value) : null,
                    max: maxEl.value !== "" ? parseFloat(maxEl.value) : null
                };
            }
        });
        
        await storage.saveSettings(s);
        App.state.settings = s;
        alert('Thresholds saved!');
        await App.loadDashboardData();
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
        const form = document.getElementById('cycle-form'), id = document.getElementById('cycle-edit-id'), name = document.getElementById('cycle-name'), start = document.getElementById('cycle-start'), dur = document.getElementById('cycle-duration'), end = document.getElementById('cycle-end');
        if (!form) return; form.classList.remove('hidden');
        if (cycle) { id.value = cycle.id; name.value = cycle.name; start.value = cycle.startDate; end.value = cycle.endDate || ''; dur.value = ''; }
        else { id.value = ''; name.value = ''; start.value = new Date().toISOString().split('T')[0]; end.value = ''; dur.value = ''; }
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
                case '#dashboard': vT.textContent = 'Dashboard'; vS.textContent = utils.formatDate(new Date()); break;
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
        const { btnAddMobile, btnAddDesktop, btnClose, btnSave, chips, form } = ui.elements;
        if (document.getElementById('tab-history-list')) document.getElementById('tab-history-list').onclick = () => App.switchHistoryTab('list');
        if (document.getElementById('tab-history-calendar')) document.getElementById('tab-history-calendar').onclick = () => App.switchHistoryTab('calendar');
        if (btnAddMobile) btnAddMobile.onclick = () => App.openModal();
        if (btnAddDesktop) btnAddDesktop.onclick = () => App.openModal();
        if (btnClose) btnClose.onclick = App.closeModal;
        
        chips.forEach(c => c.onclick = () => {
            const sectionId = c.dataset.section;
            const s = document.querySelector(`section[data-id="${sectionId}"]`);
            if (s) {
                const isOpening = s.classList.contains('hidden');
                s.classList.toggle('hidden');
                c.classList.toggle('bg-indigo-100');
                c.classList.toggle('border-indigo-300');
                c.classList.toggle('text-indigo-900');
                if (isOpening && ['food', 'fluid', 'meds', 'event'].includes(sectionId)) {
                    const container = document.getElementById(`${sectionId}-list-container`);
                    if (container && container.children.length === 0) App.addItemRow(sectionId);
                }
            }
        });

        ['food', 'fluid', 'meds', 'event'].forEach(t => { const b = document.getElementById(`btn-add-${t}-item`); if (b) b.onclick = () => App.addItemRow(t); });
        if (document.getElementById('btn-seed-data')) document.getElementById('btn-seed-data').onclick = App.seedTestData;
        if (document.getElementById('btn-clear-test-data')) document.getElementById('btn-clear-test-data').onclick = App.clearTestData;
        if (document.getElementById('btn-add-cycle')) document.getElementById('btn-add-cycle').onclick = () => App.openCycleForm();
        if (document.getElementById('btn-save-cycle')) document.getElementById('btn-save-cycle').onclick = App.saveCycle;
        if (document.getElementById('btn-cancel-cycle')) document.getElementById('btn-cancel-cycle').onclick = () => document.getElementById('cycle-form').classList.add('hidden');
        if (document.getElementById('btn-save-thresholds')) document.getElementById('btn-save-thresholds').onclick = App.saveThresholds;
        
        // Cycle date calculation logic
        const cStart = document.getElementById('cycle-start'), cDur = document.getElementById('cycle-duration'), cEnd = document.getElementById('cycle-end');
        const updateCycleEnd = () => {
            if (cStart.value && cDur.value) {
                const start = new Date(cStart.value);
                start.setDate(start.getDate() + parseInt(cDur.value) - 1);
                cEnd.value = start.toISOString().split('T')[0];
            }
        };
        if (cStart) cStart.oninput = updateCycleEnd;
        if (cDur) cDur.oninput = updateCycleEnd;

        document.querySelectorAll('.btn-chart-range').forEach(btn => {
            btn.onclick = () => {
                App.state.chartRange = btn.dataset.range;
                App.renderInsights();
            };
        });

        if (form) form.oninput = App.validateForm; if (btnSave) btnSave.onclick = (e) => App.saveEntry(e);
        if (document.getElementById('btn-export-csv')) document.getElementById('btn-export-csv').onclick = App.exportToCSV;
        if (document.getElementById('btn-export-json')) document.getElementById('btn-export-json').onclick = App.exportToJSON;
        if (document.getElementById('input-import-json')) document.getElementById('input-import-json').onchange = (e) => App.importFromJSON(e);
        if (ui.elements.inputPhoto) ui.elements.inputPhoto.onchange = (e) => App.handlePhotoUpload(e);
    },

    initFilters: () => {
        const mF = document.getElementById('filter-month'), yF = document.getElementById('filter-year'), bP = document.getElementById('btn-prev-month'), bN = document.getElementById('btn-next-month');
        if (!mF || !yF) return;
        const now = new Date(); mF.value = now.getMonth(); const cY = now.getFullYear();
        yF.innerHTML = ''; for (let y = 2024; y <= cY + 1; y++) { const o = document.createElement('option'); o.value = y; o.textContent = y; yF.appendChild(o); }
        yF.value = cY; mF.onchange = () => App.renderHistory(); yF.onchange = () => App.renderHistory();
        if (bP) bP.onclick = () => App.changeMonth(-1); if (bN) bN.onclick = () => App.changeMonth(1);
    },

    changeMonth: async (delta) => {
        const mF = document.getElementById('filter-month'), yF = document.getElementById('filter-year'); if (!mF || !yF) return;
        let m = parseInt(mF.value) + delta, y = parseInt(yF.value);
        if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
        const yO = Array.from(yF.options).find(o => parseInt(o.value) === y);
        if (yO) { mF.value = m; yF.value = y; await App.renderHistory(); }
    },

    handlePhotoUpload: async (e) => {
        const files = Array.from(e.target.files); if (App.state.currentPhotos.length >= 5) { alert('Max 5 photos allowed.'); return; }
        for (const f of files) { if (App.state.currentPhotos.length < 5) { const b64 = await App.resizeImage(f, 800, 800); App.state.currentPhotos.push(b64); } }
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
        const entries = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(); date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            entries.push(
                { timestamp: `${dateStr}T07:00`, source: 'generated', temp: (36.2 + Math.random() * 0.8).toFixed(1), notes: "Morning check.", fluid_items: [{ label: "Water", value: 250, unit: "ml" }] },
                { timestamp: `${dateStr}T11:45`, source: 'generated', temp: (36.5 + Math.random() * 1.0).toFixed(1), anc: (0.1 + Math.random() * 2).toFixed(2), platelets: Math.floor(20 + Math.random() * 200), wbc: (1 + Math.random() * 5).toFixed(1), notes: "Daily blood work." }
            );
        }
        for (const e of entries) await storage.saveEntry(e); alert("Seeded 7 days of test data!"); location.reload();
    },

    clearTestData: async () => { if (confirm("Clear test data?")) { await storage.deleteEntriesBySource('generated'); location.reload(); } },

    addItemRow: (type, data = null) => {
        const c = document.getElementById(`${type}-list-container`); if (!c) return;
        const item = data || (type === 'event' ? { label: '', remarks: '' } : { label: '', value: '', unit: type === 'food' ? 'g' : (type === 'fluid' ? 'ml' : 'mg') });
        const r = document.createElement('div'); r.className = `${type}-row p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3 relative group`;
        if (type === 'event') {
            r.innerHTML = `<div class="space-y-1"><label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Event Name</label><input type="text" list="event_labels" name="event_label[]" value="${item.label}" class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold outline-none"></div>
                <div class="space-y-1"><label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Remarks</label><textarea name="event_remarks[]" class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold outline-none" rows="3">${item.remarks || ''}</textarea></div>
                <button type="button" class="btn-remove-item absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">×</button>`;
        } else {
            r.innerHTML = `<div class="space-y-1"><label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Name</label><input type="text" list="${type}_labels" name="${type}_label[]" value="${item.label}" class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold outline-none"></div>
                <div class="grid grid-cols-2 gap-3"><div><label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Value</label><input type="number" step="0.1" name="${type}_value[]" value="${item.value}" class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold outline-none"></div>
                <div><label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unit</label><input type="text" list="${type}_units" name="${type}_unit[]" value="${item.unit}" class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-sm font-bold outline-none"></div></div>
                <button type="button" class="btn-remove-item absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">×</button>`;
        }
        r.querySelector('.btn-remove-item').onclick = () => { r.remove(); App.validateForm(); }; c.appendChild(r);
    },

    openModal: (entry = null) => {
        const { modal, modalTitle, timestamp, form, sections, chips } = ui.elements; if (!modal) return; modal.classList.remove('hidden');
        ['food', 'fluid', 'meds', 'event'].forEach(t => { const c = document.getElementById(`${t}-list-container`); if (c) c.innerHTML = ''; });
        if (entry && entry.id) {
            App.state.editingId = entry.id; App.state.currentPhotos = entry.photos || []; App.renderPhotoPreviews();
            modalTitle.textContent = 'Edit Record'; timestamp.value = entry.timestamp;
            form.querySelectorAll('input, textarea, select').forEach(i => {
                if (i.name.includes('[]') || i.id === 'input-photo') return; const v = entry[i.name]; if (v === undefined || v === null || v === "") return;
                if (i.type === 'checkbox') i.checked = v === true; else i.value = v;
                const s = i.closest('section'); if (s && s.dataset.id !== 'photos' && s.classList.contains('hidden')) { s.classList.remove('hidden'); const chip = document.querySelector(`.chip[data-section="${s.dataset.id}"]`); if (chip) chip.classList.add('bg-indigo-100', 'border-indigo-300', 'text-indigo-900'); }
            });
            ['food', 'fluid', 'meds', 'event'].forEach(t => { if (entry[`${t}_items`]?.length > 0) { entry[`${t}_items`].forEach(it => App.addItemRow(t, it)); const s = document.querySelector(`section[data-id="${t}"]`), c = document.querySelector(`.chip[data-section="${t}"]`); if (s) s.classList.remove('hidden'); if (c) c.classList.add('bg-indigo-100', 'border-indigo-300', 'text-indigo-900'); } });
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
        ['food', 'fluid', 'meds', 'event'].forEach(t => { const c = document.getElementById(`${t}-list-container`); if (c) c.innerHTML = ''; });
        App.loadDashboardData();
    },

    validateForm: () => {
        const formData = new FormData(ui.elements.form); let hasData = App.state.currentPhotos.length > 0;
        for (let [k, v] of formData.entries()) { if (v && v !== "" && k !== 'notes' && k !== 'timestamp') hasData = true; }
        if (ui.elements.btnSave) ui.elements.btnSave.disabled = !hasData;
        const thresholds = App.state.settings?.emergency_thresholds, problematic = [];
        if (thresholds) {
            const metrics = { temp: 'Temperature', anc: 'ANC', platelets: 'Platelets', hb: 'Hb', wbc: 'WBC', bp_sys: 'BP Systolic' };
            Object.entries(metrics).forEach(([key, label]) => {
                const val = parseFloat(formData.get(key));
                if (!isNaN(val)) {
                    const t = thresholds[key];
                    if (t) {
                        if (t.min !== null && t.min !== undefined && t.min !== '' && val < t.min) problematic.push(label);
                        else if (t.max !== null && t.max !== undefined && t.max !== '' && val >= t.max) problematic.push(label);
                    }
                }
            });
        }
        if (ui.elements.emergencyAlert) {
            const isE = problematic.length > 0; ui.elements.emergencyAlert.classList.toggle('hidden', !isE);
            const reasonEl = document.getElementById('emergency-reason'); if (reasonEl && isE) reasonEl.textContent = `Critical threshold exceeded: ${problematic.join(', ')}. Contact medical team.`;
        }
    },

    saveEntry: async (e) => {
        if (e) e.preventDefault(); const formData = new FormData(ui.elements.form);
        const entry = { timestamp: ui.elements.timestamp.value, notes: formData.get('notes'), source: 'manual', food_items: [], fluid_items: [], meds_items: [], event_items: [] };
        const activeS = Array.from(ui.elements.sections).filter(s => !s.classList.contains('hidden')).map(s => s.dataset.id);
        ui.elements.form.querySelectorAll('input, select, textarea').forEach(i => { if (i.name === 'notes' || !i.name || i.name.includes('[]')) return; const s = i.closest('section'); if (!s || activeS.includes(s.dataset.id)) { if (i.type === 'checkbox') entry[i.name] = i.checked; else if (i.type === 'number') entry[i.name] = i.value !== "" ? parseFloat(i.value) : null; else entry[i.name] = i.value; } });
        const suggP = [];
        ['food', 'fluid', 'meds'].forEach(t => { if (activeS.includes(t)) { const ls = document.querySelectorAll(`input[name="${t}_label[]"]`), vs = document.querySelectorAll(`input[name="${t}_value[]"]`), us = document.querySelectorAll(`input[name="${t}_unit[]"]`); ls.forEach((el, i) => { if (el.value.trim()) { entry[`${t}_items`].push({ label: el.value.trim(), value: parseFloat(vs[i].value) || 0, unit: us[i].value.trim() }); suggP.push(storage.addSuggestion(`${t}_labels`, el.value.trim())); suggP.push(storage.addSuggestion(`${t}_units`, us[i].value.trim())); } }); } });
        if (activeS.includes('event')) {
            const ls = document.querySelectorAll('input[name="event_label[]"]'), rs = document.querySelectorAll('textarea[name="event_remarks[]"]');
            ls.forEach((el, i) => { if (el.value.trim()) { entry.event_items.push({ label: el.value.trim(), remarks: rs[i].value.trim() }); suggP.push(storage.addSuggestion('event_labels', el.value.trim())); } });
        }
        await Promise.all(suggP); entry.photos = App.state.currentPhotos;
        if (App.state.editingId) await storage.updateEntry(App.state.editingId, entry); else await storage.saveEntry(entry);
        ui.populateDatalists(await storage.getSuggestions()); App.closeModal(); await App.loadDashboardData();
        if (window.location.hash === '#history') await App.renderHistory();
    },

    loadDashboardData: async () => {
        const entries = await storage.getEntries();
        const sortedEntries = [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const now = new Date(), todayStr = now.toISOString().split('T')[0];
        const todayEntries = entries.filter(e => e.timestamp.split('T')[0] === todayStr).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latestANC = sortedEntries.find(e => e.anc != null)?.anc, latestPLT = sortedEntries.find(e => e.platelets != null)?.platelets, latestWBC = sortedEntries.find(e => e.wbc != null)?.wbc;
        const thresholds = App.state.settings?.emergency_thresholds;
        ui.updateBadge('anc', latestANC, thresholds?.anc); ui.updateBadge('platelets', latestPLT, thresholds?.platelets); ui.updateBadge('wbc', latestWBC, thresholds?.wbc);
        let totalWater = 0, pooCount = 0, peeCount = 0;
        todayEntries.forEach(e => { e.fluid_items?.forEach(fi => { if (fi.label.toLowerCase().includes('water')) totalWater += fi.value; }); if (e.stool_freq != null || e.stool_type) pooCount++; if (e.urine_out != null || e.urine_color) peeCount++; });
        const waterEl = document.getElementById('today-water'), pooEl = document.getElementById('today-poo'), peeEl = document.getElementById('today-pee');
        if (waterEl) waterEl.textContent = totalWater.toFixed(0); if (pooEl) pooEl.textContent = pooCount; if (peeEl) peeEl.textContent = peeCount;
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
        const allEntries = (await storage.getEntries()).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const settings = await storage.getSettings();
        let filteredEntries = [...allEntries];
        const now = new Date();
        if (App.state.chartRange !== 'Max') {
            const rangeDays = { '7D': 7, '14D': 14, '1M': 30, '6M': 180 }, cutoff = new Date();
            if (App.state.chartRange === 'YTD') { cutoff.setMonth(0, 1); cutoff.setHours(0, 0, 0, 0); }
            else { cutoff.setDate(now.getDate() - rangeDays[App.state.chartRange]); }
            filteredEntries = allEntries.filter(e => new Date(e.timestamp) >= cutoff);
        }
        document.querySelectorAll('.btn-chart-range').forEach(btn => {
            const active = btn.dataset.range === App.state.chartRange;
            btn.className = active ? 'btn-chart-range px-3 py-1.5 rounded-lg text-[10px] font-black transition-all bg-white text-indigo-600 shadow-sm' : 'btn-chart-range px-3 py-1.5 rounded-lg text-[10px] font-black transition-all text-slate-400 hover:text-slate-600 active:scale-95';
        });
        const dEE = document.getElementById('insight-days-elapsed'), dRE = document.getElementById('insight-days-remaining');
        if (dEE && dRE) {
            const cycles = settings.cycles || [];
            if (cycles.length === 0) { dEE.textContent = '--'; dRE.textContent = '--'; }
            else {
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startDates = cycles.map(c => { const p = c.startDate.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); });
                const minS = new Date(Math.min(...startDates)), eD = Math.max(0, Math.floor((today.getTime() - minS.getTime()) / 86400000) + 1);
                dEE.textContent = eD;
                const endDates = cycles.filter(c => c.endDate).map(c => { const p = c.endDate.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); });
                if (endDates.length === 0) dRE.textContent = '--';
                else { const maxE = new Date(Math.max(...endDates)), rD = Math.max(0, Math.ceil((maxE.getTime() - today.getTime()) / 86400000)); dRE.textContent = rD; }
            }
        }
        if (allEntries.length === 0) return;
        const dailyData = {};
        filteredEntries.forEach(e => {
            const d = e.timestamp.split('T')[0];
            if (!dailyData[d]) dailyData[d] = { anc: null, platelets: null, wbc: null, hb: null, fluids: 0, food: 0, weight: null, height: null, maxTemp: 0 };
            if (e.anc != null) dailyData[d].anc = e.anc; if (e.platelets != null) dailyData[d].platelets = e.platelets; if (e.wbc != null) dailyData[d].wbc = e.wbc; if (e.hb != null) dailyData[d].hb = e.hb;
            if (e.weight != null) dailyData[d].weight = e.weight; if (e.height != null) dailyData[d].height = e.height; if (e.temp != null) dailyData[d].maxTemp = Math.max(dailyData[d].maxTemp, e.temp);
            e.fluid_items?.forEach(i => dailyData[d].fluids += i.value); e.food_items?.forEach(i => dailyData[d].food += i.value);
        });
        const dates = Object.keys(dailyData), labels = dates.map(d => utils.formatDate(d).split(' (')[0]);
        const draw = (id, cfg) => { const ctx = document.getElementById(id); if (ctx) { const ex = Chart.getChart(id); if (ex) ex.destroy(); new Chart(ctx, cfg); } };
        draw('chart-blood-profile', { type: 'line', data: { labels, datasets: [ { label: 'ANC', data: dates.map(d => dailyData[d].anc), borderColor: '#6366f1', backgroundColor: '#6366f120', borderWidth: 3, tension: 0.4, pointRadius: 3, spanGaps: true, yAxisID: 'y' }, { label: 'WBC', data: dates.map(d => dailyData[d].wbc), borderColor: '#8b5cf6', backgroundColor: '#8b5cf620', borderWidth: 3, tension: 0.4, pointRadius: 3, spanGaps: true, yAxisID: 'y' }, { label: 'HB', data: dates.map(d => dailyData[d].hb), borderColor: '#10b981', backgroundColor: '#10b98120', borderWidth: 3, tension: 0.4, pointRadius: 3, spanGaps: true, yAxisID: 'y' }, { label: 'PLT', data: dates.map(d => dailyData[d].platelets), borderColor: '#3b82f6', backgroundColor: '#3b82f620', borderWidth: 3, tension: 0.4, pointRadius: 3, spanGaps: true, yAxisID: 'y1' } ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } } }, scales: { y: { type: 'linear', position: 'left', beginAtZero: true, title: { display: true, text: 'ANC/WBC/HB', font: { size: 10, weight: 'bold' } } }, y1: { type: 'linear', position: 'right', beginAtZero: true, title: { display: true, text: 'PLT', font: { size: 10, weight: 'bold' } }, grid: { drawOnChartArea: false } }, x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } } } } });
        const bpD = {}; filteredEntries.forEach(e => { const d = e.timestamp.split('T')[0]; if (!bpD[d]) bpD[d] = { sys: null, dia: null }; if (e.bp_sys != null) bpD[d].sys = Math.max(bpD[d].sys || 0, e.bp_sys); if (e.bp_dia != null) bpD[d].dia = Math.max(bpD[d].dia || 0, e.bp_dia); });
        const bpL = Object.keys(bpD).map(d => utils.formatDate(d).split(' (')[0]);
        draw('chart-blood-pressure', { type: 'bar', data: { labels: bpL, datasets: [ { label: 'Range', data: Object.values(bpD).map(d => (d.sys && d.dia) ? [d.dia, d.sys] : null), backgroundColor: '#f43f5e', borderRadius: 4, borderSkipped: false, barPercentage: 0.4, z: 0 }, { label: 'SYS', type: 'line', data: Object.values(bpD).map(d => d.sys), borderColor: '#ef4444', borderWidth: 2, tension: 0.4, pointRadius: 2, spanGaps: true, z: 10 }, { label: 'DIA', type: 'line', data: Object.values(bpD).map(d => d.dia), borderColor: '#f87171', borderWidth: 2, tension: 0.4, pointRadius: 2, spanGaps: true, z: 10 } ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } } }, scales: { y: { beginAtZero: false, min: 40, max: 180, title: { display: true, text: 'mmHg', font: { size: 10, weight: 'bold' } } }, x: { grid: { display: false } } } } });
        const outD = {}; filteredEntries.forEach(e => { const d = e.timestamp.split('T')[0]; if (!outD[d]) outD[d] = { poo: 0, pee: 0 }; if (e.stool_freq != null || e.stool_type) outD[d].poo++; if (e.urine_out != null || e.urine_color) outD[d].pee++; });
        draw('chart-output-log', { type: 'bar', data: { labels: Object.keys(outD).map(d => utils.formatDate(d).split(' (')[0]), datasets: [ { label: 'Poo', data: Object.values(outD).map(d => d.poo), backgroundColor: '#78350f', borderRadius: 6 }, { label: 'Pee', data: Object.values(outD).map(d => d.pee), backgroundColor: '#f59e0b', borderRadius: 6 } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } } });
        const fluD = {}; filteredEntries.forEach(e => { const d = e.timestamp.split('T')[0]; if (!fluD[d]) fluD[d] = 0; e.fluid_items?.forEach(fi => { if (fi.unit?.toLowerCase() === 'ml') fluD[d] += (fi.value || 0); }); });
        draw('chart-fluid-log', { type: 'bar', data: { labels: Object.keys(fluD).map(d => utils.formatDate(d).split(' (')[0]), datasets: [ { label: 'Fluids (ml)', data: Object.values(fluD), backgroundColor: '#3b82f6', borderRadius: 6 } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } } });
        draw('chart-weight-progression', { type: 'line', data: { labels, datasets: [ { label: 'Weight (kg)', data: dates.map(d => dailyData[d].weight), borderColor: '#64748b', backgroundColor: '#64748b20', borderWidth: 3, tension: 0.4, fill: true, pointRadius: 4, spanGaps: true, yAxisID: 'y' }, { label: 'Height (cm)', data: dates.map(d => dailyData[d].height), borderColor: '#10b981', borderWidth: 3, tension: 0, borderDash: [5, 5], pointRadius: 4, spanGaps: true, yAxisID: 'y1' } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { type: 'linear', position: 'left', beginAtZero: false, title: { display: true, text: 'kg' } }, y1: { type: 'linear', position: 'right', beginAtZero: false, title: { display: true, text: 'cm' }, grid: { drawOnChartArea: false } }, x: { grid: { display: false } } } } });
        const allEvs = []; allEntries.forEach(e => e.event_items?.forEach(ei => allEvs.push({ ...ei, timestamp: e.timestamp })));
        allEvs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const evL = document.getElementById('insights-events-list');
        if (evL) { if (allEvs.length === 0) evL.innerHTML = '<p class="p-8 text-center text-xs font-bold text-slate-400 italic">No events.</p>'; else evL.innerHTML = allEvs.map(ev => `<details class="group border-slate-50"><summary class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors list-none"><div class="grid grid-cols-2 w-full items-center"><div class="flex flex-col"><span class="text-xs font-black text-slate-900">${utils.formatDate(ev.timestamp).split(' (')[0]}</span><span class="text-[10px] font-bold text-slate-400">${ev.timestamp.split('T')[1]}</span></div><span class="text-xs font-black text-purple-600">${ev.label}</span></div><span class="text-slate-300 group-open:rotate-180 transition-transform">▼</span></summary><div class="px-4 pb-4 pt-2 bg-purple-50/30"><p class="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1">Remarks</p><p class="text-xs font-medium text-slate-700 whitespace-pre-wrap">${ev.remarks || 'None.'}</p></div></details>`).join(''); }
    },

    handleDelete: async (id) => { if (confirm('Delete?')) { await storage.deleteEntry(id); await App.loadDashboardData(); if (window.location.hash === '#history') await App.renderHistory(); } },
    openModalById: async (id) => { const entries = await storage.getEntries(), entry = entries.find(e => e.id === id); if (entry) App.openModal(entry); },
    exportToCSV: async () => { const entries = await storage.getEntries(); if (entries.length === 0) return alert('No data.'); let csv = 'Timestamp,Temp,ANC,Platelets,Urine,Stool,Vomit,Events,Notes\n'; entries.forEach(e => { const evs = (e.event_items || []).map(ei => `${ei.label}: ${ei.remarks.replace(/\n/g, ' ')}`).join(' | '); csv += `"${e.timestamp}",${e.temp || ''},${e.anc || ''},${e.platelets || ''},${e.urine_out || ''},${e.stool_freq || ''},${e.vomit_count || ''},"${evs.replace(/"/g, '""')}","${(e.notes || '').replace(/"/g, '""')}"\n`; }); const blob = new Blob([csv], { type: 'text/csv' }), url = window.URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `export.csv`; a.click(); },
    exportToJSON: async () => { const entries = await storage.getEntries(), settings = await storage.getSettings(), data = { entries, settings, date: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), url = window.URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `backup.json`; a.click(); },
    importFromJSON: async (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async (event) => { try { const data = JSON.parse(event.target.result); if (!data.entries) throw new Error('Invalid file'); if (confirm(`Import ${data.entries.length} records?`)) { for (const entry of data.entries) { await storage.saveEntry({ ...entry, source: 'import' }); } if (data.settings) await storage.saveSettings(data.settings); location.reload(); } } catch (err) { alert('Error: ' + err.message); } }; reader.readAsText(file); }
};

document.addEventListener('DOMContentLoaded', App.init);
window.App = App;
window.storage = storage;
window.ui = ui;
