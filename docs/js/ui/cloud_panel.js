import { stateManager } from '../state.js';
import { SupabaseProvider } from '../storage/supabase_provider.js';

export class CloudPanel {
    constructor() {
        this.supabase = new SupabaseProvider();
        this.panel = document.getElementById('cloud-panel');
        this.header = this.panel.querySelector('.panel-header');
        this.body = this.panel.querySelector('.panel-body');
        this.cloudList = document.getElementById('cloud-projects-list');
        this.toggleBtn = document.getElementById('toggle-panel-btn');
        this.refreshBtn = document.getElementById('refresh-cloud-btn');
        this.saveBtn = document.getElementById('save-cloud-btn');

        this.isCollapsed = false;
        this.posX = 0;
        this.posY = 0;

        this.init();
    }

    init() {
        this.initDraggable();
        
        this.toggleBtn.onclick = () => this.toggleCollapse();
        this.refreshBtn.onclick = () => this.refreshCloudProjects();
        this.saveBtn.onclick = () => this.saveToCloud();

        this.refreshCloudProjects();
    }

    initDraggable() {
        interact(this.panel).draggable({
            allowFrom: '.panel-header',
            listeners: {
                move: (event) => {
                    this.posX += event.dx;
                    this.posY += event.dy;
                    event.target.style.transform = `translate(${this.posX}px, ${this.posY}px)`;
                }
            }
        });
    }

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.panel.classList.toggle('collapsed', this.isCollapsed);
        this.toggleBtn.textContent = this.isCollapsed ? '+' : '−';
    }

    async saveToCloud() {
        const name = prompt('Enter project name:', 'My Database');
        if (!name) return;

        const data = stateManager.getState();
        const { error } = await this.supabase.saveProject(name, data);
        
        if (error) {
            alert('Error saving to cloud: ' + error.message);
        } else {
            alert('Project saved successfully!');
            this.refreshCloudProjects();
        }
    }

    async refreshCloudProjects() {
        if (!this.cloudList) return;
        this.cloudList.innerHTML = '<p class="empty-msg">Refreshing...</p>';
        
        const { data, error } = await this.supabase.listProjects();
        if (error) {
            this.cloudList.innerHTML = `<p class="empty-msg" style="color: var(--danger-color)">Error loading: ${error.message}</p>`;
            return;
        }

        if (!data || data.length === 0) {
            this.cloudList.innerHTML = '<p class="empty-msg">No cloud projects found.</p>';
            return;
        }

        this.cloudList.innerHTML = '';
        data.forEach(project => {
            const item = document.createElement('div');
            item.className = 'cloud-item';
            const date = new Date(project.updated_at || project.created_at).toLocaleDateString();
            
            item.innerHTML = `
                <div class="project-name" title="${project.name}">${project.name}</div>
                <div class="project-date">${date}</div>
            `;
            
            item.onclick = () => this.loadFromCloud(project.id);
            this.cloudList.appendChild(item);
        });
    }

    async loadFromCloud(projectId) {
        if (!confirm('Load this project? Current unsaved changes might be lost.')) return;
        
        const { data, error } = await this.supabase.getProject(projectId);
        if (error) {
            alert('Error loading project: ' + error.message);
            return;
        }

        if (data && data.data) {
            window.dispatchEvent(new CustomEvent('cloud-load', { detail: { state: data.data } }));
        }
    }
}
