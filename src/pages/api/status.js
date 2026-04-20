import mcs from "node-mcstatus";

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
    host: "cove.simplysnox.com",
    port: 25565
  },
  {
    name: "Cove Bedrock",
    category: "Minecraft",
    type: "minecraft-bedrock",
    host: "covebr.simplysnox.com",
    port: 25830
  }
];

// in-memory tracking
const memory = {};

async function checkHttp(service) {
  const start = Date.now();

  try {
    const res = await fetch(service.url, { method: "HEAD" });
    return {
      online: res.ok,
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
    const res = await mcs.statusJava(service.host, service.port, {
      query: true
    });

    return {
      online: res.online,
      latency: res.latency || null,
      players: res.players?.online,
      maxPlayers: res.players?.max,
      motd: res.motd?.clean
    };
  } catch {
    return { online: false, latency: null };
  }
}

async function checkBedrock(service) {
  try {
    const res = await mcs.statusBedrock(service.host, service.port);

    return {
      online: res.online,
      latency: res.latency || null,
      players: res.players?.online,
      maxPlayers: res.players?.max,
      motd: res.motd?.clean
    };
  } catch {
    return { online: false, latency: null };
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

export default async function handler(req, res) {
  const results = await Promise.all(
    services.map(async (service) => {
      let result;

      if (service.type === "http") {
        result = await checkHttp(service);
      } else if (service.type === "minecraft-java") {
        result = await checkJava(service);
      } else if (service.type === "minecraft-bedrock") {
        result = await checkBedrock(service);
      }

      const stats = updateUptime(service.name, result.online);

      return {
        ...service,
        ...result,
        ...stats,
        checkedAt: new Date().toISOString()
      };
    })
  );

  res.status(200).json(results);
}