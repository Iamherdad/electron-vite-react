import { Button } from "antd";
import styles from "./app-item.module.css";
import Extension, { ExtensionType } from "../../components/extension/Extension";
import { useEffect, useState } from "react";

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

const AppItem = (props: AppItemProps): JSX.Element => {
  const {
    name,
    desc,
    icon,
    version,
    type,
    extensions,
    startPath,
    startType,
    isInstall,
    isUpdate,
    appResource,
  } = props;
  // console.log("AppItem", props);

  const [mainProcessStatus, setMainProcessStatus] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState(
    new Map<string, boolean>(extensions.map((item) => [item.name, false]))
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.ipcRenderer.on(
      "extension-status",
      (event, { mainName, name: extName, status }) => {
        if (mainName !== name) return;

        console.log(`扩展 ${extName} is ${status}`);
        switch (status) {
          case "running":
            setExtensionStatus(new Map(extensionStatus.set(extName, true)));
            break;
          case "closed":
            setExtensionStatus(new Map(extensionStatus.set(extName, false)));
            break;
          default:
            break;
        }
      }
    );

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
            break;
          case "closed":
            setMainProcessStatus(false);
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
        {/* <div className={styles.extensionContainer}>
          <div className={styles.extensionTitle}>依赖模块:</div>
          <div className={styles.extensionBody}>
            {extensions.map((ite: ExtensionType, ind) => {
              return (
                <div key={ind} className={styles.extension}>
                  <Extension
                    status={extensionStatus.get(ite.name) || false}
                    mainProcessStatus={mainProcessStatus}
                    {...ite}
                  />
                </div>
              );
            })}
          </div>
        </div> */}

        <div className={styles.button}>
          {isInstall ? (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default AppItem;
