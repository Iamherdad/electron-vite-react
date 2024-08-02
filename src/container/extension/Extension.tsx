import React, { FC } from "react";
import { Image } from "antd";

import styles from "./extension.module.css";

const mockData = [
  {
    name: "linkserver",
    desc: "连接网络服务器",
    icon: "http://cdn.bilibili.games/%E4%B8%8B%E8%BD%BD.png",
  },
  {
    name: "小鲲图形化编程",
    desc: "连接网络服务器",
    icon: "https://office-site-1306029847.cos.ap-shanghai.myqcloud.com/upload/20230804/f477216530c582c879ff61938509eb4e/IP2.png",
  },
];

export interface ExtensionType {
  name: string;
  desc: string;
  icon: string;
  version: string;
  appResource?: string;
  startPath?: string;
  startType?: string;
}

export interface ExtensionProps {
  extensions: ExtensionType[];
}

const Extension: FC<ExtensionProps> = (props) => {
  const { extensions } = props;
  return (
    <div className={styles.container}>
      <div className={styles.title}>依赖模块：</div>
      <div className={styles.body}>
        {extensions.map((ite, ind) => {
          return (
            <div key={ind} className={styles.icon}>
              <img src={ite.icon} />
              {/* <div>{ite.name}</div> */}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Extension;
