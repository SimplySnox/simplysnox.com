const services = [
  {
    name: "simplysnox.com",
    category: "Web",
    type: "http",
    hidden: false,
    hideUrl: false,
    url: "https://simplysnox.com"
  },
  {
    name: "quietstates.xyz",
    category: "Web",
    type: "http",
    hidden: false,
    hideUrl: false,
    url: "https://quietstates.xyz"
  },
  {
    name: "API",
    category: "Infrastructure",
    type: "http",
    hidden: true,
    hideUrl: false,
    url: "https://api.simplysnox.com"
  },
  {
    name: "Search",
    category: "Infrastructure",
    type: "http",
    hidden: true,
    hideUrl: true,
    url: "https://search.simplysnox.com"
  },
  {
    name: "ShareX Uploader",
    category: "Media",
    type: "http",
    hidden: false,
    hideUrl: true,
    url: "https://i.simplysnox.com/healthz"
  },
  {
    name: "Jellyfin Media Server",
    category: "Media",
    type: "http",
    hidden: false,
    hideUrl: true,
    url: "https://jf.simplysnox.com"
  },
  {
    name: "The Cove",
    category: "Minecraft",
    type: "minecraft",
    hidden: false,
    endpoints: {
      java: {
        ip: "78.108.218.31",
        port: 25578,
        address: "cove.simplysnox.com"
      },
      bedrock: {
        ip: "78.108.218.31",
        port: 25830,
        address: "covebr.simplysnox.com:25830"
      }
    }
  }
];

const memory = {};
const ipCache = {};
const gamertagCache = {};

let serverTapCache = null;
let serverTapLastFetch = 0;

const SERVERTAP_BASE = "http://78.108.218.31:25887/v1";
const SERVERTAP_KEY = "some-long-super-random-string";

const HIGHLIGHT_UUID = "0d9e7f23-7664-4d4e-b78a-24667ef5ddbf";

/* ---------------- FETCH ---------------- */

async function fetchWithTimeout(url, timeout = 4000, options = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);

  const started = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store"
    });

    return {
      response,
      latency: Date.now() - started
    };
  } finally {
    clearTimeout(t);
  }
}

/* ---------------- HELPERS ---------------- */

function formatBytes(bytes) {
  if (typeof bytes !== "number") return null;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
}

function formatMinutes(minutes) {
  if (typeof minutes !== "number") return null;

  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  return [days && `${days}d`, hours && `${hours}h`, mins && `${mins}m`]
    .filter(Boolean)
    .join(" ");
}

async function normalizePlayer(player) {
  const uuid = player.uuid;
  const isBedrock = uuid?.startsWith("00000000-0000-0000-");

  if (!isBedrock) {
    return {
      uuid,
      name_clean:
        String(player.displayName || "")
          .replace(/§[0-9A-FK-OR]/gi, "")
          .replace(/^\([^)]+\)\s*/g, "")
          .replace(/^\.+/, "")
          .trim() || "Unknown",
      platform: "Java"
    };
  }

  if (gamertagCache[uuid]) {
    return {
      uuid,
      name_clean: gamertagCache[uuid],
      platform: "Bedrock"
    };
  }

  try {
    const xuid = uuid.replace(/-/g, "");
    const res = await fetch(`https://api.geysermc.org/v2/xbox/xuid/${xuid}`);
    const data = await res.json();

    const gamertag =
      data?.gamertag ||
      String(player.displayName || "")
        .replace(/§[0-9A-FK-OR]/gi, "")
        .replace(/^\([^)]+\)\s*/g, "")
        .replace(/^\.+/, "")
        .trim() ||
      "Unknown";

    gamertagCache[uuid] = gamertag;

    return {
      uuid,
      name_clean: gamertag,
      platform: "Bedrock"
    };
  } catch {
    return {
      uuid,
      name_clean:
        String(player.displayName || "")
          .replace(/§[0-9A-FK-OR]/gi, "")
          .replace(/^\([^)]+\)\s*/g, "")
          .replace(/^\.+/, "")
          .trim() || "Unknown",
      platform: "Bedrock"
    };
  }
}

/* ---------------- IP META ---------------- */

