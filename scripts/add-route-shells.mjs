import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const routes = [
  "search",
  "about",
  "legal",
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "account",
  "dashboard",
  "friends",
  "stamps",
  "submit",
  "admin",
];

const distDirectory = path.resolve("dist");
const appShell = await readFile(path.join(distDirectory, "index.html"), "utf8");
const nestedAppShell = appShell
  .replaceAll('href="./favicon.png"', 'href="../favicon.png"')
  .replaceAll('src="./assets/', 'src="../assets/')
  .replaceAll('href="./assets/', 'href="../assets/');

await Promise.all(
  routes.map(async (route) => {
    const routeDirectory = path.join(distDirectory, route);
    await mkdir(routeDirectory, { recursive: true });
    await writeFile(path.join(routeDirectory, "index.html"), nestedAppShell);
  }),
);

console.log(`Added static app shells for ${routes.length} routes.`);
