import React, { useEffect, useState } from "react";
import Head from "next/head";
import Navbar from "@/components/Navbar";

type Player = {
  uuid?: string;
  name_clean?: string;
  platform?: "Java" | "Bedrock";
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
  online: boolean | null;
  uptime: string;
  url?: string;
  hideUrl?: boolean;
  region?: string;
  provider?: string;
  flag?: string;

  endpoints?: {
    java: {
      address: string;
      ip: string;
      port: number;
    };
    bedrock: {
      address: string;
      ip: string;
      port: number;
    };
  };

  players?: {
    total: number;
    max: number | null;
  };

  latency?: number | null;
  playerList?: Player[];
  hostMachine?: HostMachine | null;
  tps?: string | null;
  highlightUuid?: string;
};

export default function StatusPage() {
  const [groups, setGroups] = useState<Record<string, Service[]>>({});
  const [checkedAt, setCheckedAt] = useState("");
  const [overallOnline, setOverallOnline] = useState(true);

  async function loadStatus() {
    const res = await fetch("/api/status");
    const data = await res.json();

    setGroups(data.groupedServices || {});
    setCheckedAt(data.checkedAt || "");
    setOverallOnline(data.overallOnline ?? true);
  }

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  function copy(text: string, el: HTMLElement) {
    if (!text) return;

    navigator.clipboard?.writeText(text);

    el.classList.remove("active");
    void el.offsetWidth;
    el.classList.add("active");

    setTimeout(() => {
      el.classList.remove("active");
    }, 900);
  }

  const allServices = Object.values(groups).flat();
  const affectedCount = allServices.filter(s => s.online === false).length;

  const StatusDot = ({ online }: { online: boolean | null }) => (
    <span className={`w-2 h-2 rounded-full ${online ? "bg-green-400" : "bg-red-400"}`} />
  );

  return (
    <div className="bg-main min-h-screen flex flex-col items-center p-4 md:p-8">
      <Head>
        <title>Status | Snox</title>
      </Head>

      <div className="max-w-3xl w-full py-20 space-y-10">
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

        {Object.entries(groups).map(([category, services]) => (
          <div key={category} className="space-y-3">
            <div className="text-sm text-stone-400 uppercase tracking-wide">{category}</div>

            {services.map(service => (
              <div key={service.name} className="rounded-xl p-4 border border-neutral-700 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-zinc-100 flex items-center gap-2">
                      <StatusDot online={service.online} />
                      {service.name}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {service.type === "http" && (
                        <>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300">
                            HTTP
                          </span>

                          {service.category === "Web" && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400">
                              WEB
                            </span>
                          )}

                          {service.category === "Media" && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-400">
                              MEDIA
                            </span>
                          )}
                        </>
                      )}

                      {service.players && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300">
                          {service.players.total}/{service.players.max ?? "?"} players
                        </span>
                      )}

                      {service.type === "minecraft" && service.tps && (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${Number(service.tps) >= 18
                          ? "bg-green-500/10 text-green-400"
                          : "bg-zinc-800 text-zinc-300"
                          }`}>
                          TPS {service.tps}
                        </span>
                      )}

                      {service.type === "minecraft" && service.latency != null && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300">
                          {service.latency}ms
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={service.online ? "text-green-400" : "text-red-400"}>
                    {service.online ? "Online" : "Offline"}
                  </div>
                </div>

                {service.type === "http" && service.url && !service.hideUrl && (
                  <a
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 block"
                  >
                    Open service
                  </a>
                )}

                {service.playerList?.length ? (
                  <details>
                    <summary className="text-xs text-stone-400 cursor-pointer">Players</summary>

                    <div className="mt-2 space-y-2 pl-1">
                      {service.playerList.map((player, index) => {
                        const highlighted = player.uuid === service.highlightUuid;

                        return (
                          <div
                            key={player.uuid || index}
                            className={`flex items-center justify-between text-xs ${highlighted ? "text-yellow-300" : "text-zinc-300"
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              {player.uuid && (
                                <img
                                  src={`https://mc-heads.net/avatar/${player.uuid}/24`}
                                  alt={player.name_clean || "Player"}
                                  className="w-5 h-5 rounded-sm"
                                />
                              )}

                              <span>{player.name_clean || "Unknown"}</span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${player.platform === "Bedrock"
                                ? "bg-emerald-500/10 text-emerald-300"
                                : "bg-orange-500/10 text-orange-300"
                                }`}
                            >
                              {player.platform || "Java"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ) : null}

                {(service.region || service.provider || service.hostMachine) && (
                  <details className="mt-2">
                    <summary className="text-xs text-stone-400 cursor-pointer">
                      Debug
                    </summary>

                    <div className="mt-3 space-y-3 text-xs text-stone-500">
                      {(service.region || service.provider) && (
                        <div>
                          {service.region && (
                            <div>
                              {service.flag} {service.region}
                            </div>
                          )}
                          {service.provider && <div>{service.provider}</div>}
                        </div>
                      )}

                      {service.hostMachine && (
                        <div>
                          {service.hostMachine.node}
                          {service.hostMachine.cpu &&
                            ` • CPU ${service.hostMachine.cpu}`}
                          <br />
                          {service.hostMachine.memory &&
                            `RAM ${service.hostMachine.memory}`}
                          {service.hostMachine.uptime &&
                            ` • Up ${service.hostMachine.uptime}`}
                        </div>
                      )}

                      <div>
                        Uptime:{" "}
                        {service.uptime === "N/A"
                          ? "N/A"
                          : `${service.uptime}%`}
                      </div>
                    </div>
                  </details>
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