import React, {
  FC,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import systemContext from "../../context/systemContext";
import AppItem from "../../components/app/app";
import styles from "./localApp.module.css";
import { Button } from "antd";

const App: FC = () => {
  const localAppList = useContext(systemContext).localAppList;
  const appRunningStatus = useRef(new Set());
  // const isRunning = useCallback(
  //   (id: string) => {
  //     console.log("==>", appRunningStatus.current.has(id));
  //     return appRunningStatus.current.has(id);
  //   },
  //   [appRunningStatus.current]
  // );

  const startApp = (id: string) => {
    window.ipcRenderer.send("kp-system", {
      type: "start-app",
      data: JSON.stringify({
        app_id: id,
      }),
    });

    appRunningStatus.current.add(id);
  };
  useEffect(() => {
    window.ipcRenderer.on("start-app-reply", (event, arg) => {
      const { id, status } = JSON.parse(arg);
      switch (status) {
        case "running":
          console.log("running", appRunningStatus.current.has(id));
          if (!appRunningStatus.current.has(id)) {
            appRunningStatus.current.add(id);
          }
          break;
        case "fail":
          console.log("fail");
          if (appRunningStatus.current.has(id)) {
            appRunningStatus.current.delete(id);
          }
          break;
        case "closed":
          if (appRunningStatus.current.has(id)) {
            appRunningStatus.current.delete(id);
          }
          break;
      }

      // appRunningStatus.current = new Set(appRunningStatus.current);
    });
  }, []);

  return (
    <div className={styles.container}>
      {localAppList.map((item, ind) => {
        return (
          <div key={ind} className={styles.appContainer}>
            <AppItem {...item}>
              <Button
                type="primary"
                onClick={() => startApp(item.app_id)}
                // disabled={isRunning(item.app_id)}
                disabled={appRunningStatus.current.has(item.app_id)}
              >
                {/* {isRunning(item.app_id) ? "运行中" : "启动"} */}
                {appRunningStatus.current.has(item.app_id) ? "运行中" : "启动"}
              </Button>
            </AppItem>
          </div>
        );
      })}
    </div>
  );
};

export default App;
