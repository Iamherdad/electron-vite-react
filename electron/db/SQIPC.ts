import { ipcMain } from "electron";
import {
  addSQData,
  querySQData,
  deleteSQData,
  modifySQData,
  complexQuerySQData,
} from "./createDB";

/**新增数据*/
interface SQLParams {
  tableName: string;
  data: any;
  newData?: any;
  [propsName: string]: any;
}
ipcMain.handle("addSQLData", async (_, value: SQLParams) => {
  return addSQData(value.tableName, value.data);
});

/**查找数据 */
ipcMain.handle("querySQLData", async (_, value: SQLParams) => {
  return querySQData(value.tableName, value.data);
});

/**删除数据 */
ipcMain.handle("deleteSQData", async (_, value: SQLParams) => {
  return deleteSQData(value.tableName, value.data);
});

/**修改数据 */
ipcMain.handle("modifySQData", async (_, value: SQLParams) => {
  return modifySQData(value.tableName, value.data, value.newData);
});

/**复杂查找 */
ipcMain.handle("complexQuerySQData", async (_, value) => {
  return complexQuerySQData(value.tableName, value.data, value.complexQuery);
});
