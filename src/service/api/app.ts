import instance from "../index";

export const getAppList = () => {
  return instance.get("http://cdn.bilibili.games/index.json");
};
