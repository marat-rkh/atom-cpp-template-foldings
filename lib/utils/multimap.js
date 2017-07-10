'use babel';

export class MultiMap {
    constructor() {
        this._map = new Map();
    }

    get(key) {
        return this._map.get(key);
    }

    set(key, value) {
        let values = this._map.get(key);
        if(!values) {
            values = new Set();
            this._map.set(key, values);
        }
        values.add(value);
    }

    delete(key, value) {
        const values = this._map.get(key);
        if(values) {
            values.delete(value);
            if(!values.size) {
                this._map.delete(key);
            }
        }
    }

    clear() {
        this._map.clear();
    }
}
