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
    hidden: true,
    url: "https://api.simplysnox.com"
  },
  {
    name: "Search",
    category: "Infrastructure",
    type: "http",
    hidden: true,
    url: "https://search.simplysnox.com"
  },
  {
    name: "Jellyfin Media Server",
    category: "Media",
    type: "http",
    hidden: false,
    url: "https://jf.simplysnox.com"
  },
  {
    name: "Cove Java",
    category: "Minecraft",
    type: "minecraft-java",
    ip: "78.108.218.31",
    port: 25578,
    hostMachine: {
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
    hostMachine: {
      node: "b-ash-01",
      cpu: "19.47%",
      memory: "1.88 GiB / 6 GiB",
      disk: "495.66 MiB / 20 GiB",
      uptime: "14d 20h 54m"
    }
  }
];

const memory = {};
const ipCache = {};

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

async function getIpMeta(ip) {
  if (ipCache[ip]) return ipCache[ip];

  try {
    const res = await fetchWithTimeout(`https://ipwho.is/${ip}`, 3000);
    const data = await res.json();

    if (!data.success) return {};

    const meta = {
      region: `${data.city}, ${data.region}`,
      provider: data.connection?.org || null,
      country: data.country || null,
      flag: data.flag?.emoji || ""
    };

    ipCache[ip] = meta;
    return meta;
  } catch {
    return {};
  }
}

async function checkHttp(service) {
  const start = Date.now();

  try {
    const res = await fetchWithTimeout(service.url, 3000);
    const text = await res.text();

    const tunnelError =
      text.includes("Error 1033") ||
      text.includes("Cloudflare Tunnel error");

    return {
      online: res.ok && !tunnelError,
      latency: Date.now() - start,
      tunnelError
    };
  } catch {
    return {
      online: false,
      latency: null,
      tunnelError: false
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

    const playerList = Array.isArray(data.players?.list)
      ? data.players.list
      : [];

    const calculatedPlayers =
      typeof data.players?.online === "number"
        ? data.players.online
        : playerList.length;

    return {
      online: data.online ?? false,
      latency: Date.now() - start,
      players: calculatedPlayers,
      maxPlayers: data.players?.max ?? null,
      playerList,
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

      record.incidents.unshift({
        time: now.toISOString(),
        status: online ? "Recovered" : "Offline"
      });

      record.incidents = record.incidents.slice(0, 10);
      record.outageStarted = online ? null : now;
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
    latencyHistory: record.latencyHistory
  };
}

async function checkService(service) {
  const result =
    service.type === "http"
      ? await checkHttp(service)
      : await checkMinecraft(service);

  const stats = updateUptime(service.name, result.online, result.latency);
  const ipMeta = service.ip ? await getIpMeta(service.ip) : {};

  return {
    ...service,
    ...result,
    ...stats,
    region: ipMeta.region || null,
    provider: ipMeta.provider || null,
    country: ipMeta.country || null,
    flag: ipMeta.flag || "",
    checkedAt: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  const started = Date.now();

  const checked = await Promise.all(
    services.map(checkService)
  );

  const visibleServices = checked.filter(service => !service.hidden);

  res.status(200).json({
    generatedIn: Date.now() - started,
    overallOnline: visibleServices.every(service => service.online !== false),
    checkedAt: new Date().toISOString(),
    services: visibleServices
  });
}