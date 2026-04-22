import React, { useEffect, useState } from "react";
import Head from "next/head";
import Navbar from "@/components/Navbar";

type Player = {
  uuid?: string;
  name_raw?: string;
  name_clean?: string;
};

type HostMachine = {
  provider?: string;
  node?: string;
  cpu?: string;
  memory?: string;
  uptime?: string;
};

type Service = {
  name: string;
  category: string;
  type: string;
  url?: string;
  ip?: string;
  port?: number;
  region?: string;
  provider?: string;
  flag?: string;
  online: boolean | null;
  latency: number | null;
  uptime: string;
  players?: number;
  maxPlayers?: number;
  playerList?: Player[];
  hostMachine?: HostMachine | null;
  tps?: string | null;
};

export default function StatusPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [checkedAt, setCheckedAt] = useState("");
  const [overallOnline, setOverallOnline] = useState(true);

  const affectedCount = services.filter(
    service => service.online === false
  ).length;

  async function loadStatus() {
    const res = await fetch("/api/status");
    const data = await res.json();

    setServices(data.services);
    setCheckedAt(data.checkedAt);
    setOverallOnline(data.overallOnline);
  }

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  function getLatencyPill(ms: number | null) {
    if (ms === null) return "bg-zinc-700 text-zinc-300";
    if (ms < 80) return "bg-green-500/10 text-green-400";
    if (ms < 180) return "bg-yellow-500/10 text-yellow-400";
    return "bg-red-500/10 text-red-400";
  }

  return (
    <div className="bg-main min-h-screen flex flex-col items-center p-4 md:p-8">
      <Head>
        <title>Status | Snox</title>
      </Head>

      <div className="max-w-3xl w-full py-20 space-y-6">
        <div className={`rounded-xl p-4 border ${overallOnline ? "border-green-500" : "border-red-500"}`}>
          <div className="text-zinc-100 font-medium">
            {overallOnline
              ? "All systems operational"
              : `Some services experiencing issues • ${affectedCount} affected`}
          </div>
          <div className="text-xs text-stone-400">
            Last checked {checkedAt ? new Date(checkedAt).toLocaleString() : "Unknown"}
          </div>
        </div>

        {services.map(service => (
          <div
            key={service.name}
            className="rounded-xl p-4 border border-neutral-700"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-zinc-100">{service.name}</div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getLatencyPill(service.latency)}`}>
                    {service.latency !== null ? `${service.latency}ms` : "Unavailable"}
                  </span>

                  {service.players !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300">
                      {service.players}/{service.maxPlayers} players
                    </span>
                  )}

                  {service.tps && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300">
                      TPS {service.tps}
                    </span>
                  )}
                </div>
              </div>

              <div className={service.online ? "text-green-400" : "text-red-400"}>
                {service.online ? "Online" : "Offline"}
              </div>
            </div>

            <div className="text-xs text-stone-500 mt-3">
              Uptime: {service.uptime}%
            </div>

            {service.url && (
              <a
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 block mt-2"
              >
                Open service
              </a>
            )}

            {service.ip && (
              <div className="text-xs text-blue-400 mt-2">
                {service.ip}:{service.port}
              </div>
            )}

            {service.region && (
              <div className="text-xs text-stone-500 mt-3">
                {service.flag} {service.region}
              </div>
            )}

            {service.provider && (
              <div className="text-xs text-stone-500">
                {service.provider}
              </div>
            )}

            {service.hostMachine && (
              <div className="text-xs text-stone-500 mt-1">
                {service.hostMachine.node} • CPU {service.hostMachine.cpu}
                <br />
                RAM {service.hostMachine.memory}
              </div>
            )}

            {service.playerList && service.playerList.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-stone-400 cursor-pointer">
                  Online players
                </summary>

                <div className="mt-2 space-y-1 pl-2">
                  {service.playerList.map((player, index) => (
                    <div key={player.uuid || index} className="text-xs text-zinc-300">
                      {player.name_clean || player.name_raw || "Unknown"}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}

        <Navbar />
      </div>
    </div>
  );
}