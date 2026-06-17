import { writeFileSync } from "fs";
import { getLicenseFileText, getProjectLicenses } from "generate-license-file";

// Generate the third-party license file to commit. We don't generate this
// automatically as part of the build process, as that causes issues with
// the Community scanner.

// Exclude @napi-rs/canvas native binary (not bundled into main.js, installed
// by pdfjs-dist and differs per OS, which would break CI checks).
const projectLicenses = await getProjectLicenses("./package.json");
const exclude = projectLicenses
  .flatMap((license) => license.dependencies)
  .filter((dependency) => dependency.startsWith("@napi-rs/canvas"));

const licenses = await getLicenseFileText("./package.json", { exclude });
writeFileSync("THIRD_PARTY_LICENSES.txt", licenses);
console.log("Wrote THIRD_PARTY_LICENSES.txt");
