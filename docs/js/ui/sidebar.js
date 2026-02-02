import { stateManager } from '../state.js';
import { SupabaseProvider } from '../storage/supabase_provider.js';

export class Sidebar {
    constructor() {
        this.supabase = new SupabaseProvider();
        this.leftSidebar = document.getElementById('left-sidebar');
        this.rightSidebar = document.getElementById('right-sidebar');
        this.propertiesContent = document.getElementById('properties-content');
        this.tablesList = document.getElementById('tables-list');
        
        this.selectedTableId = null;
        this.selectedColumnId = null;
        this.selectedRelationId = null;

        this.init();
    }

    init() {
        stateManager.subscribe((state) => {
            this.renderTablesList(state);
            this.updatePropertiesFromState(state);
        });

        window.addEventListener('table-selected', (e) => {
            this.selectedTableId = e.detail.tableId;
            this.selectedColumnId = null;
            this.showTableProperties(this.selectedTableId);
        });

        window.addEventListener('column-selected', (e) => {
            this.selectedTableId = e.detail.tableId;
            this.selectedColumnId = e.detail.columnId;
            this.selectedRelationId = null;
            this.showColumnProperties(this.selectedTableId, this.selectedColumnId);
        });

        window.addEventListener('relation-selected', (e) => {
            this.selectedRelationId = e.detail.relationId;
            this.selectedTableId = null;
            this.selectedColumnId = null;
            this.showRelationProperties(this.selectedRelationId);
        });
    }

    renderTablesList(state) {
        const currentTableIds = new Set(state.tables.map(t => t.id));
        Array.from(this.tablesList.children).forEach(el => {
            if (!currentTableIds.has(el.dataset.id)) el.remove();
        });

        state.tables.forEach((table, index) => {
            let item = this.tablesList.querySelector(`[data-id="${table.id}"]`);
            if (!item) {
                item = document.createElement('div');
                item.className = 'sidebar-table-item';
                item.dataset.id = table.id;
                item.onclick = () => {
                    window.dispatchEvent(new CustomEvent('table-selected', { detail: { tableId: table.id } }));
                };
            }
            if (item.textContent !== table.name) item.textContent = table.name;
            
            if (this.tablesList.children[index] !== item) {
                this.tablesList.insertBefore(item, this.tablesList.children[index]);
            }
        });
    }

    updatePropertiesFromState(state) {
        if (this.selectedTableId && !this.selectedColumnId) {
            const table = state.tables.find(t => t.id === this.selectedTableId);
            if (!table) {
                this.selectedTableId = null;
                this.clearProperties();
            } else {
                this.syncInputValue('prop-table-name', table.name);
            }
        } else if (this.selectedColumnId) {
            const table = state.tables.find(t => t.id === this.selectedTableId);
            const column = table?.columns.find(c => c.id === this.selectedColumnId);
            if (!column) {
                this.selectedColumnId = null;
                this.clearProperties();
            } else {
                this.syncInputValue('prop-col-name', column.name);
                this.syncInputValue('prop-col-type', column.type);
                this.syncCheckboxValue('prop-col-pk', column.pk);
                this.syncCheckboxValue('prop-col-fk', column.fk);
            }
        }
    }

    syncInputValue(id, value) {
        const input = document.getElementById(id);
        if (input && input.value !== value && document.activeElement !== input) {
            input.value = value;
        }
    }

    syncCheckboxValue(id, value) {
        const input = document.getElementById(id);
        if (input && input.checked !== value) {
            input.checked = value;
        }
    }

    clearProperties() {
        this.propertiesContent.innerHTML = '<p>Select a table or column to edit its properties.</p>';
    }

