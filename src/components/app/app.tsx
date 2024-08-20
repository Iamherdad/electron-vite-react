import React, { FC } from "react";
import styles from "./app.module.css";

export interface AppItemProps {
  name: string;
  desc: string;
  icon: string;
  version: string;
  type?: number;
  appResource: string;
  start_path: string;
  start_type: string;
  isInstall?: boolean;
  isUpdate?: boolean;
  updateDesc: String;
  localPath: string;
  createDate: string;
  children?: React.ReactNode;
}

const App: FC<AppItemProps> = (props) => {
  const {
    name,
    desc,
    icon,
    version,
    type = 1,
    start_path,
    start_type,
    isInstall,
    isUpdate,
    appResource,
    updateDesc,
    localPath,
    createDate,
    children,
  } = props;
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
          {children}
          {/* <Button
            type="primary"
            disabled={btnText == "已安装" ? true : false}
            loading={loading}
            onClick={(event) => handleClick(event, type)}
          >
            {btnText}
          </Button> */}
        </div>
      </div>
    </div>
  );
};

export default App;
