export const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export class StateManager {
    constructor() {
        this.state = {
            tables: [],
            relations: []
        };
        this.listeners = [];
    }

    getState() {
        return this.state;
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    addTable(name, x = 100, y = 100) {
        const newTable = {
            id: generateUUID(),
            name: name || 'new_table',
            posX: x,
            posY: y,
            columns: [
                { id: generateUUID(), name: 'id', type: 'INT', pk: true, fk: false }
            ]
        };
        this.state.tables.push(newTable);
        this.notify();
        return newTable;
    }

    updateTable(tableId, data) {
        const index = this.state.tables.findIndex(t => t.id === tableId);
        if (index !== -1) {
            this.state.tables[index] = { ...this.state.tables[index], ...data };
            this.notify();
        }
    }

    removeTable(tableId) {
        this.state.tables = this.state.tables.filter(t => t.id !== tableId);
        this.state.relations = this.state.relations.filter(r => 
            r.fromTable !== tableId && r.toTable !== tableId
        );
        this.notify();
    }

    addColumn(tableId, columnData = {}) {
        const table = this.state.tables.find(t => t.id === tableId);
        if (table) {
            const newColumn = {
                id: generateUUID(),
                name: 'column_' + (table.columns.length + 1),
                type: 'VARCHAR(255)',
                pk: false,
                fk: false,
                ...columnData
            };
            table.columns.push(newColumn);
            this.notify();
            return newColumn;
        }
    }

    updateColumn(tableId, columnId, data) {
        const table = this.state.tables.find(t => t.id === tableId);
        if (table) {
            const index = table.columns.findIndex(c => c.id === columnId);
            if (index !== -1) {
                table.columns[index] = { ...table.columns[index], ...data };
                this.notify();
            }
        }
    }

    removeColumn(tableId, columnId) {
        const table = this.state.tables.find(t => t.id === tableId);
        if (table) {
            table.columns = table.columns.filter(c => c.id !== columnId);
            this.state.relations = this.state.relations.filter(r => 
                (r.fromTable === tableId && r.fromCol !== columnId) ||
                (r.toTable === tableId && r.toCol !== columnId) ||
                (r.fromTable !== tableId && r.toTable !== tableId)
            );
            this.notify();
        }
    }

    addRelation(relation) {
        // relation: { id, fromTable, fromCol, toTable, toCol, type }
        const newRelation = { 
            id: relation.id || generateUUID(), 
            ...relation 
        };
        this.state.relations.push(newRelation);
        this.notify();
        return newRelation;
    }

    removeRelation(relationId) {
        this.state.relations = this.state.relations.filter(r => r.id !== relationId);
        this.notify();
    }
}

export const stateManager = new StateManager();
