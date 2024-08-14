import { Button, message } from "antd";
import styles from "./app-item.module.css";

import { useEffect, useMemo, useState } from "react";
import type, { ButtonProps } from "antd";

export interface AppItemProps {
  name: string;
  desc: string;
  icon: string;
  version: string;
  type?: number;
  appResource: string;
  startPath: string;
  startType: string;
  isInstall?: boolean;
  isUpdate?: boolean;
  updateDesc: String;
}

const comBtnText = (
  isInstall: boolean,
  isUpdate: boolean,
  type: number,
  mainProcessStatus: boolean
) => {
  switch (type) {
    case 1:
      return mainProcessStatus ? "运行中" : "启动";
    case 2:
      return isInstall ? (isUpdate ? "更新" : "已安装") : "安装";
    default:
      break;
  }
};

const AppItem = (props: AppItemProps): JSX.Element => {
  const {
    name,
    desc,
    icon,
    version,
    type = 1,
    startPath,
    startType,
    isInstall,
    isUpdate,
    appResource,
    updateDesc,
  } = props;
  const [messageApi, contextHolder] = message.useMessage();
  const [mainProcessStatus, setMainProcessStatus] = useState(false);

  const [loading, setLoading] = useState(false);
  const [btnText, setBtnText] = useState(
    comBtnText(isInstall || false, isUpdate || false, type, mainProcessStatus)
  );

  useEffect(() => {
    // 监听主进程发送的主进程状态
    window.ipcRenderer.on(
      "main-process-status",
      (event, { name: mainName, status }) => {
        if (mainName !== name) return;

        switch (status) {
          case "running":
            setMainProcessStatus(true);
            setLoading(true);
            setBtnText("运行中");
            break;
          case "closed":
            setMainProcessStatus(false);
            setLoading(false);
            setBtnText(
              comBtnText(isInstall || false, isUpdate || false, type, false)
            );
            break;
          default:
            break;
        }
      }
    );

    //监听主进程发送的安装状态
    window.ipcRenderer.on(
      "install-app-status",
      (event, { name: mainName, status, message }) => {
        if (mainName !== name) return;
        switch (status) {
          case "pending":
            setLoading(true);
            setBtnText(message);
            break;
          case "fail":
            setLoading(false);
            messageApi.error(message);
            setBtnText("安装");
            break;
          case "success":
            setLoading(false);
            messageApi.success(message);
            setBtnText("已安装");
            break;
          default:
            break;
        }
      }
    );
  }, []);

  useEffect(() => {
    setBtnText(
      comBtnText(isInstall || false, isUpdate || false, type, mainProcessStatus)
    );
  }, [mainProcessStatus, isInstall, isUpdate, type, mainProcessStatus]);

  const handleClick = (event: React.MouseEvent<HTMLElement>, type?: Number) => {
    if (type == 1) {
      startApp();
    } else {
      installApp(isUpdate);
    }
  };

  const startApp = () => {
    const data = {
      name,
      version,
      startPath,
      startType,
      icon,
    };

    window.ipcRenderer.send("kp-system", {
      type: "start-app",
      data: JSON.stringify(data),
    });
  };

  const installApp = (isUpdate?: boolean) => {
    window.ipcRenderer.send("kp-system", {
      type: "install-app",
      data: JSON.stringify({
        name,
        desc,
        icon,
        appResource,
        startPath,
        startType,
        version,
        isUpdate,
        updateDesc,
      }),
    });
  };

  return (
    <>
      {contextHolder}
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.icon}>
            <img src={icon} alt="" />
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.name}>
            <h3>{name}</h3>
            <span className={styles.version}>{`v${version}`}</span>
          </div>
          <div className={styles.desc}>{desc}</div>

          <div className={styles.button}>
            <Button
              type="primary"
              disabled={btnText == "已安装" ? true : false}
              loading={loading}
              onClick={(event) => handleClick(event, type)}
            >
              {btnText}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AppItem;
