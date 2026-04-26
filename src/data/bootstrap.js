import { storage, KEYS } from "../storage";
import { seedAssignments, seedMaterials, seedStudents, seedSubjects } from "./seed";
export async function bootstrapIfEmpty() {
    const seeded = await storage.read(KEYS.seedFlag);
    if (seeded)
        return;
    await storage.write(KEYS.students, seedStudents);
    await storage.write(KEYS.subjects, seedSubjects);
    await storage.write(KEYS.materials, seedMaterials);
    await storage.write(KEYS.assignments, seedAssignments);
    await storage.write(KEYS.seedFlag, { at: new Date().toISOString() });
}
export async function resetAll() {
    for (const key of await storage.list("")) {
        await storage.remove(key);
    }
    await bootstrapIfEmpty();
}
