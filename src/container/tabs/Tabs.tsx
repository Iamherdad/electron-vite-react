import React, { useEffect } from "react";
import { Tabs } from "antd";
import type { TabsProps } from "antd";
import AppList from "../app-list/App-list";
import { AppItemProps } from "../app-item/App-item";
import { getAppList } from "../../service/api/app";

const TABS_STYLE: Partial<TabsProps> = {
  tabPosition: "left",
  type: "card" as TabsProps["type"],
  size: "large",
};

const renderAppList = (data: AppItemProps[], type: number) => {
  return <AppList data={data} type={type} />;
};

const TabsCom = (): JSX.Element => {
  const [localAppData, setLocalAppData] = React.useState<AppItemProps[]>([]);
  const [remoteAppData, setRemoteAppData] = React.useState<AppItemProps[]>([]);

  useEffect(() => {
    console.log("组件更新");
    getLocalAppData();
    window.ipcRenderer.on("get-app-list-reply", (event, arg) => {
      setLocalAppData(JSON.parse(arg));
      console.log("渲染进程获取数据", JSON.parse(arg));
    });
  }, []);

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "已安装",
      children: renderAppList(localAppData, 1),
    },
    {
      key: "2",
      label: "全部",
      children: renderAppList(remoteAppData, 2),
    },
  ];

  const getLocalAppData = () => {
    window.ipcRenderer.send("get-app-list", localAppData);
  };

  const getRemoteAppData = async () => {
    getLocalAppData();
    return await getAppList();
  };

  const handleTabChange = async (key: string) => {
    if (key === "2") {
      //获取本地数据
      // getLocalAppData();
      const remoteAppData: any = await getRemoteAppData();
      const res = remoteAppData.map((remoteItem: any) => {
        const isInstalled = localAppData.some(
          (localItem) => localItem.name === remoteItem.name
        );
        return { ...remoteItem, isInstall: isInstalled };
      });

      setRemoteAppData(res);
    } else {
      getLocalAppData();
    }
  };

  return (
    <Tabs
      defaultActiveKey="1"
      items={items}
      onChange={(activeKey) => handleTabChange(activeKey)}
      {...TABS_STYLE}
    />
  );
};

export default TabsCom;
