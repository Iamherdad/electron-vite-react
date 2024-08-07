import instance from "../index";
import { Server_Headers } from "../index";
export const getAppList = (config: Server_Headers) => {
  return instance.get("/", config);
};
