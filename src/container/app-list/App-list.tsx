import React, { useEffect } from "react";
import AppItem from "../app-item/App-item";

import styles from "./app-list.module.css";

import type, { AppItemProps } from "../app-item/App-item";
import { Badge } from "antd";
import Ribbon from "../../components/ribbon/ribbon";
interface AppListProps {
  data: AppItemProps[];
  type: number;
}

const AppList: React.FC<AppListProps> = (props) => {
  const { data, type } = props;

  return (
    <div className={styles.container}>
      {data.map((item, index) => {
        return item.isUpdate ? (
          <div className={styles.item} key={index}>
            <Badge.Ribbon
              text={<Ribbon content={item.updateDesc} />}
              color="#52c41a"
            >
              <AppItem key={index} type={type} {...item} />
            </Badge.Ribbon>
          </div>
        ) : (
          <div className={styles.item} key={index}>
            <AppItem key={index} type={type} {...item} />
          </div>
        );
        // return <AppItem key={index} type={type} {...item} />;
      })}
    </div>
  );
};

export default AppList;
