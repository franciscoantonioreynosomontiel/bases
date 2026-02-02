import { Canvas } from './ui/canvas.js';
import { Sidebar } from './ui/sidebar.js';
import { CloudPanel } from './ui/cloud_panel.js';
import { stateManager } from './state.js';
import { DragEngine } from './engine/drag.js';
import { RelationsEngine } from './engine/relations.js';
import { SQLEditor } from './ui/editor.js';
import { StorageManager } from './utils/storage.js';

class App {
    constructor() {
        this.storage = new StorageManager();
        this.canvas = new Canvas('canvas');
        this.sidebar = new Sidebar();
        this.cloudPanel = new CloudPanel();
        this.dragEngine = new DragEngine();
        this.relationsEngine = new RelationsEngine();
        this.sqlEditor = new SQLEditor('sql-editor-container');
        this.init();
    }

    init() {
        console.log('Visual DB Designer Initialized');
        
        this.initTheme();

        // Load from storage
        const savedState = this.storage.load();
        if (savedState) {
            stateManager.setState(savedState);
        } else if (stateManager.getState().tables.length === 0) {
            // Initial default state
            const usersTable = stateManager.addTable('users', 100, 100);
            const productsTable = stateManager.addTable('products', 450, 100);
            const userIdCol = stateManager.addColumn(productsTable.id, { name: 'user_id', type: 'INT', fk: true });
            
            // Add initial relation
            stateManager.addRelation({
                fromTable: productsTable.id,
                fromCol: userIdCol.id,
                toTable: usersTable.id,
                toCol: usersTable.columns[0].id,
                type: '1:N'
            });
        }

        // Auto-save
        stateManager.subscribe((state) => {
            this.storage.save(state);
        });

        this.setupActions();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('vdb_theme') || 'dark';
        this.setTheme(savedTheme);

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.onclick = () => {
                const theme = btn.getAttribute('data-theme');
                this.setTheme(theme);
            };
        });
    }

    setTheme(theme) {
        document.body.classList.remove('light-theme', 'mid-theme');
        if (theme !== 'dark') {
            document.body.classList.add(`${theme}-theme`);
        }
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
        });

        localStorage.setItem('vdb_theme', theme);
    }

    setupActions() {
        document.getElementById('export-png').onclick = async () => {
            const canvas = document.getElementById('canvas');
            const elements = document.querySelectorAll('.table-node, .jtk-connector, .jtk-endpoint');
            
            if (document.querySelectorAll('.table-node').length === 0) {
                alert('No tables to export');
                return;
            }

            // Calculate bounding box
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            const canvasRect = canvas.getBoundingClientRect();

            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return;

                const x = rect.left - canvasRect.left;
                const y = rect.top - canvasRect.top;
                
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + rect.width);
                maxY = Math.max(maxY, y + rect.height);
            });

            // Fallback if no elements found or weird rects
            if (minX === Infinity) {
                minX = 0; minY = 0; maxX = 800; maxY = 600;
            }

            // Add padding
            const padding = 50;
            minX -= padding;
            minY -= padding;
            maxX += padding;
            maxY += padding;

            const width = maxX - minX;
            const height = maxY - minY;

            try {
                // Force repaint
                if (window.jsp) {
                    window.jsp.repaintEverything();
                }

                // Use dom-to-image for better SVG support
                const scale = 2;
                const dataUrl = await domtoimage.toPng(canvas, {
                    width: width * scale,
                    height: height * scale,
                    style: {
                        transform: `scale(${scale}) translate(${-minX}px, ${-minY}px)`,
                        transformOrigin: 'top left',
                        width: '4000px',
                        height: '4000px'
                    },
                    bgcolor: getComputedStyle(document.body).getPropertyValue('--canvas-bg')
                });

                const link = document.createElement('a');
                link.download = 'database_diagram.png';
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error('Export failed', err);
                alert('Export failed. Check console for details.');
            }
        };

        document.getElementById('export-json').onclick = () => {
            const data = JSON.stringify(stateManager.getState(), null, 2);
            this.downloadFile(data, 'database_schema.json', 'application/json');
        };

        document.getElementById('export-sql').onclick = () => {
            const sql = this.sqlEditor.getSQL();
            this.downloadFile(sql, 'database_schema.sql', 'text/plain');
        };

        document.getElementById('import-btn').onclick = () => {
            document.getElementById('import-input').click();
        };

        document.getElementById('import-input').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    this.loadFullState(json);
                } catch (err) {
                    console.error(err);
                    alert('Invalid JSON file');
                }
            };
            reader.readAsText(file);
        };

        window.addEventListener('cloud-load', (e) => {
            this.loadFullState(e.detail.state);
        });
    }

    loadFullState(state) {
        this.relationsEngine.clear();
        document.getElementById('canvas').innerHTML = '';
        stateManager.setState(state);
    }

    downloadFile(content, fileName, contentType) {
        const a = document.createElement('a');
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        window.app = new App();
    });
} else {
    window.app = new App();
}
