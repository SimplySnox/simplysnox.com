import React, { useEffect, useState } from "react";
import Head from "next/head";
import Navbar from "@/components/Navbar";

type Incident = {
  time: string;
  status: string;
};

type Player = {
  uuid?: string;
  name_raw?: string;
  name_clean?: string;
};

type HostMachine = {
  node: string;
  cpu: string;
  memory: string;
  disk: string;
  uptime: string;
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
  checkedAt: string;
  tunnelError?: boolean;
  players?: number;
  maxPlayers?: number;
  playerList?: Player[];
  incidents?: Incident[];
  hostMachine?: HostMachine;
};

export default function StatusPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [checkedAt, setCheckedAt] = useState("");
  const [overallOnline, setOverallOnline] = useState(true);

  async function loadStatus() {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();

      setServices(data.services);
      setCheckedAt(data.checkedAt);
      setOverallOnline(data.overallOnline);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  const categoryColors: Record<string, string> = {
    Web: "border-blue-500",
    Minecraft: "border-green-500"
  };

  return (
    <div className="bg-main min-h-screen flex flex-col items-center p-4 md:p-8">
      <Head>
        <title>Status | Snox</title>
      </Head>

      <div className="max-w-3xl w-full py-20 space-y-6">
        <div className={`rounded-xl p-4 border ${overallOnline ? "border-green-500" : "border-red-500"}`}>
          <div className="text-zinc-100 font-medium">
            {overallOnline ? "All systems operational" : "Some services experiencing issues"}
          </div>
          <div className="text-xs text-stone-400">
            Last checked {checkedAt ? new Date(checkedAt).toLocaleString() : "Unknown"}
          </div>
        </div>

        {services.map(service => (
          <div
            key={service.name}
            className={`rounded-xl p-4 border ${categoryColors[service.category] || "border-neutral-700"}`}
          >
            <div className="flex justify-between">
              <div>
                <div className="text-zinc-100">{service.name}</div>
                <div className="text-xs text-stone-400">
                  {service.latency !== null && `${service.latency}ms`}
                  {service.players !== undefined && (
                    <>
                      {service.latency !== null && " • "}
                      {service.players}/{service.maxPlayers} players
                    </>
                  )}
                </div>
              </div>

              <div className={service.online ? "text-green-400" : "text-red-400"}>
                {service.online ? "Online" : "Offline"}
              </div>
            </div>

            <div className="text-xs text-stone-500 mt-2">
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
              <button
                onClick={() => copy(`${service.ip}:${service.port}`)}
                className="text-xs text-blue-400 mt-2"
              >
                Copy {service.ip}:{service.port}
              </button>
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

            {service.region && (
              <div className="text-xs text-stone-500 mt-2">
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
              </div>
            )}
          </div>
        ))}

        <Navbar />
      </div>
    </div>
  );
}