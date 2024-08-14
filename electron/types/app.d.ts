export interface KP_APP_CONFIG {
  name: string;
  desc: string;
  icon: string;
  version: string;
  startPath: string;
  startType: string;
  localPath: string;
  updateDate: Number;
  createDate: Number;
  updateDesc: string;
}

export interface KP_APP_LIST {
  [key: string]: KP_APP_CONFIG;
}
