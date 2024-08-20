import instance from "../index";
import { Server_Headers } from "../index";

export const getAppList = (config: Server_Headers) => {
  return instance.get("/", config);
};

export const getInstalledAppList = (config: Server_Headers) => {
  console.log("被执行");
  window.ipcRenderer.send("kp-system", {
    type: "get-app-list",
    data: [],
  });
  return [];
};
