import { app } from "electron";
import knex from "knex";
import { join } from "path";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_ROOT = join(__dirname, "../..");

const RENDERER_DIST = join(APP_ROOT, "dist");

const VITE_DEV_SERVER_URL = "http://127.0.0.1:7777/";

const VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? join(APP_ROOT, "public")
  : RENDERER_DIST;

const dbPath = join(app.getPath("userData"), "system", "db");
const dbFilePath = join(dbPath, "kp_link.sqlite");
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

if (!fs.existsSync(dbFilePath)) {
  console.log(1111, VITE_PUBLIC);
  //使用默认模板替换
  const dbPath = join(VITE_PUBLIC, "template", "db", "kp_link.sqlite");

  fs.copyFileSync(dbPath, dbFilePath);
  console.log("===>");
}

const db = knex({
  client: "sqlite3",
  connection: {
    filename: dbFilePath, // 本地数据库文件路径
  },
  useNullAsDefault: true, // 在 SQLite 中使用 NULL 作为默认值
});
/**初始化数据库创建相关表 */
export const initDatabase = async () => {
  try {
    const coreAppTableExists = await db.schema.hasTable("kp_core_app");
    if (!coreAppTableExists) {
      await db.schema.createTable("kp_core_app", (table) => {
        table.increments("id"); /*递增主键*/
        table.string("app_id").unique().notNullable(); /**app_id */
        table.string("name").unique().notNullable(); /**app名称 */
        table.string("description"); /**app描述 */
        table.string("icon").notNullable(); /**app图标 */
        table.string("app_resource").notNullable(); /**app资源 */
        table.string("start_path").notNullable(); /**app启动路径 */
        table.string("start_type").notNullable(); /**app启动类型 */
        table.decimal("version", 10, 2).notNullable(); /**app版本 */
        table.string("update_desc").notNullable(); /**app更新描述 */
        table.timestamp("create_at").defaultTo(db.fn.now()); /**创建时间 */
        table.timestamp("update_at").defaultTo(db.fn.now()); /**更新时间 */
      });
    }

    const appListTableExists = await db.schema.hasTable("kp_app");
    if (!appListTableExists) {
      await db.schema.createTable("kp_app", (table) => {
        /**app表 */
        table.increments("id"); /*递增主键*/
        table.string("app_id").unique().notNullable(); /**app_id */
        table.string("name").unique().notNullable(); /**app名称 */
        table.string("description"); /**app描述 */
        table.string("icon").notNullable(); /**app图标 */
        table.string("app_resource").notNullable(); /**app资源 */
        table.string("start_path").notNullable(); /**app启动路径 */
        table.string("start_type").notNullable(); /**app启动类型 */
        table.decimal("version", 10, 2).notNullable(); /**app版本 */
        table.string("update_desc").notNullable(); /**app更新描述 */
        table.timestamp("create_at").defaultTo(db.fn.now()); /**创建时间 */
        table.timestamp("update_at").defaultTo(db.fn.now()); /**更新时间 */
      });
    }

    const systemTableExists = await db.schema.hasTable("system");
    if (!systemTableExists) {
      await db.schema.createTable("system", (table) => {
        /**软件配置表,用于存储个软件版本及环境的安装状态 */
        table.increments("id"); /*递增主键*/
        table.string("cpu").notNullable(); /**cpu */
        table.string("memory").notNullable(); /**内存 */
        table.string("platform").notNullable(); /**操作系统 */
        table.string("arch").notNullable(); /**系统架构 */
        table.string("release").notNullable(); /**系统版本号 */
        table.string("version").notNullable(); /**系统版本 */
        table.string("softVersion").notNullable(); /** 软件版本*/
        table.string("coreVersion").notNullable(); /**内核版本 */
        table.string("totalmem").notNullable(); /**总内存 */
        table.string("freemem").notNullable(); /**空闲内存 */
        table.string("coreLastUpdate").notNullable(); /**内核最后更新时间 */
        table.timestamp("create_at").defaultTo(db.fn.now()); /**创建时间 */
        table.timestamp("update_at").defaultTo(db.fn.now()); /**更新时间 */
      });
    }
  } catch (error) {
    console.error("sqliteDB able Created Fail", error);
  }
};

/**断开sqlite连接 */
export const closeDatabase = async () => {
  try {
    await db.destroy();
    console.log("sqlite已断开");
  } catch (error) {
    console.error("sqlite断开时出错", error);
  }
};

/**增加数据 */
/**示例：db('your_table_name').insert({
  username: 'ccc',
  userId: 123,
  email: 'xxx',
  date: Date.now()
})*/
interface ConfigType {
  softwareName: string;
  installStatus: number;
}
export const addSQData = async (tableName: string, data: any) => {
  try {
    let result = await db(tableName).insert({
      ...data,
    });
    // console.log("添加成功",result)
    return { code: 101, data: result };
  } catch (error) {
    // console.log("添加失败",error)
    return { code: 102, data: error };
  }
};

/**查询数据*/
/**db('your_table_name').select('*').where({ username: 'john_doe' }) */
export const querySQData = async (tableName: string, query: any) => {
  try {
    let result = await db(tableName)
      .select("*")
      .where({ ...query });
    // console.log("查询成功",result)
    return { code: 101, data: result };
  } catch (error) {
    // console.log("查询失败",error)
    return { code: 102, data: null };
  }
};

/**复杂查询 */
/**db('your_table_name').select('*').where({ username: 'john_doe' }).whereIn('字段',[参数1,参数2]) */
export const complexQuerySQData = async (
  tableName: string,
  query: any,
  complexquery: any
) => {
  try {
    let result = await db(tableName)
      .select("*")
      .where({ ...query })
      .whereIn(complexquery[0], complexquery[1]);
    return { code: 101, data: result };
  } catch (error) {
    return { code: 102, data: error };
  }
};

/**删除数据 */
/**db('your_table_name').where({ username: 'john_doe' }).del() */
export const deleteSQData = async (tableName: string, query: any) => {
  try {
    let result = await db(tableName)
      .where({ ...query })
      .del();
    // console.log("删除成功",result)
    return { code: 101, data: result };
  } catch (error) {
    // console.log("删除失败",error)
    return { code: 102, data: error };
  }
};

/**修改数据 */
export const modifySQData = async (
  tableName: string,
  query: any,
  data: any
) => {
  try {
    console.log(query, data);
    let result = await db(tableName)
      .where({ ...query })
      .update({ ...data });
    // console.log("修改成功",result)
    return { code: 101, data: result };
  } catch (error) {
    // console.log("修改失败",error)
    return { code: 102, data: error };
  }
};
