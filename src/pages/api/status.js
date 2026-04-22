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
    url: "https://jf.simplysnox.com"
  },
  {
    name: "Cove Java",
    category: "Minecraft",
    type: "minecraft-java",
    ip: "78.108.218.31",
    port: 25578
  },
  {
    name: "Cove Bedrock",
    category: "Minecraft",
    type: "minecraft-bedrock",
    ip: "78.108.218.31",
    port: 25830
  }
];

const memory = {};
const ipCache = {};
let serverTapCache = null;
let serverTapLastFetch = 0;

const SERVERTAP_URL = "http://78.108.218.31:25887/v1/server";
const SERVERTAP_KEY = "some-long-super-random-string";

async function fetchWithTimeout(url, timeout = 4000, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store"
    });
  } finally {
    clearTimeout(timer);
  }
}

function formatBytes(bytes) {
  if (typeof bytes !== "number") return null;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
}

function formatMinutes(minutes) {
  if (typeof minutes !== "number") return null;

  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  return [
    days ? `${days}d` : null,
    hours ? `${hours}h` : null,
    mins ? `${mins}m` : null
  ]
    .filter(Boolean)
    .join(" ");
}

async function getServerTapInfo() {
  const now = Date.now();

  if (serverTapCache && now - serverTapLastFetch < 30000) {
    return serverTapCache;
  }

  try {
    const res = await fetchWithTimeout(SERVERTAP_URL, 5000, {
      headers: {
        accept: "application/json",
        key: SERVERTAP_KEY
      }
    });

    const data = await res.json();

    serverTapCache = {
      tps: data.tps || null,
      hostMachine: {
        provider: "SparkedHost",
        node: "b-ash-01",
        cpu: `${data.health?.cpus ?? "?"} cores`,
        memory: `${formatBytes(
          (data.health?.totalMemory || 0) - (data.health?.freeMemory || 0)
        )} / ${formatBytes(data.health?.maxMemory)}`,
        uptime: formatMinutes(data.health?.uptime)
      }
    };

    serverTapLastFetch = now;
    return serverTapCache;
  } catch {
    return null;
  }
}

async function getIpMeta(ip) {
  if (ipCache[ip]) {
    return ipCache[ip];
  }

  try {
    const res = await fetchWithTimeout(`http://ip-api.com/json/${ip}`, 5000);
    const data = await res.json();

    if (data?.status !== "success") return {};

    const meta = {
      region: [data.city, data.regionName].filter(Boolean).join(", "),
      provider: data.isp || data.org || null,
      country: data.country || null,
      flag: data.countryCode
        ? String.fromCodePoint(
          ...[...data.countryCode.toUpperCase()].map(
            c => 127397 + c.charCodeAt()
          )
        )
        : ""
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

    return {
      online: data.online ?? false,
      latency: Date.now() - start,
      players:
        typeof data.players?.online === "number"
          ? data.players.online
          : playerList.length,
      maxPlayers: data.players?.max ?? null,
      playerList
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
      lastOnline: null
    };
  }

  const record = memory[name];

  if (latency !== null) {
    record.latencyHistory.push(latency);
    record.latencyHistory = record.latencyHistory.slice(-12);
  }

  if (online !== null) {
    if (record.lastOnline !== null && record.lastOnline !== online) {
      record.incidents.unshift({
        time: new Date().toISOString(),
        status: online ? "Recovered" : "Offline"
      });

      record.incidents = record.incidents.slice(0, 10);
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
    incidents: record.incidents
  };
}

async function checkService(service, serverTapInfo) {
  const result =
    service.type === "http"
      ? await checkHttp(service)
      : await checkMinecraft(service);

  const stats = updateUptime(service.name, result.online, result.latency);

  const ipMeta =
    service.type.startsWith("minecraft") && service.ip
      ? await getIpMeta(service.ip)
      : {};

  return {
    ...service,
    ...result,
    ...stats,
    region: ipMeta.region || null,
    provider: ipMeta.provider || null,
    country: ipMeta.country || null,
    flag: ipMeta.flag || "",
    hostMachine:
      service.type.startsWith("minecraft")
        ? serverTapInfo?.hostMachine || null
        : null,
    tps:
      service.type.startsWith("minecraft")
        ? serverTapInfo?.tps || null
        : null,
    checkedAt: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  const started = Date.now();

  const serverTapInfo = await getServerTapInfo();

  const checked = await Promise.all(
    services.map(service => checkService(service, serverTapInfo))
  );

  const visibleServices = checked.filter(service => !service.hidden);

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=15, stale-while-revalidate=30"
  );

  res.status(200).json({
    generatedIn: Date.now() - started,
    overallOnline: visibleServices.every(service => service.online !== false),
    checkedAt: new Date().toISOString(),
    services: visibleServices
  });
}