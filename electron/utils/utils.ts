import fs from "fs";
import http from "http";
import path from "path";
import axios from "axios";
import * as unzipper from "unzipper";

const extractZipFile = async (zipPath: string, targetPath: string) => {
  try {
    await fs
      .createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: targetPath }))
      .promise();
  } catch (err: any) {
    throw new Error(`Failed to extract zip file: ${err.message}`);
  }
};

//转换icon为base64
const convertIconToBase64 = async (iconUrl: string) => {
  const iconData = await axios.get(iconUrl, { responseType: "arraybuffer" });
  const contentType = iconData.headers["content-type"];
  return `data:${contentType};base64,${Buffer.from(iconData.data).toString(
    "base64"
  )}`;
};
export { extractZipFile, convertIconToBase64 };
