import React, { FC, useContext, useEffect, useMemo, useState } from "react";
import AppItem from "../../components/app/app";
import { useLoaderData } from "react-router-dom";
import { AppItemProps } from "../../components/app/app";
import styles from "./appApps.module.css";
import { Button, Badge, App } from "antd";
import systemContext from "@/context/systemContext";
import Ribbon from "@/components/ribbon/ribbon";
import Install from "@/components/install/install";
import { getInstalledAppList } from "@/service/api/app";

const MyApp: FC = () => {
  const remoteAppList = useLoaderData() as AppItemProps[];
  const localAppList = useContext(systemContext).localAppList;
  const { message: Message, notification } = App.useApp();
  const [installQueue, setInstallQueuq] = useState<string[]>([]);

  // 计算应用是否需要更新
  const allAppList = useMemo(() => {
    const res = remoteAppList.map((item) => {
      const localItem = localAppList.find(
        (localItem) => localItem.name === item.name
      );
      const inInstall = !!localItem;
      const isUpdate = inInstall && localItem.version !== item.version;
      return {
        ...item,
        inInstall,
        isUpdate,
      };
    });

    return res;
  }, [remoteAppList, localAppList]);

  const installApp = (data: AppItemProps, isUpdate: boolean) => {
    console.log("installApp", data);
    if (installQueue.includes(data.name)) {
      Message.error("正在安装中，请稍等");
      return;
    }
    setInstallQueuq([...installQueue, data.name]);
    notification.open({
      key: data.name,
      message: `${data.name}-安装`,
      description: <Install text="安装中" name={data.name} />,
      duration: null,
      closeIcon: null,
    });
    window.ipcRenderer.send("kp-system", {
      type: "install-app",
      data: JSON.stringify(data),
    });
  };

  useEffect(() => {
    window.ipcRenderer.on("install-app-reply", (event, arg) => {
      const { name, status, message } = JSON.parse(arg);
      console.log("install-app-reply", status, message);
      switch (status) {
        case "pending":
          notification.open({
            key: name,
            message: `${name}-安装`,
            description: <Install text={message} name={name} />,
            duration: null,
            closeIcon: null,
          });
          break;
        case "success":
          console.log("安装成功");
          notification.success({
            key: name,
            message: `${name}-安装`,
            description: message,
            duration: 1.5,
          });
          setInstallQueuq(installQueue.filter((item) => item !== name));
          getInstalledAppList({});
          break;
        case "fail":
          Message.error(message);
          notification.destroy(name);
          setInstallQueuq(installQueue.filter((item) => item !== name));

          break;
      }
    });
  }, []);

  return (
    <div className={styles.container}>
      {allAppList.map((item, ind) => {
        const { isUpdate, updateDesc, inInstall } = item;
        return (
          <div key={ind} className={styles.appContainer}>
            {inInstall ? (
              isUpdate ? (
                <Badge.Ribbon
                  text={<Ribbon content={updateDesc} />}
                  color="#52c41a"
                >
                  <AppItem {...item}>
                    <Button
                      type="primary"
                      onClick={() => installApp(item, true)}
                    >
                      更新
                    </Button>
                  </AppItem>
                </Badge.Ribbon>
              ) : (
                <AppItem {...item}>
                  <Button type="primary" disabled>
                    已安装
                  </Button>
                </AppItem>
              )
            ) : (
              <AppItem {...item}>
                <Button type="primary" onClick={() => installApp(item, false)}>
                  安装
                </Button>
              </AppItem>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MyApp;
