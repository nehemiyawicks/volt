import { EventEmitter } from "node:events";

class PowerMonitor extends EventEmitter {
  getSystemIdleState(_threshold: number): "active" | "idle" | "locked" | "unknown" {
    return "active";
  }
  getSystemIdleTime(): number { return 0; }
  getCurrentThermalState(): "unknown" | "nominal" | "fair" | "serious" | "critical" {
    return "unknown";
  }
  isOnBatteryPower(): boolean { return false; }
}

export const powerMonitor = new PowerMonitor();
