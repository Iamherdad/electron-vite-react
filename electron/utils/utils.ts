import fs from "fs";
import http from "http";
import path from "path";
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
export { extractZipFile };
