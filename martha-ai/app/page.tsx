"use client";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { AgentProvider } from "@/components/agent/AgentProvider";
import { Landing } from "@/components/landing/Landing";

export default function Home() {
  return (
    <AgentProvider>
      <Landing />
      <AgentPanel />
    </AgentProvider>
  );
}
