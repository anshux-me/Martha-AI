"use client";
import { createContext, useContext, useState } from "react";
import { useMarthaAgent, type MarthaAgent, type Mode } from "@/hooks/useMarthaAgent";

type AgentUI = {
  agent: MarthaAgent;
  isOpen: boolean;
  /** Open the panel. Call from a click handler so voice can unlock audio. */
  open: (mode: Mode, prompt?: string) => void;
  close: () => void;
};

const Ctx = createContext<AgentUI | null>(null);

function micPreviouslyGranted(): boolean {
  try {
    return window.localStorage.getItem("martha.mic") === "1";
  } catch {
    return false;
  }
}

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const agent = useMarthaAgent();
  const [isOpen, setOpen] = useState(false);

  const open = (mode: Mode, prompt?: string) => {
    setOpen(true);
    if (agent.status === "report" || agent.status === "ending") {
      if (!prompt) return; // show the finished call's report; "Start new conversation" lives there
      agent.newConversation();
    }
    const busy = ["connecting", "listening", "transcribing", "thinking", "speaking"].includes(agent.status);
    if (mode === "chat") {
      if (agent.mode === "voice" && busy) void agent.switchMode("chat");
      agent.startChat(prompt);
      return;
    }
    if (busy && agent.mode === "voice") return; // call already running
    if (micPreviouslyGranted()) void agent.startVoice(prompt);
    else agent.setPrimer(); // panel shows the microphone primer first
  };

  const close = () => {
    setOpen(false);
    void agent.pause();
  };

  return <Ctx.Provider value={{ agent, isOpen, open, close }}>{children}</Ctx.Provider>;
}

export function useAgentUI(): AgentUI {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAgentUI must be used inside <AgentProvider>");
  return v;
}
