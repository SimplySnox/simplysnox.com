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
    host: "cove.simplysnox.com"
  },
  {
    name: "Cove Bedrock",
    category: "Minecraft",
    type: "minecraft-bedrock",
    host: "covebr.simplysnox.com",
    port: 25830
  }
];

const memory = {};

async function fetchWithTimeout(url, timeout = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store"
    });

    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function checkHttp(service) {
  const start = Date.now();

  try {
    await fetchWithTimeout(service.url, 3000);

    return {
      online: true,
      latency: Date.now() - start
    };
  } catch {
    return {
      online: false,
      latency: null
    };
  }
}

async function checkJava(service) {
  try {
    const res = await fetchWithTimeout(
      `https://api.mcstatus.io/v2/status/java/${service.host}`,
      3500
    );

    const data = await res.json();

    return {
      online: data.online,
      latency: data.debug?.ping ?? null,
      players: data.players?.online,
      maxPlayers: data.players?.max,
      motd: data.motd?.clean?.join(" ") || null
    };
  } catch {
    return {
      online: false,
      latency: null
    };
  }
}

async function checkBedrock(service) {
  try {
    const res = await fetchWithTimeout(
      `https://api.mcstatus.io/v2/status/bedrock/${service.host}:${service.port}`,
      3500
    );

    const data = await res.json();

    return {
      online: data.online,
      latency: data.debug?.ping ?? null,
      players: data.players?.online,
      maxPlayers: data.players?.max,
      motd: data.motd?.clean?.join(" ") || null
    };
  } catch {
    return {
      online: false,
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

  return {
    uptime: ((record.onlineChecks / record.checks) * 100).toFixed(2),
    incidents: record.incidents
  };
}

async function checkService(service) {
  let result;

  switch (service.type) {
    case "http":
      result = await checkHttp(service);
      break;
    case "minecraft-java":
      result = await checkJava(service);
      break;
    case "minecraft-bedrock":
      result = await checkBedrock(service);
      break;
    default:
      result = {
        online: false,
        latency: null
      };
  }

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
    services.map((service) => checkService(service))
  );

  res.setHeader("Cache-Control", "no-store");

  res.status(200).json({
    generatedIn: Date.now() - started,
    services: results
  });
}