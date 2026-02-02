export class StorageManager {
    constructor(key = 'visual_db_designer_state') {
        this.key = key;
    }

    save(state) {
        localStorage.setItem(this.key, JSON.stringify(state));
    }

    load() {
        const data = localStorage.getItem(this.key);
        return data ? JSON.parse(data) : null;
    }
}
