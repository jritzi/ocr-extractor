import { writeFileSync } from "fs";
import { getLicenseFileText } from "generate-license-file";

// Generate the third-party license file to commit. We don't generate this
// automatically as part of the build process, as that causes issues with
// the Community scanner.
const licenses = await getLicenseFileText("./package.json");
writeFileSync("THIRD_PARTY_LICENSES.txt", licenses);
console.log("Wrote THIRD_PARTY_LICENSES.txt");
