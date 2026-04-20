const services = [
  {
    name: "Website",
    url: "https://simplysnox.com",
  },
  {
    name: "Discord Bot API",
    url: "https://api.simplysnox.com",
  },
  {
    name: "Search",
    url: "https://search.simplysnox.com",
  },
  {
    name: "GitHub",
    url: "https://github.com/simplysnox",
  },
];

async function checkService(service) {
  const start = Date.now();

  try {
    const res = await fetch(service.url, {
      method: "HEAD",
    });

    const latency = Date.now() - start;

    return {
      ...service,
      online: res.ok,
      latency,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      ...service,
      online: false,
      latency: null,
      checkedAt: new Date().toISOString(),
    };
  }
}

export default async function handler(req, res) {
  const results = await Promise.all(
    services.map((service) => checkService(service))
  );

  res.status(200).json(results);
}
