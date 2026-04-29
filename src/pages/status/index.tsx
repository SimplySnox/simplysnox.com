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

  cpu?: {
    model?: string;
    cores?: number;
    load?: number[];
  };

  memory?: {
    used?: string;
    total?: string;
  };

  uptime?: string;
};

type JellyfinNetwork = {
  public?: {
    provider?: string;
    ip?: string;
  };

  wifi?: {
    connected?: boolean;
    signal?: string;
    quality?: string;
  };
};

type JellyfinSystem = {
  load1m?: string;
  load5m?: string;
  load15m?: string;
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

  state?: "online" | "host_offline" | "service_offline";

  /* Jellyfin */
  network?: JellyfinNetwork;
  system?: JellyfinSystem;
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

    setTimeout(() => el.classList.remove("active"), 900);
  }

  const StatusDot = ({ online }: { online: boolean | null }) => (
    <span
      className={`w-2 h-2 rounded-full ${online ? "bg-green-400" : "bg-red-400"
        }`}
    />
  );

  function parseQuality(q?: string) {
    if (!q) return null;
    const [a, b] = q.split("/").map(Number);
    if (!a || !b) return null;
    return Math.round((a / b) * 100);
  }

  const allServices = Object.values(groups).flat();
  const affectedCount = allServices.filter(s => s.online === false).length;

  return (
    <div className="bg-main min-h-screen flex flex-col items-center p-4 md:p-8">
      <Head>
        <title>Status | Snox</title>
      </Head>

      <div className="max-w-3xl w-full py-20 space-y-10">
        <div
          className={`rounded-xl p-4 border ${overallOnline ? "border-green-500" : "border-red-500"
            }`}
        >
          <div className="text-zinc-100 font-medium">
            {overallOnline
              ? "All systems operational"
              : `Some services experiencing issues • ${affectedCount} affected`}
          </div>

          <div className="text-xs text-stone-400">
            Last checked{" "}
            {checkedAt ? new Date(checkedAt).toLocaleString() : "Unknown"}
          </div>
        </div>

        {Object.entries(groups).map(([category, services]) => (
          <div key={category} className="space-y-3">
            <div className="text-sm text-stone-400 uppercase tracking-wide">
              {category}
            </div>

            {services.map(service => (
              <div
                key={service.name}
                className="rounded-xl p-4 border border-neutral-700 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-zinc-100 flex items-center gap-2">
                      <StatusDot online={service.online} />
                      {service.name}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {service.type === "http" && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300">
                          HTTP
                        </span>
                      )}

                      {service.type === "minecraft" &&
                        service.online &&
                        service.players && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300">
                            {service.players.total}/
                            {service.players.max ?? "?"} players
                          </span>
                        )}
                    </div>
                  </div>

                  <div
                    className={
                      service.online ? "text-green-400" : "text-red-400"
                    }
                  >
                    {service.online ? "Online" : "Offline"}
                  </div>
                </div>

                {/* ---------------- JELLYFIN DEBUG REDESIGN ---------------- */}
                {service.name === "Jellyfin Media Server" &&
                  (service.network || service.system) && (
                    <details>
                      <summary className="text-xs text-stone-400 cursor-pointer">
                        Debug
                      </summary>

                      <div className="mt-3 space-y-3 text-xs text-stone-500">
                        {/* NETWORK */}
                        {service.network && (
                          <div>
                            <div className="text-stone-400 mb-1">
                              Network
                            </div>

                            <div>
                              Provider:{" "}
                              {service.network.public?.provider || "Unknown"}
                            </div>

                            <div className="mt-1">
                              WiFi:{" "}
                              {service.network.wifi?.connected
                                ? "Connected"
                                : "Disconnected"}
                            </div>

                            <div>
                              Signal: {service.network.wifi?.signal || "N/A"}
                            </div>

                            <div>
                              Quality:{" "}
                              {(() => {
                                const pct = parseQuality(
                                  service.network.wifi?.quality
                                );
                                return pct !== null ? `${pct}%` : "N/A";
                              })()}
                            </div>
                          </div>
                        )}

                        {/* SYSTEM */}
                        {service.system && (
                          <div>
                            <div className="text-stone-400 mb-1">System</div>

                            <div>
                              Load: {service.system.load1m} /{" "}
                              {service.system.load5m} /{" "}
                              {service.system.load15m}
                            </div>

                            <br />
                            <div>Uptime: {service.system.uptime}</div>
                            <br />

                            <div>
                              CPU: {service.hostMachine?.cpu?.model || "Unknown"}
                            </div>

                            <div>
                              e-pitt-01: {service.hostMachine?.cpu?.cores ?? "?"} cores
                            </div>

                            <div>
                              RAM {service.hostMachine?.memory?.used || "?"} / {service.hostMachine?.memory?.total || "?"}
                            </div>
                          </div>
                        )}
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