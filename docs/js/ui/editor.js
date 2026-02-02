import { stateManager } from '../state.js';
import { MySQLGenerator } from '../generators/mysql.js';
import { PostgresGenerator } from '../generators/postgres.js';
import { StandardSQLGenerator } from '../generators/standard.js';
import { SQLParser } from '../utils/sql_parser.js';

export class SQLEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.dialectSelect = document.getElementById('sql-dialect');
        this.applyBtn = document.getElementById('apply-sql-btn');
        this.editor = null;
        this.debounceTimer = null;
        this.generators = {
            standard: new StandardSQLGenerator(),
            mysql: new MySQLGenerator(),
            postgres: new PostgresGenerator()
        };
        this.currentDialect = 'standard';

        this.init();
    }

    init() {
        this.editor = CodeMirror(this.container, {
            value: '',
            mode: 'text/x-sql',
            theme: 'default',
            lineNumbers: true,
            readOnly: false
        });

        this.dialectSelect.onchange = (e) => {
            this.currentDialect = e.target.value;
            this.updatePreview();
        };

        stateManager.subscribe(() => {
            if (!this.editor.hasFocus()) {
                this.updatePreview();
            }
        });

        if (this.applyBtn) {
            this.applyBtn.onclick = () => this.applySQL();
        }

        this.editor.on('change', () => {
            if (this.editor.hasFocus()) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.applySQL(true); // silent apply
                }, 1000);
            }
        });

        this.updatePreview();
    }

    applySQL(silent = false) {
        const sql = this.editor.getValue();
        try {
            const newState = SQLParser.parse(sql);
            if (newState.tables.length === 0) {
                if (!silent) alert('No valid CREATE TABLE statements found.');
                return;
            }

            // Preservation of positions for existing tables
            const currentState = stateManager.getState();
            const usedExistingIndices = new Set();

            newState.tables.forEach((newTable, index) => {
                // Try to find by name first
                let existingIndex = currentState.tables.findIndex((t, i) => 
                    !usedExistingIndices.has(i) && t.name.toLowerCase() === newTable.name.toLowerCase()
                );

                // Fallback: If table count is the same, match by index (handles renames)
                if (existingIndex === -1 && newState.tables.length === currentState.tables.length) {
                    if (!usedExistingIndices.has(index)) {
                        existingIndex = index;
                    }
                }

                if (existingIndex !== -1) {
                    const existing = currentState.tables[existingIndex];
                    newTable.posX = existing.posX;
                    newTable.posY = existing.posY;
                    newTable.id = existing.id;
                    usedExistingIndices.add(existingIndex);
                    
                    // Also update column IDs
                    newTable.columns.forEach((newCol, colIndex) => {
                        const existingCol = existing.columns.find(c => c.name.toLowerCase() === newCol.name.toLowerCase());
                        if (existingCol) {
                            newCol.id = existingCol.id;
                        } else if (newTable.columns.length === existing.columns.length) {
                            // Match columns by index if count same (handles column rename)
                            newCol.id = existing.columns[colIndex].id;
                        }
                    });
                }
            });

            // Update relations to use actual IDs
            newState.relations.forEach(rel => {
                const fromTable = newState.tables.find(t => t.id === rel.fromTable || t.name === rel.fromTable.replace('table_', ''));
                const toTable = newState.tables.find(t => t.id === rel.toTable || t.name === rel.toTable.replace('table_', ''));
                
                if (fromTable && toTable) {
                    rel.fromTable = fromTable.id;
                    rel.toTable = toTable.id;
                    
                    const fromCol = fromTable.columns.find(c => c.id === rel.fromCol || c.name === rel.fromCol.split('_').pop());
                    const toCol = toTable.columns.find(c => c.id === rel.toCol || c.name === rel.toCol.split('_').pop());
                    
                    if (fromCol && toCol) {
                        rel.fromCol = fromCol.id;
                        rel.toCol = toCol.id;
                    }
                }
            });

            // Clear visual engines via App event
            window.dispatchEvent(new CustomEvent('cloud-load', { detail: { state: newState } }));
        } catch (err) {
            console.error(err);
            if (!silent) alert('Error parsing SQL: ' + err.message);
        }
    }

    updatePreview() {
        const state = stateManager.getState();
        const generator = this.generators[this.currentDialect];
        if (generator) {
            const sql = generator.generate(state);
            this.editor.setValue(sql);
        }
    }

    getSQL() {
        return this.editor.getValue();
    }
}