async function getIpMeta(ip) {
  if (ipCache[ip]) return ipCache[ip];

  try {
    const { response } = await fetchWithTimeout(
      `http://ip-api.com/json/${ip}`,
      5000
    );

    const data = await response.json();

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

/* ---------------- SERVERTAP ---------------- */

async function getServerTapInfo() {
  const now = Date.now();

  if (serverTapCache && now - serverTapLastFetch < 15000) {
    return serverTapCache;
  }

  try {
    const headers = {
      accept: "application/json",
      key: SERVERTAP_KEY
    };

    const [serverRes, playersRes] = await Promise.all([
      fetch(`${SERVERTAP_BASE}/server`, { headers }),
      fetch(`${SERVERTAP_BASE}/players`, { headers })
    ]);

    const serverData = await serverRes.json();
    const playersData = await playersRes.json();

    const javaPlayers = Array.isArray(playersData)
      ? await Promise.all(playersData.map(normalizePlayer))
      : [];

    serverTapCache = {
      tps: serverData.tps || null,
      hostMachine: {
        provider: "SparkedHost",
        node: "b-ash-01",
        cpu: `${serverData.health?.cpus ?? "?"} cores`,
        memory: `${formatBytes(
          (serverData.health?.totalMemory || 0) -
          (serverData.health?.freeMemory || 0)
        )} / ${formatBytes(serverData.health?.maxMemory)}`,
        uptime: formatMinutes(serverData.health?.uptime)
      },
      javaPlayers
    };

    serverTapLastFetch = now;
    return serverTapCache;
  } catch {
    return null;
  }
}

/* ---------------- CHECKERS ---------------- */

async function checkHttp(service) {
  try {
    const { response, latency } = await fetchWithTimeout(service.url);

    return {
      online: response.ok,
      latency
    };
  } catch {
    return {
      online: false,
      latency: null
    };
  }
}

async function checkMinecraft(service, serverTapInfo) {
  try {
    const java = service.endpoints.java;
    const bedrock = service.endpoints.bedrock;

    const start = Date.now();

    const [j, b] = await Promise.all([
      fetch(`https://api.mcstatus.io/v2/status/java/${java.ip}:${java.port}`),
      fetch(`https://api.mcstatus.io/v2/status/bedrock/${bedrock.ip}:${bedrock.port}`)
    ]);

    const javaData = await j.json();
    const bedrockData = await b.json();

    return {
      online: Boolean(javaData.online || bedrockData.online),
      latency: Date.now() - start,
      players: {
        total: javaData.players?.online ?? 0,
        max: javaData.players?.max ?? null
      },
      playerList: serverTapInfo?.javaPlayers || []
    };
  } catch {
    return {
      online: false,
      latency: null,
      players: {
        total: 0,
        max: null
      },
      playerList: []
    };
  }
}

/* ---------------- UPTIME ---------------- */

function updateUptime(name, online) {
  if (!memory[name]) {
    memory[name] = {
      checks: 0,
      onlineChecks: 0
    };
  }

  const record = memory[name];

  record.checks++;
  if (online) record.onlineChecks++;

  return ((record.onlineChecks / record.checks) * 100).toFixed(2);
}

/* ---------------- MAIN ---------------- */

async function checkService(service, serverTapInfo) {
  const result =
    service.type === "http"
      ? await checkHttp(service)
      : await checkMinecraft(service, serverTapInfo);

  const ip = service.endpoints?.java?.ip || null;
  const ipMeta =
    service.type === "minecraft" && ip ? await getIpMeta(ip) : {};

  const isOnline = result.online;

  return {
    ...service,
    ...result,
    uptime: updateUptime(service.name, isOnline),

    tps: service.type === "minecraft" && isOnline ? serverTapInfo?.tps : null,
    highlightUuid:
      service.type === "minecraft" && isOnline ? HIGHLIGHT_UUID : null,

    players: isOnline ? result.players : { total: 0, max: null },
    playerList: isOnline ? result.playerList : [],

    region: ipMeta.region || null,
    provider: ipMeta.provider || null,
    country: ipMeta.country || null,
    flag: ipMeta.flag || "",

    hostMachine:
      service.type === "minecraft" && isOnline
        ? serverTapInfo?.hostMachine || null
        : null,

    checkedAt: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  const serverTapInfo = await getServerTapInfo();

  const checked = await Promise.all(
    services.map(service => checkService(service, serverTapInfo))
  );

  const visibleServices = checked.filter(s => !s.hidden);

  const groupedServices = visibleServices.reduce((acc, service) => {
    const key = service.category || "Other";
    (acc[key] ||= []).push(service);
    return acc;
  }, {});

  const overallOnline =
    visibleServices.every(service => service.online !== false);

  res.status(200).json({
    checkedAt: new Date().toISOString(),
    groupedServices,
    services: visibleServices,
    overallOnline
  });
}