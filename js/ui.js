/**
 * UI & Rendering Module
 */
import { utils } from './utils.js';

export const ui = {
    elements: {
        modal: document.getElementById('modal-entry'),
        modalTitle: document.getElementById('modal-title'),
        form: document.getElementById('entry-form'),
        btnAddMobile: document.getElementById('btn-add-entry-mobile'),
        btnClose: document.getElementById('btn-close-modal'),
        btnSave: document.getElementById('btn-save-entry'),
        chips: document.querySelectorAll('.chip'),
        sections: document.querySelectorAll('section[data-id]'),
        emergencyAlert: document.getElementById('emergency-alert'),
        timestamp: document.getElementById('entry-timestamp'),
        viewDashboard: document.getElementById('view-dashboard'),
        viewHistory: document.getElementById('view-history'),
        viewInsights: document.getElementById('view-insights'),
        viewSettings: document.getElementById('view-settings'),
        navLinks: document.querySelectorAll('nav a'),
        todayList: document.getElementById('today-list'),
        todayEmpty: document.getElementById('today-empty'),
        historyGroupedList: document.getElementById('history-grouped-list'),
        historyEmpty: document.getElementById('history-empty'),
        tabList: document.getElementById('tab-history-list'),
        tabCalendar: document.getElementById('tab-history-calendar'),
        contentList: document.getElementById('history-content-list'),
        contentCalendar: document.getElementById('history-content-calendar'),
        calendarGrid: document.getElementById('calendar-grid'),
        inputPhoto: document.getElementById('input-photo'),
        photoPreviews: document.getElementById('photo-previews'),
        viewTitle: document.getElementById('view-title'),
        viewSubtitle: document.getElementById('view-subtitle'),
        cycleBadges: document.getElementById('cycle-badges-container'),
        cycleBadgesMobile: document.getElementById('cycle-badges-container-mobile')
    },

    refreshElements: () => {
        ui.elements.modal = document.getElementById('modal-entry');
        ui.elements.modalTitle = document.getElementById('modal-title');
        ui.elements.form = document.getElementById('entry-form');
        ui.elements.btnAddMobile = document.getElementById('btn-add-entry-mobile');
        ui.elements.btnClose = document.getElementById('btn-close-modal');
        ui.elements.btnSave = document.getElementById('btn-save-entry');
        ui.elements.chips = document.querySelectorAll('.chip');
        ui.elements.sections = document.querySelectorAll('section[data-id]');
        ui.elements.emergencyAlert = document.getElementById('emergency-alert');
        ui.elements.timestamp = document.getElementById('entry-timestamp');
        ui.elements.viewDashboard = document.getElementById('view-dashboard');
        ui.elements.viewHistory = document.getElementById('view-history');
        ui.elements.viewInsights = document.getElementById('view-insights');
        ui.elements.viewSettings = document.getElementById('view-settings');
        ui.elements.navLinks = document.querySelectorAll('nav a');
        ui.elements.todayList = document.getElementById('today-list');
        ui.elements.todayEmpty = document.getElementById('today-empty');
        ui.elements.historyGroupedList = document.getElementById('history-grouped-list');
        ui.elements.historyEmpty = document.getElementById('history-empty');
        ui.elements.tabList = document.getElementById('tab-history-list');
        ui.elements.tabCalendar = document.getElementById('tab-history-calendar');
        ui.elements.contentList = document.getElementById('history-content-list');
        ui.elements.contentCalendar = document.getElementById('history-content-calendar');
        ui.elements.calendarGrid = document.getElementById('calendar-grid');
        ui.elements.inputPhoto = document.getElementById('input-photo');
        ui.elements.photoPreviews = document.getElementById('photo-previews');
        ui.elements.viewTitle = document.getElementById('view-title');
        ui.elements.viewSubtitle = document.getElementById('view-subtitle');
        ui.elements.cycleBadges = document.getElementById('cycle-badges-container');
        ui.elements.cycleBadgesMobile = document.getElementById('cycle-badges-container-mobile');
    },

    updateBadge: (id, value, thresholds) => {
        const valEl = document.getElementById(`today-${id}`);
        const badgeEl = document.getElementById(`badge-${id}`);
        if (!valEl) return;

        if (value == null) {
            valEl.textContent = '--';
            valEl.className = 'text-xl md:text-3xl font-black text-slate-300 tracking-tighter';
            badgeEl.classList.add('hidden');
        } else {
            valEl.textContent = typeof value === 'number' ? value.toFixed(1) : value;
            badgeEl.classList.remove('hidden');
            let isDanger = false;
            if (thresholds) {
                if (thresholds.min !== null && thresholds.min !== undefined && thresholds.min !== '' && value < thresholds.min) isDanger = true;
                if (thresholds.max !== null && thresholds.max !== undefined && thresholds.max !== '' && value >= thresholds.max) isDanger = true;
            }
            valEl.className = `text-xl md:text-3xl font-black tracking-tighter ${isDanger ? 'text-red-600' : 'text-indigo-600'}`;
        }
    },

    createEntryCard: (entry, onEdit, onDelete) => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-[2rem] shadow-lg border border-slate-200/60 overflow-hidden mb-6 transition-all hover:shadow-xl last:mb-0';
        
        const catMap = {
            vitals: { icon: '🌡️', fields: { temp: 'Temp', weight: 'Weight', hr: 'HR', bp_sys: 'BP Sys', bp_dia: 'BP Dia', spo2: 'SpO2' } },
            blood: { icon: '🩸', fields: { anc: 'ANC', platelets: 'PLT', wbc: 'WBC', hb: 'Hb' } },
            meds: { icon: '💊', name: 'Meds', fields: {}, count: entry.meds_items?.length || 0 },
            food: { icon: '🍲', name: 'Food', fields: {}, count: entry.food_items?.length || 0 },
            fluid: { icon: '💧', name: 'Fluid', fields: {}, count: entry.fluid_items?.length || 0 },
            poopee: { icon: '🚽', fields: { urine_out: 'Urine Vol', urine_color: 'Urine Color', stool_freq: 'Stool', stool_type: 'Stool Type', vomit_count: 'Vomit' } },
            photos: { icon: '📸', fields: {} }
        };

        let groupsHtml = '';
        Object.entries(catMap).forEach(([id, cat]) => {
            let dataInCat = Object.entries(cat.fields)
                .filter(([key]) => entry[key] !== undefined && entry[key] !== null && entry[key] !== "")
                .map(([key, label]) => {
                    let val = entry[key];
                    if (typeof val === 'number') val = val.toFixed(1);
                    if (key === 'temp') val += '°C';
                    if (key === 'weight') val += 'kg';
                    if (key === 'urine_out') val += 'ml';
                    if (key === 'stool_freq') val += 'g';
                    if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
                    if (typeof val === 'string' && val.length > 0) val = val.charAt(0).toUpperCase() + val.slice(1);
                    return `<div class="flex flex-col"><span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${label}</span><span class="text-xs font-black text-slate-700">${val}</span></div>`;
                });

            if (id === 'photos' && entry.photos?.length > 0) {
                const photosHtml = entry.photos.map(p => `<img src="${p}" class="w-full aspect-square object-cover rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:opacity-90 transition-opacity" onclick="window.open('${p}')">`).join('');
                groupsHtml += `
                    <div class="p-5 border-t border-slate-50 flex flex-col gap-4 bg-white">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0">📸</div>
                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Clinical Photos</span>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${photosHtml}</div>
                    </div>
                `;
                return;
            }

            ['meds', 'food', 'fluid'].forEach(type => {
                if (id === type && entry[`${type}_items`]?.length > 0) {
                    dataInCat = [...dataInCat, ...entry[`${type}_items`].map(item => {
                        const val = typeof item.value === 'number' ? item.value.toFixed(1) : item.value;
                        return `
                            <div class="flex flex-col">
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${item.label}</span>
                                <span class="text-xs font-black text-slate-700">${val}${item.unit}</span>
                            </div>
                        `;
                    })];
                }
            });

            if (dataInCat.length > 0) {
                groupsHtml += `
                    <div class="p-5 border-t border-slate-50 flex gap-4 bg-white">
                        <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0">${cat.icon}</div>
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3 flex-1">${dataInCat.join('')}</div>
                    </div>
                `;
            }
        });

        const sourceHtml = entry.source && entry.source !== 'manual' ? `
            <span class="ml-2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${entry.source === 'generated' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}">
                ${entry.source}
            </span>
        ` : '';

        div.innerHTML = `
            <div class="flex justify-between items-center p-5 bg-white">
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.4)]"></div>
                    <p class="text-sm font-black text-slate-900">${utils.formatTime(entry.timestamp)}${sourceHtml}</p>
                </div>
                <div class="flex gap-1">
                    <button class="btn-edit p-2 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                    <button class="btn-delete p-2 text-slate-400 hover:text-red-600 rounded-xl transition-all"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 2 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>
            </div>
            ${entry.notes ? `<div class="px-5 pb-5"><p class="text-[15px] leading-relaxed font-medium text-slate-700 whitespace-pre-wrap">${entry.notes}</p></div>` : ''}
            ${groupsHtml}
        `;

        div.querySelector('.btn-edit').onclick = () => onEdit(entry.id);
        div.querySelector('.btn-delete').onclick = () => onDelete(entry.id);
        return div;
    },

    renderGroupedList: (container, entries, onEdit, onDelete) => {
        container.innerHTML = '';
        const groups = {};
        const todayStr = utils.formatDate(new Date());
        const sortedEntries = [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (sortedEntries.length === 0) {
            document.getElementById('history-empty').classList.remove('hidden');
            return;
        }
        document.getElementById('history-empty').classList.add('hidden');

        sortedEntries.forEach(e => {
            const dateStr = utils.formatDate(e.timestamp);
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(e);
        });

        Object.entries(groups).forEach(([date, items]) => {
            const isToday = date === todayStr;
            const details = document.createElement('details');
            details.className = 'group bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 overflow-hidden mb-8';
            details.open = isToday;

            details.innerHTML = `
                <summary class="flex justify-between items-center p-6 cursor-pointer list-none hover:bg-slate-50/50 transition-colors">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-inner border border-slate-100">📅</div>
                        <div>
                            <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">${date}</h3>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">${items.length} RECORDS</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        ${isToday ? '<span class="px-3 py-1 bg-indigo-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-indigo-100">Today</span>' : ''}
                        <div class="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 group-open:rotate-180 transition-transform"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg></div>
                    </div>
                </summary>
                <div class="p-6 pt-0 space-y-6 border-t border-slate-50 bg-slate-50/30">
                    <div class="h-2"></div>
                    <div class="history-items-container space-y-6"></div>
                </div>
            `;

            const itemsDiv = details.querySelector('.history-items-container');
            items.forEach(item => itemsDiv.appendChild(ui.createEntryCard(item, onEdit, onDelete)));
            container.appendChild(details);
        });
    },

    populateDatalists: (suggestions) => {
        Object.entries(suggestions).forEach(([id, list]) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = list.map(item => `<option value="${item}">`).join('');
        });
    }
};
