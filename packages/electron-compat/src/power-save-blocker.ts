const active = new Set<number>();
let nextId = 0;

export const powerSaveBlocker = {
  start(_type: "prevent-app-suspension" | "prevent-display-sleep"): number {
    const id = ++nextId;
    active.add(id);
    return id;
  },
  stop(id: number): void {
    active.delete(id);
  },
  isStarted(id: number): boolean {
    return active.has(id);
  },
};
