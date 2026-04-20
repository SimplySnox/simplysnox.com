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
      latency: Date.now() - start
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

    const res = await fetchWithTimeout(endpoint, 3500);
    const data = await res.json();

    return {
      online: data.online ?? false,
      latency: data.debug?.ping ?? null,
      players: data.players?.online,
      maxPlayers: data.players?.max,
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

function updateUptime(name, online) {
  if (!memory[name]) {
    memory[name] = {
      checks: 0,
      onlineChecks: 0,
      incidents: [],
      lastOnline: null
    };
  }

  const record = memory[name];

  if (online !== null) {
    if (record.lastOnline !== null && record.lastOnline !== online) {
      record.incidents.unshift({
        time: new Date().toISOString(),
        status: online ? "Recovered" : "Offline"
      });

      record.incidents = record.incidents.slice(0, 5);
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

async function checkService(service) {
  const result =
    service.type === "http"
      ? await checkHttp(service)
      : await checkMinecraft(service);

  const stats = updateUptime(service.name, result.online);

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
    services: results
  });
}