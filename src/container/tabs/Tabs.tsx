import React, { useEffect } from "react";
import ReactDOM, { render } from "react-dom";
import { Tabs } from "antd";
import type { TabsProps } from "antd";
import AppList from "../app-list/App-list";
import { AppItemProps } from "../app-item/App-item";
import { getAppList } from "../../service/api/app";
import Loading from "@/components/loading/loading";
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
    window.ipcRenderer.send("get-app-list");
  };

  const getRemoteAppData = async () => {
    getLocalAppData();
    return await getAppList({
      headers: {
        mountNode: ".ant-tabs-content-holder",
      },
    });
  };

  const handleTabChange = async (key: string) => {
    if (key === "2") {
      //获取本地数据
      showLoading();
      try {
        const remoteAppData: any = await getRemoteAppData();
        const res = remoteAppData.map((remoteItem: any) => {
          const isInstall = localAppData.some(
            (localItem) => localItem.name === remoteItem.name
          );

          const isUpdate = localAppData.some((localItem) => {
            return (
              localItem.name === remoteItem.name &&
              localItem.version !== remoteItem.version
            );
          });
          return { ...remoteItem, isInstall, isUpdate };
        });

        hideLoading();
        setRemoteAppData(res);
      } catch (e) {
        console.log(e);
        hideLoading();
      }
    } else {
      getLocalAppData();
    }
  };

  const showLoading = () => {
    console.log("showloading");
    const dom = document.createElement("div");
    dom.setAttribute("id", "kp-loading");
    const parentNode = document.querySelector(".ant-tabs-content-holder");

    const parentNodeBgColor = window.getComputedStyle(
      parentNode as Element
    ).backgroundColor;

    dom.style.cssText = `position: absolute;width:100%;height:100%; top:0;left: 0; right: 0; bottom: 0; background: ${parentNodeBgColor}; display: flex; align-items: center; justify-content: center; z-index: 9999; font-size: 20px;`;
    if (parentNode) {
      parentNode.appendChild(dom);
      parentNode.appendChild(dom);

      render(<Loading />, dom);
    }
  };

  const hideLoading = () => {
    const dom = document.getElementById("kp-loading");
    if (dom && dom.parentNode) {
      console.log("hideLoading");
      {
        dom.parentNode.removeChild(dom);
      }
    }
  };

  return (
    <Tabs
      defaultActiveKey="1"
      items={items}
      onChange={(activeKey) => handleTabChange(activeKey)}
      {...TABS_STYLE}
      tabBarStyle={{ position: "relative" }}
    />
  );
};

export default TabsCom;
