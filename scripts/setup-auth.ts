// Convex Auth beállítása egy deploymentre: aláírókulcsok (JWT_PRIVATE_KEY, JWKS) és SITE_URL.
//
//   bun run auth:setup -- --site-url http://localhost:3000            (dev deployment, .env.local alapján)
//   bun run auth:setup -- --prod --site-url https://minescript.example (production)
//   … --rotate   új kulcspár akkor is, ha már van (minden felhasználót kijelentkeztet)
//
// A meglévő kulcsokat alapból nem írja felül. Az értékeket argumentumtömbként adjuk át (NAME=VALUE alak),
// így a „-----BEGIN” kezdetű kulcsot sem shell, sem a CLI nem értelmezi félre. Semmit nem ír lemezre.

import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const args = process.argv.slice(2);
const prod = args.includes("--prod");
const rotate = args.includes("--rotate");
const siteUrl = args[args.indexOf("--site-url") + 1];
const target = prod ? ["--prod"] : [];

if (!args.includes("--site-url") || !siteUrl || !/^https?:\/\/[^/]+$/.test(siteUrl)) {
  console.error("Usage: bun run auth:setup -- [--prod] [--rotate] --site-url <origin, e.g. https://example.com>");
  process.exit(1);
}
if (prod && !siteUrl.startsWith("https://")) {
  console.error("Production SITE_URL must use https://.");
  process.exit(1);
}

function convex(...command: string[]) {
  const result = Bun.spawnSync(["bunx", "convex", ...command, ...target], { stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(`convex ${command[0]} ${command[1]} failed:\n${result.stderr.toString()}`);
  return result.stdout.toString().trim();
}

const hasKeys = convex("env", "get", "JWT_PRIVATE_KEY") !== "";
if (hasKeys && !rotate) {
  console.log("Signing keys already set; keeping them (pass --rotate to replace them and sign everyone out).");
} else {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, " ");
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...(await exportJWK(keys.publicKey)) }] });
  convex("env", "set", `JWT_PRIVATE_KEY=${privateKey}`);
  convex("env", "set", `JWKS=${jwks}`);
  console.log(hasKeys ? "Rotated signing keys." : "Set signing keys.");
}

convex("env", "set", `SITE_URL=${siteUrl}`);
console.log(`SITE_URL=${siteUrl} on the ${prod ? "production" : "dev"} deployment.`);
