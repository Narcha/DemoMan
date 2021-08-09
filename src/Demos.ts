import fs from "fs";
import path from "path";
import log from "electron-log";

import StreamReader from "./StreamReader";
import { DemoHeader, InvalidDemoFileError } from "./DemoHeader";
import DemoEvent from "./DemoEvent";

const HEADER_SIZE = 8 + 4 + 4 + 260 + 260 + 260 + 260 + 4 + 4 + 4 + 4;

export function writeEventsAndTagsFile(
  events: DemoEvent[],
  tags: string[],
  jsonPath: string,
  overwrite: boolean
) {
  if (events.length === 0) {
    log.debug(`Deleting events/tags file at ${jsonPath}`);
    fs.rmSync(jsonPath, { force: true });
    return;
  }
  log.debug(`Writing to events/tags file at ${jsonPath}`);
  let fd;
  try {
    fd = fs.openSync(jsonPath, overwrite ? "w" : "wx");
  } catch (e) {
    if (e.code === "EEXIST") {
      log.debug(`Events/tags file at ${jsonPath} already exists, skipping.`);
      return;
    }
    throw e;
  }
  fs.writeSync(fd, JSON.stringify({ events, tags }, null, "\t"));
  fs.closeSync(fd);
}

export class Demo {
  filename: string;

  birthtime: number;

  filesize: number;

  header: DemoHeader;

  events: DemoEvent[];

  tags: string[];

  private static demoCache: Record<string, Demo> = {};

  private constructor(
    filename: string,
    header: DemoHeader,
    events: DemoEvent[],
    tags: string[],
    birthtime: number,
    filesize: number
  ) {
    this.filename = filename;
    this.header = header;
    this.events = events;
    this.tags = tags;
    this.birthtime = birthtime;
    this.filesize = filesize;
  }

  static getDemo(filename: string): Demo {
    const realPath = fs.realpathSync(filename);
    if (Demo.demoCache[realPath] !== undefined) {
      return Demo.demoCache[realPath];
    }
    const stats = fs.statSync(realPath);
    const [events, tags] = this.readEventsAndTags(this.getJSONPath(realPath));
    const newDemo = new Demo(
      realPath,
      this.readFileHeader(realPath),
      events,
      tags,
      stats.birthtimeMs,
      stats.size
    );
    Demo.demoCache[realPath] = newDemo;
    return newDemo;
  }

  static readFileHeader(filename: string): DemoHeader {
    log.debug(`Reading file header of ${filename}`);
    const fd = fs.openSync(filename, "r");
    const buf = Buffer.allocUnsafe(HEADER_SIZE);

    const bytesRead = fs.readSync(fd, buf, 0, HEADER_SIZE, 0);
    if (bytesRead !== HEADER_SIZE) {
      log.warn(
        `Error reading file ${filename}: read ${bytesRead} bytes, expected ${HEADER_SIZE}.`
      );
      throw new InvalidDemoFileError();
    }
    fs.closeSync(fd);
    const sr = new StreamReader(buf);

    const filestamp = sr.readString(8);
    if (filestamp !== "HL2DEMO") {
      log.warn(`File ${filename} has an invalid file stamp '${filestamp}'!`);
      throw new InvalidDemoFileError();
    }

    const header: DemoHeader = {
      demoVersion: sr.readInt(),
      netVersion: sr.readInt(),
      serverName: sr.readString(260),
      clientName: sr.readString(260),
      mapName: sr.readString(260),
      gameDir: sr.readString(260),
      playbackTime: sr.readFloat(),
      numTicks: sr.readInt(),
      numFrames: sr.readInt(),
      signonLength: sr.readInt(),
    };
    return header;
  }

  static getJSONPath(filename: string) {
    return filename.replace(/\.dem$/gi, ".json");
  }

  getShortName() {
    return path.basename(this.filename, ".dem");
  }

  static readEventsAndTags(jsonPath: string): [DemoEvent[], string[]] {
    log.debug(`Looking for events file at ${jsonPath}`);
    let content;
    try {
      content = fs.readFileSync(jsonPath);
    } catch (e) {
      if (e.code === "ENOENT") {
        return [[], []];
      }
      throw e;
    }
    try {
      const parsedJson = JSON.parse(content.toString());
      return [parsedJson.events || [], parsedJson.tags || []];
    } catch (error) {
      return [[], []];
    }
  }

  writeEvents(events: DemoEvent[]) {
    this.events = events;
    const jsonPath = Demo.getJSONPath(this.filename);
    writeEventsAndTagsFile(events, this.tags, jsonPath, true);
  }

  writeTags(tags: string[]) {
    this.tags = tags;
    const jsonPath = Demo.getJSONPath(this.filename);
    writeEventsAndTagsFile(this.events, tags, jsonPath, true);
  }

  rename(newName: string) {
    log.info(`Renaming demo ${this.getShortName()} to ${newName}`);
    const dir = path.dirname(this.filename);
    const newNameFull = path.join(dir, `${newName}.dem`);
    fs.renameSync(this.filename, newNameFull);
    try {
      fs.renameSync(
        Demo.getJSONPath(this.filename),
        path.join(dir, `${newName}.json`)
      );
    } catch (e) {
      if (e.code === "ENOENT") {
        // This demo has no events file, ignore the error
      } else {
        throw e;
      }
    }
    this.filename = newNameFull;
  }

  delete() {
    log.info(`Deleting demo ${this.filename}`);
    fs.rmSync(this.filename);
    try {
      fs.rmSync(Demo.getJSONPath(this.filename));
    } catch (e) {
      if (e.code === "ENOENT") {
        // This demo has no events file, ignore the error
      } else {
        throw e;
      }
    }
  }
}

export async function getDemosInDirectory(dirPath: string) {
  log.debug(`Finding demo files in ${dirPath}`);

  let files;
  try {
    files = await fs.promises.readdir(dirPath);
  } catch (e) {
    log.error(`Error reading path ${dirPath}: ${e}`);
    return [];
  }

  const demoList: Demo[] = [];
  files.forEach((file) => {
    if (file.endsWith(".dem")) {
      log.debug(`Found demo file ${file}`);
      try {
        demoList.push(Demo.getDemo(path.join(dirPath, file)));
      } catch (error) {
        // ignore this file if it throws errors
      }
    } else {
      log.debug(`Found non-demo file ${file}, skipping.`);
    }
  });
  return demoList;
}
