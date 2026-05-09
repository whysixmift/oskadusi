import os from "os";
import { execFileSync } from "child_process";

interface CpuSnapshot {
  idle: number;
  total: number;
}

export interface SystemMetrics {
  timestamp: string;
  cpu: {
    usagePercent: number;
    loadAverage: number[];
    cores: number;
  };
  ram: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usagePercent: number;
  };
  disk: {
    filesystem: string;
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usagePercent: number;
    mount: string;
  };
}

function cpuSnapshot(): CpuSnapshot {
  return os.cpus().reduce<CpuSnapshot>(
    (snapshot, cpu) => {
      const total = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
      return {
        idle: snapshot.idle + cpu.times.idle,
        total: snapshot.total + total,
      };
    },
    { idle: 0, total: 0 },
  );
}

function diskMetrics(): SystemMetrics["disk"] {
  const output = execFileSync("df", ["-k", process.cwd()], {
    encoding: "utf8",
  }).trim();
  const [, line] = output.split("\n");
  const parts = line.trim().split(/\s+/);
  const [filesystem, totalKb, usedKb, availableKb, usage, mount] = parts;

  return {
    filesystem,
    totalBytes: Number(totalKb) * 1024,
    usedBytes: Number(usedKb) * 1024,
    availableBytes: Number(availableKb) * 1024,
    usagePercent: Number(usage.replace("%", "")),
    mount,
  };
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const start = cpuSnapshot();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const end = cpuSnapshot();

  const idleDelta = end.idle - start.idle;
  const totalDelta = end.total - start.total;
  const cpuUsage =
    totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 1000) / 10 : 0;

  const totalRam = os.totalmem();
  const freeRam = os.freemem();
  const usedRam = totalRam - freeRam;

  return {
    timestamp: new Date().toISOString(),
    cpu: {
      usagePercent: cpuUsage,
      loadAverage: os.loadavg(),
      cores: os.cpus().length,
    },
    ram: {
      totalBytes: totalRam,
      freeBytes: freeRam,
      usedBytes: usedRam,
      usagePercent: Math.round((usedRam / totalRam) * 1000) / 10,
    },
    disk: diskMetrics(),
  };
}