    showTableProperties(tableId) {
        const table = stateManager.getState().tables.find(t => t.id === tableId);
        if (!table) return this.clearProperties();

        this.propertiesContent.innerHTML = `
            <div class="prop-group">
                <label>Table Name</label>
                <input type="text" id="prop-table-name" value="${table.name}" autocomplete="off">
            </div>
            <div class="prop-actions">
                <button id="prop-delete-table" class="danger">Delete Table</button>
            </div>
        `;

        document.getElementById('prop-table-name').oninput = (e) => {
            stateManager.updateTable(tableId, { name: e.target.value });
        };

        document.getElementById('prop-delete-table').onclick = () => {
            stateManager.removeTable(tableId);
            this.selectedTableId = null;
            this.clearProperties();
        };
    }

    showColumnProperties(tableId, columnId) {
        const table = stateManager.getState().tables.find(t => t.id === tableId);
        const column = table?.columns.find(c => c.id === columnId);
        if (!column) return;

        this.propertiesContent.innerHTML = `
            <div class="prop-group">
                <label>Column Name</label>
                <input type="text" id="prop-col-name" value="${column.name}" autocomplete="off">
            </div>
            <div class="prop-group">
                <label>Type</label>
                <input type="text" id="prop-col-type" value="${column.type}" autocomplete="off">
            </div>
            <div class="prop-group checkbox">
                <label><input type="checkbox" id="prop-col-pk" ${column.pk ? 'checked' : ''}> Primary Key</label>
            </div>
            <div class="prop-group checkbox">
                <label><input type="checkbox" id="prop-col-fk" ${column.fk ? 'checked' : ''}> Foreign Key</label>
            </div>
            <div class="prop-actions">
                <button id="prop-delete-col" class="danger">Delete Column</button>
            </div>
        `;

        document.getElementById('prop-col-name').oninput = (e) => {
            stateManager.updateColumn(tableId, columnId, { name: e.target.value });
        };

        document.getElementById('prop-col-type').oninput = (e) => {
            stateManager.updateColumn(tableId, columnId, { type: e.target.value });
        };

        document.getElementById('prop-col-pk').onchange = (e) => {
            stateManager.updateColumn(tableId, columnId, { pk: e.target.checked });
        };

        document.getElementById('prop-col-fk').onchange = (e) => {
            stateManager.updateColumn(tableId, columnId, { fk: e.target.checked });
        };

        document.getElementById('prop-delete-col').onclick = () => {
            stateManager.removeColumn(tableId, columnId);
            this.selectedColumnId = null;
            this.showTableProperties(tableId);
        };
    }

    showRelationProperties(relationId) {
        const relation = stateManager.getState().relations.find(r => r.id === relationId);
        if (!relation) return this.clearProperties();

        const fromTable = stateManager.getState().tables.find(t => t.id === relation.fromTable);
        const toTable = stateManager.getState().tables.find(t => t.id === relation.toTable);

        this.propertiesContent.innerHTML = `
            <p><strong>Relation:</strong> ${fromTable?.name} → ${toTable?.name}</p>
            <div class="prop-group">
                <label>Type</label>
                <select id="prop-rel-type">
                    <option value="1:1" ${relation.type === '1:1' ? 'selected' : ''}>1:1</option>
                    <option value="1:N" ${relation.type === '1:N' ? 'selected' : ''}>1:N</option>
                    <option value="N:N" ${relation.type === 'N:N' ? 'selected' : ''}>N:N</option>
                </select>
            </div>
            <div class="prop-actions">
                <button id="prop-delete-rel" class="danger">Delete Relation</button>
            </div>
        `;

        document.getElementById('prop-rel-type').onchange = (e) => {
            const index = stateManager.getState().relations.findIndex(r => r.id === relationId);
            if (index !== -1) {
                const relations = [...stateManager.getState().relations];
                relations[index] = { ...relations[index], type: e.target.value };
                stateManager.setState({ relations });
            }
        };

        document.getElementById('prop-delete-rel').onclick = () => {
            stateManager.removeRelation(relationId);
            this.selectedRelationId = null;
            this.clearProperties();
        };
    }
}
