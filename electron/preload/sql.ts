import { ipcRenderer, contextBridge } from "electron";

/** sqlite通信接口 */
interface SQLParams {
  tableName: string;
  data: Record<string, any>; // 假设 data 是一个对象
  complexQuery: any[]; // 具体类型根据实际情况调整
}

const electronSQ = {
  addSQLData: (value: SQLParams): Promise<any> => {
    console.log("中间层", value);
    return ipcRenderer.invoke("addSQLData", value);
  },
  querySQLData: (value: SQLParams): Promise<any> => {
    return ipcRenderer.invoke("querySQLData", value);
  },
  deleteSQData: (value: SQLParams): Promise<any> => {
    return ipcRenderer.invoke("deleteSQData", value);
  },
  modifySQData: (value: SQLParams): Promise<any> => {
    return ipcRenderer.invoke("modifySQData", value);
  },
  complexQuerySQData: (value: SQLParams): Promise<any> => {
    return ipcRenderer.invoke("complexQuerySQData", value);
  },
};

try {
  contextBridge.exposeInMainWorld("electronSQ", electronSQ);
} catch (error) {
  console.error(error);
}
