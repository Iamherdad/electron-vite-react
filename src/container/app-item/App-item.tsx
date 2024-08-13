import { Button } from "antd";
import styles from "./app-item.module.css";
import Extension, { ExtensionType } from "../../components/extension/Extension";
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
  extensions: ExtensionType[];
}

const comBtnText = (
  isInstall: boolean,
  isUpdate: boolean,
  type: number,
  mainProcessStatus: boolean
) => {
  if (isInstall) {
    return isUpdate ? "更新" : "已安装";
  } else {
    return type == 1 ? (mainProcessStatus ? "运行中" : "启动") : "安装";
  }
};

const AppItem = (props: AppItemProps): JSX.Element => {
  const {
    name,
    desc,
    icon,
    version,
    type = 1,
    extensions,
    startPath,
    startType,
    isInstall,
    isUpdate,
    appResource,
  } = props;

  const [mainProcessStatus, setMainProcessStatus] = useState(false);

  const [loading, setLoading] = useState(false);
  const [btnText, setBtnText] = useState(
    comBtnText(isInstall || false, isUpdate || false, type, mainProcessStatus)
  );

  const btnType: ButtonProps["type"] = useMemo(() => {
    switch (btnText) {
      case "更新":
        return "primary";
      case "已安装":
        return "primary";
      case "运行中":
        return "primary";
      case "启动":
        return "primary";
      case "安装":
        return "primary";
      default:
        return "primary";
    }
  }, [btnText]);

  useEffect(() => {
    // 监听主进程发送的主进程状态
    window.ipcRenderer.on(
      "main-process-status",
      (event, { name: mainName, status }) => {
        if (mainName !== name) return;
        console.log(`主进程 ${name} is ${status}`);
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
      "install-status",
      (event, { name: mainName, status, message }) => {
        if (mainName !== name) return;
        console.log(`安装 ${name} is ${status}`);
        switch (status) {
          case "pending":
            setLoading(true);
            break;
          case "fail":
            setLoading(false);
            break;
          case "success":
            setLoading(false);
            break;
          default:
            break;
        }
      }
    );
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>, type?: Number) => {
    if (type == 1) {
      console.log("启动");
      startApp();
    } else {
      console.log("安装");
      installApp();
    }
  };

  const startApp = () => {
    const extensions = props.extensions.map((item) => {
      return {
        name: item.name,
        version: item.version,
        startPath: item.startPath,
        startType: item.startType,
        icon: item.icon,
      };
    });

    const data = {
      name,
      version,
      startPath,
      startType,
      extensions,
      icon,
    };

    window.ipcRenderer.send("start-app", JSON.stringify(data));
  };

  const installApp = () => {
    console.log("installApp", appResource);
    window.ipcRenderer.send(
      "install-app",
      JSON.stringify({
        name,
        desc,
        icon,
        appResource,
        startPath,
        startType,
        version,
        extensions,
      })
    );
  };

  return (
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
            type={btnType}
            disabled={btnText == "已安装" ? true : false}
            loading={loading}
            onClick={(event) => handleClick(event, type)}
          >
            {btnText}
          </Button>
          {/* {isInstall ? (
             isUpdate ? (
              <Button type="primary">更新</Button>
            ) : (
              <Button type="primary" disabled>
                已安装
              </Button>
            )
          ) : (
            <Button
              type="primary"
              onClick={(event) => handleClick(event, type)}
              loading={loading}
            >
              {type == 1 ? (mainProcessStatus ? "运行中" : "启动") : "安装"}
            </Button>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default AppItem;
