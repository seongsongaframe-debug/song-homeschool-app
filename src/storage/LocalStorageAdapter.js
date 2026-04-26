const NS = "songhs::";
export class LocalStorageAdapter {
    async read(key) {
        const raw = localStorage.getItem(NS + key);
        if (raw == null)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    async write(key, value) {
        localStorage.setItem(NS + key, JSON.stringify(value));
    }
    async list(prefix) {
        const out = [];
        const fullPrefix = NS + prefix;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(fullPrefix))
                out.push(k.slice(NS.length));
        }
        return out;
    }
    async remove(key) {
        localStorage.removeItem(NS + key);
    }
}
