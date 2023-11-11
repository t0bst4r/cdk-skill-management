import * as fs from "fs";
import { Plugin } from "release-it";

export default class ReleaseItPlugin extends Plugin {
  bump(version) {
    bumpJsii(version);
  }
}

/*********************************************************
 * JSII                                                  *
 *********************************************************/

function bumpJsii(version) {
  if (!fs.existsSync(".jsii")) {
    return;
  }
  const content = JSON.parse(fs.readFileSync(".jsii", "utf-8"));
  content.version = version;
  fs.writeFileSync(".jsii", JSON.stringify(content, undefined, 2));
}