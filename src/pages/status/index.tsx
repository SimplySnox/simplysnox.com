import React, { useEffect, useState } from "react";
import Head from "next/head";
import Navbar from "@/components/Navbar";

type Incident = {
  time: string;
  status: string;
};

type Service = {
  name: string;
  category: string;
  online: boolean | null;
  latency: number | null;
  uptime: string;
  players?: number;
  maxPlayers?: number;
  incidents?: Incident[];
};

export default function StatusPage() {
  const [services, setServices] = useState<Service[]>([]);

  async function loadStatus() {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setServices(data.services);
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
  }

  useEffect(() => {
    loadStatus();

    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const grouped = services.reduce<Record<string, Service[]>>(
    (acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }

      acc[service.category].push(service);
      return acc;
    },
    {}
  );

  return (
    <div className="bg-main min-h-screen flex flex-col items-center antialiased p-4 md:p-8">
      <Head>
        <title>Status | Snox</title>
      </Head>

      <div className="max-w-2xl w-full py-24 md:py-16 space-y-8">
        <div>
          <h1 className="text-2xl text-zinc-100 font-medium">
            Service Status
          </h1>
          <p className="text-stone-400 text-sm">
            Automatically refreshes every 30 seconds
          </p>
        </div>

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider text-stone-500">
              {category}
            </h2>

            {items.map((service) => (
              <div
                key={service.name}
                className="border border-neutral-800 rounded-xl p-4 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-zinc-100">{service.name}</div>
                    <div className="text-xs text-stone-400">
                      {service.latency !== null
                        ? `${service.latency}ms`
                        : "Unavailable"}

                      {service.players !== undefined &&
                        ` • ${service.players}/${service.maxPlayers} players`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${service.online
                          ? "bg-green-400"
                          : "bg-red-400"
                          }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-3 w-3 ${service.online
                          ? "bg-green-500"
                          : "bg-red-500"
                          }`}
                      />
                    </span>

                    <span
                      className={`text-sm ${service.online
                        ? "text-green-400"
                        : "text-red-400"
                        }`}
                    >
                      {service.online === null
                        ? "Unknown"
                        : service.online
                          ? "Online"
                          : "Offline"}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-stone-500">
                  Uptime: {service.uptime}%
                </div>

                {service.incidents &&
                  service.incidents.length > 0 && (
                    <div className="pt-2 border-t border-neutral-800">
                      <div className="text-xs text-stone-500 mb-1">
                        Recent incidents
                      </div>

                      {service.incidents.map((incident, i) => (
                        <div
                          key={i}
                          className="text-xs text-stone-400 flex justify-between"
                        >
                          <span>{incident.status}</span>
                          <span>
                            {new Date(
                              incident.time
                            ).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ))}
          </div>
        ))}

        <Navbar />
      </div>
    </div>
  );
}