const services = [
  {
    name: "Main Website",
    category: "Web",
    type: "http",
    url: "https://simplysnox.com"
  },
  {
    name: "API",
    category: "Infrastructure",
    type: "http",
    url: "https://api.simplysnox.com"
  },
  {
    name: "Search",
    category: "Infrastructure",
    type: "http",
    url: "https://search.simplysnox.com"
  },
  {
    name: "Cove Java",
    category: "Minecraft",
    type: "minecraft-java",
    ip: "78.108.218.31",
    port: 25578,
    region: "Ashburn, Virginia",
    hostMachine: {
      provider: "SparkedHost",
      node: "b-ash-01",
      cpu: "19.47%",
      memory: "1.88 GiB / 6 GiB",
      disk: "495.66 MiB / 20 GiB",
      uptime: "14d 20h 54m"
    }
  },
  {
    name: "Cove Bedrock",
    category: "Minecraft",
    type: "minecraft-bedrock",
    ip: "78.108.218.31",
    port: 25830,
    region: "Ashburn, Virginia",
    hostMachine: {
      provider: "SparkedHost",
      node: "b-ash-01",
      cpu: "19.47%",
      memory: "1.88 GiB / 6 GiB",
      disk: "495.66 MiB / 20 GiB",
      uptime: "14d 20h 54m"
    }
  }
];

const memory = {};

async function fetchWithTimeout(url, timeout = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store"
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkHttp(service) {
  const start = Date.now();

  try {
    const res = await fetchWithTimeout(service.url, 3000);
    const text = await res.text();

    const cloudflareTunnelError =
      text.includes("Error 1033") ||
      text.includes("Cloudflare Tunnel error");

    return {
      online: res.ok && !cloudflareTunnelError,
      latency: Date.now() - start,
      tunnelError: cloudflareTunnelError
    };
  } catch {
    return {
      online: false,
      latency: null
    };
  }
}

async function checkMinecraft(service) {
  try {
    const endpoint =
      service.type === "minecraft-java"
        ? `https://api.mcstatus.io/v2/status/java/${service.ip}:${service.port}`
        : `https://api.mcstatus.io/v2/status/bedrock/${service.ip}:${service.port}`;

    const start = Date.now();
    const res = await fetchWithTimeout(endpoint, 3500);
    const data = await res.json();

    return {
      online: data.online ?? false,
      latency: Date.now() - start,
      players: data.players?.online,
      maxPlayers: data.players?.max,
      playerList: data.players?.list || [],
      motd: Array.isArray(data.motd?.clean)
        ? data.motd.clean.join(" ")
        : data.motd?.clean || null
    };
  } catch {
    return {
      online: null,
      latency: null
    };
  }
}

function updateUptime(name, online, latency) {
  if (!memory[name]) {
    memory[name] = {
      checks: 0,
      onlineChecks: 0,
      incidents: [],
      latencyHistory: [],
      lastOnline: null,
      outageStarted: null
    };
  }

  const record = memory[name];

  if (latency !== null) {
    record.latencyHistory.push(latency);
    record.latencyHistory = record.latencyHistory.slice(-12);
  }

  if (online !== null) {
    if (record.lastOnline !== null && record.lastOnline !== online) {
      const now = new Date();

      if (!online) {
        record.outageStarted = now;
      }

      record.incidents.unshift({
        time: now.toISOString(),
        status: online ? "Recovered" : "Offline",
        duration:
          online && record.outageStarted
            ? Math.round((now - record.outageStarted) / 1000)
            : null
      });

      record.incidents = record.incidents.slice(0, 10);

      if (online) {
        record.outageStarted = null;
      }
    }

    record.checks++;
    if (online) record.onlineChecks++;
    record.lastOnline = online;
  }

  return {
    uptime:
      record.checks > 0
        ? ((record.onlineChecks / record.checks) * 100).toFixed(2)
        : "N/A",
    incidents: record.incidents,
    latencyHistory: record.latencyHistory,
    outageDuration:
      record.outageStarted
        ? Math.round((Date.now() - record.outageStarted.getTime()) / 1000)
        : null
  };
}

async function checkService(service) {
  const result =
    service.type === "http"
      ? await checkHttp(service)
      : await checkMinecraft(service);

  const stats = updateUptime(service.name, result.online, result.latency);

  return {
    ...service,
    ...result,
    ...stats,
    checkedAt: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  const started = Date.now();

  const results = await Promise.all(
    services.map(checkService)
  );

  res.status(200).json({
    generatedIn: Date.now() - started,
    overallOnline: results.every(s => s.online !== false),
    checkedAt: new Date().toISOString(),
    services: results
  });
}