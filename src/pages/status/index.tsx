import React, { useEffect, useState } from "react";
import Head from "next/head";
import Navbar from "@/components/Navbar";

type Service = {
  name: string;
  url: string;
  online: boolean;
  latency: number | null;
  checkedAt: string;
};

export default function StatusPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setServices(data);
    } catch (err) {
      console.error("Failed to load status:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(fetchStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const onlineCount = services.filter((s) => s.online).length;

  return (
    <div className="bg-main min-h-screen flex flex-col items-center antialiased p-4 md:p-8">
      <Head>
        <title>Status | Snox</title>
      </Head>

      <div className="max-w-2xl w-full py-24 md:py-16 space-y-6">
        <div>
          <h1 className="text-2xl text-zinc-100 font-medium">Service Status</h1>
          <p className="text-stone-400 text-sm mt-1">
            {loading
              ? "Checking services..."
              : `${onlineCount}/${services.length} services operational`}
          </p>
        </div>

        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.name}
              className="border border-neutral-800 rounded-xl p-4 flex justify-between items-center"
            >
              <div>
                <div className="text-zinc-100">{service.name}</div>
                <div className="text-xs text-stone-400">
                  {service.latency !== null
                    ? `${service.latency}ms`
                    : "Unavailable"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    service.online ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span
                  className={`text-sm ${
                    service.online ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {service.online ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-stone-500">
          Auto-refreshes every 30 seconds
        </div>

        <Navbar />
      </div>
    </div>
  );
}
