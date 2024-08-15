import React from "react";

export interface SystemInfo {
  cpu: string;
  memory: string;
  platform: string;
  arch: string;
  release: string;
  version: string;
  userInfo: string;
  network: string;
  softVersion: string;
  coreVersion: string;
  totalmem: string;
  freemem: string;
  coreLastUpdate: number;
}

export const defaultSystemInfo: SystemInfo = {
  cpu: "",
  memory: "",
  platform: "",
  arch: "",
  release: "",
  version: "",
  userInfo: "",
  network: "",
  softVersion: "",
  coreVersion: "",
  totalmem: "",
  freemem: "",
  coreLastUpdate: 0,
};

const systemContext = React.createContext<{
  systemInfo: SystemInfo;
}>({
  systemInfo: defaultSystemInfo,
});

export default systemContext;
