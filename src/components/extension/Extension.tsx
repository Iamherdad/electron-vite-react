import React, { FC } from "react";
import classNames from "classnames";

import styles from "./extension.module.css";

export interface ExtensionType {
  name: string;
  desc: string;
  icon: string;
  version: string;
  appResource?: string;
  startPath?: string;
  startType?: string;
}

export interface ExtensionProps extends ExtensionType {
  status: boolean;
  mainProcessStatus: boolean;
}

const Extension: FC<ExtensionProps> = (props) => {
  const {
    name,
    desc,
    icon,
    version,
    appResource,
    startPath,
    startType,
    status,
    mainProcessStatus,
  } = props;

  const containerClass = classNames(styles.container, {
    [styles.running]: status,
    [styles.closed]: mainProcessStatus && !status,
  });

  return (
    <div className={containerClass}>
      <img src={icon} className={styles.icon} />
      <div
        className={styles.restart}
        onClick={() => {
          window.ipcRenderer.send(
            "restart-extension",
            JSON.stringify({
              name,
              icon,
              appResource,
              startPath,
              startType,
            })
          );
        }}
      >
        启动
      </div>
    </div>
  );
};

export default Extension;
