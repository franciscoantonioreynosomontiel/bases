import { stateManager } from '../state.js';

export class DragEngine {
    constructor() {
        this.init();
    }

    init() {
        this.initTableDrag();
        this.initTemplateDrag();
    }

    initTableDrag() {
        interact('.table-node').draggable({
            allowFrom: '.table-header',
            inertia: false,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: '#canvas',
                    endOnly: false
                })
            ],
            autoScroll: {
                container: document.getElementById('canvas-container'),
                margin: 50,
                distance: 10,
                interval: 10
            },
            listeners: {
                start: (event) => {
                    event.target.classList.add('dragging');
                },
                move: (event) => {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                    
                    if (window.jsp) {
                        window.jsp.revalidate(target);
                    }
                },
                end: (event) => {
                    const target = event.target;
                    target.classList.remove('dragging');

                    if (window.jsp) {
                        window.jsp.revalidate(target);
                    }

                    const tableId = target.id;
                    const rect = target.getBoundingClientRect();
                    const canvasRect = document.getElementById('canvas').getBoundingClientRect();
                    
                    const posX = rect.left - canvasRect.left;
                    const posY = rect.top - canvasRect.top;

                    stateManager.updateTable(tableId, { posX, posY });
                }
            }
        });
    }

    initTemplateDrag() {
        interact('#table-template').draggable({
            manualStart: true,
            listeners: {
                move: (event) => {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                },
                end: (event) => {
                    const target = event.target;
                    const canvas = document.getElementById('canvas-container');
                    const canvasRect = canvas.getBoundingClientRect();
                    const targetRect = target.getBoundingClientRect();

                    if (
                        targetRect.left < canvasRect.right &&
                        targetRect.right > canvasRect.left &&
                        targetRect.top < canvasRect.bottom &&
                        targetRect.bottom > canvasRect.top
                    ) {
                        const realCanvas = document.getElementById('canvas');
                        const realCanvasRect = realCanvas.getBoundingClientRect();
                        const posX = targetRect.left - realCanvasRect.left;
                        const posY = targetRect.top - realCanvasRect.top;
                        stateManager.addTable('new_table', posX, posY);
                    }

                    target.remove();
                }
            }
        }).on('move', (event) => {
            const { interaction } = event;
            if (interaction.pointerIsDown && !interaction.interacting()) {
                const original = event.currentTarget;
                const clone = original.cloneNode(true);
                const rect = original.getBoundingClientRect();
                
                clone.id = 'table-template-dragging';
                clone.style.position = 'fixed';
                clone.style.left = `${rect.left}px`;
                clone.style.top = `${rect.top}px`;
                clone.style.width = `${rect.width}px`;
                clone.style.zIndex = '1000';
                clone.style.pointerEvents = 'none';
                clone.classList.add('dragging-clone');
                
                document.body.appendChild(clone);
                interaction.start({ name: 'drag' }, event.interactable, clone);
            }
        });
    }
}
