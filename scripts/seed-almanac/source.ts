import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const validatedDataDirectory = resolve(process.cwd(), "docs/validated-data/db");

export const assetPlaceholder = "lorem ipsum";

export const readSeedSource = <Row>(fileName: string): Row[] =>
  JSON.parse(
    readFileSync(resolve(validatedDataDirectory, fileName), "utf8"),
  ) as Row[];
