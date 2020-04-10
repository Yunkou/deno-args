import * as path from "https://deno.land/std@v0.40.0/path/mod.ts";

import {
  desc,
  task,
  sh,
  run,
  outOfDate
} from "https://deno.land/x/drake@v0.16.0/mod.ts";

import { dirname } from "https://deno.land/x/dirname/mod.ts";

const {
  UPDATE = "false",
} = Deno.env();

const __dirname = dirname(import.meta);

const shouldUpdate = UPDATE.toLowerCase() === "true";

desc("Sync markdown files");
task("markdown", [], async () => {
  let outdated: string[] = []
  type UpdateFunc = (name: string, src: string, dst: string) => void
  const update: UpdateFunc = shouldUpdate
    ? (name, src, dst) => {
      console.log(`File ${name} is out-of-date. Syncing.`);
      Deno.copyFileSync(src, dst)
    }
    : name => outdated.push(name);
  for (const info of Deno.readdirSync(__dirname)) {
    if (!info.name?.endsWith('.md')) continue
    const name = info.name!
    const src = path.join(__dirname, name)
    const dst = path.join(__dirname, "lib", name)
    if (outOfDate(dst, [src])) {
      update(name, src, dst);
    } else {
      console.log(`File ${name} is up-to-date. Skipping.`);
    }
  }
  if (outdated.length) {
    for (const name of outdated) {
      console.error(`File ${name} is outdated`);
    }
    throw "Some files are not up-to-date";
  }
});

desc("Fetch and compile dependencies");
task("cache", [], async () => {
  await sh("deno cache **/*.ts");
});

desc("Run tests");
task("test", ["cache"], async () => {
  const permissions = [
    "--allow-read",
  ];
  await sh(`deno test ${permissions.join(" ")} test/**/*.test.ts`);
});

desc("Run deno fmt");
task("fmt", [], async () => {
  await sh(shouldUpdate ? "deno fmt" : "deno fmt --check");
});

desc("Run all tasks");
task("all", [
  "markdown",
  "cache",
  "test",
  "fmt",
]);

run();
