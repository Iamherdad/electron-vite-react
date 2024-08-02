import { Button } from "antd";
import styles from "./app-item.module.css";
import Extension, { ExtensionType } from "../extension/Extension";
import { useEffect } from "react";

export interface AppItemProps {
  name: string;
  desc: string;
  icon: string;
  version: string;
  type?: number;
  appResource: string;
  startPath: string;
  startType: string;
  extensions: ExtensionType[];
}

const AppItem = (props: AppItemProps): JSX.Element => {
  const { name, desc, icon, version, type, extensions, startPath, startType } =
    props;

  useEffect(() => {
    window.ipcRenderer.on("extension-status", (event, { name, status }) => {
      console.log(`扩展 ${name} is ${status}`);
    });

    // 监听主进程发送的主进程状态
    window.ipcRenderer.on("main-process-status", (event, { status }) => {
      console.log(`主进程 ${status}`);
      // 更新UI显示主进程状态
    });
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>, type?: Number) => {
    if (type == 1) {
      console.log("启动");
      startApp();
    } else {
      console.log("安装");
    }
  };

  const startApp = () => {
    const extensions = props.extensions.map((item) => {
      return {
        name: item.name,
        version: item.version,
        startPath: item.startPath,
        startType: item.startType,
      };
    });

    const data = {
      name,
      version,
      startPath,
      startType,
      extensions,
    };

    window.ipcRenderer.send("start-app", JSON.stringify(data));
  };

  const installApp = () => {};

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
        <div className={styles.extension}>
          <Extension extensions={extensions} />
        </div>

        <div className={styles.button}>
          <Button type="primary" onClick={(event) => handleClick(event, type)}>
            {type == 1 ? "启动" : "安装"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AppItem;
