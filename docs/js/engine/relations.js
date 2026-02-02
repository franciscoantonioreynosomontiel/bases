import { stateManager, generateUUID } from '../state.js';

export class RelationsEngine {
    constructor() {
        this.instance = null;
        this.init();
    }

    init() {
        jsPlumb.ready(() => {
            this.instance = jsPlumb.getInstance({
                Connector: ['Bezier', { curviness: 50 }],
                DragOptions: { cursor: 'pointer', zIndex: 2000 },
                PaintStyle: { stroke: '#888', strokeWidth: 2 },
                Endpoint: ['Dot', { radius: 5 }],
                EndpointStyle: { fill: '#fff', stroke: '#888', strokeWidth: 1 },
                HoverPaintStyle: { stroke: '#f97316', strokeWidth: 3 },
                EndpointHoverStyle: { fill: '#f97316' },
                Container: 'canvas'
            });

            window.jsp = this.instance;

            this.instance.bind('connection', (info) => {
                const sourceColId = info.source.id;
                const targetColId = info.target.id;
                const sourceTableId = info.source.closest('.table-node').id;
                const targetTableId = info.target.closest('.table-node').id;

                // Check if this connection was already created via sync (has an ID)
                if (info.connection.getData().id) return;

                // Check if relation already exists in state
                const state = stateManager.getState();
                const exists = state.relations.find(r => 
                    r.fromCol === sourceColId && r.toCol === targetColId
                );

                if (!exists) {
                    const relId = generateUUID();
                    info.connection.setData({ id: relId });
                    
                    stateManager.addRelation({
                        id: relId,
                        fromTable: sourceTableId,
                        fromCol: sourceColId,
                        toTable: targetTableId,
                        toCol: targetColId,
                        type: '1:N'
                    });
                }
            });

            this.instance.bind('click', (conn) => {
                const relId = conn.getData().id;
                window.dispatchEvent(new CustomEvent('relation-selected', { 
                    detail: { relationId: relId } 
                }));
            });

            stateManager.subscribe((state) => {
                this.syncConnections(state);
            });
            
            // Draw initial state
            this.syncConnections(stateManager.getState());
        });
    }

    clear() {
        if (this.instance) {
            this.instance.deleteEveryConnection();
            this.instance.deleteEveryEndpoint();
            const endpoints = document.querySelectorAll('.jsplumb-endpoint-attached');
            endpoints.forEach(el => el.classList.remove('jsplumb-endpoint-attached'));
        }
    }

    syncConnections(state) {
        if (!this.instance) return;

        // Make columns connectable
        const columns = document.querySelectorAll('.column-item');
        columns.forEach(col => {
            if (!col.classList.contains('jsplumb-endpoint-attached')) {
                this.instance.makeSource(col, {
                    anchor: ['Left', 'Right'],
                    endpoint: ['Dot', { radius: 5 }],
                    maxConnections: -1,
                    connectorStyle: { stroke: '#888', strokeWidth: 2 },
                    connectorHoverStyle: { stroke: '#f97316', strokeWidth: 3 },
                    endpointStyle: { fill: '#fff', stroke: '#888', strokeWidth: 1 }
                });
                this.instance.makeTarget(col, {
                    anchor: ['Left', 'Right'],
                    endpoint: ['Dot', { radius: 5 }],
                    maxConnections: -1,
                    endpointStyle: { fill: '#fff', stroke: '#888', strokeWidth: 1 }
                });
                col.classList.add('jsplumb-endpoint-attached');
            }
        });

        // Draw connections from state
        const currentConnections = this.instance.getAllConnections();
        state.relations.forEach(rel => {
            const exists = currentConnections.find(conn => conn.getData().id === rel.id);
            if (!exists) {
                const source = document.getElementById(rel.fromCol);
                const target = document.getElementById(rel.toCol);
                if (source && target) {
                    const conn = this.instance.connect({ 
                        source, 
                        target,
                        anchors: [['Left', 'Right'], ['Left', 'Right']]
                    });
                    conn.setData({ id: rel.id });
                }
            }
        });

        // Remove connections not in state
        const stateRelIds = new Set(state.relations.map(r => r.id));
        currentConnections.forEach(conn => {
            const relId = conn.getData().id;
            if (relId && !stateRelIds.has(relId)) {
                this.instance.deleteConnection(conn);
            }
        });

        this.instance.repaintEverything();
    }
}
