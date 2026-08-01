import process from "node:process";
import { execFileSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// Read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");

// Update versions.json with target version and the release's minAppVersion
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = releasedMinAppVersion() ?? minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, 2) + "\n");

// A hotfix is tagged before its version reaches main, which might have
// a different minAppVersion
function releasedMinAppVersion() {
  try {
    const tagged = execFileSync(
      "git",
      ["show", `${targetVersion}:manifest.json`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return JSON.parse(tagged).minAppVersion;
  } catch {
    return null;
  }
}
