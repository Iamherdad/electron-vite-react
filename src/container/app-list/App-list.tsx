import React, { useEffect } from "react";
import AppItem from "../app-item/App-item";

import styles from "./app-list.module.css";

import type, { AppItemProps } from "../app-item/App-item";
interface AppListProps {
  data: AppItemProps[];
  type: number;
}

const AppList: React.FC<AppListProps> = (props) => {
  const { data, type } = props;

  return (
    <div className={styles.container}>
      {data.map((item, index) => {
        return <AppItem key={index} type={type} {...item} />;
      })}
    </div>
  );
};

export default AppList;
