import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// A CLI minden hívását a gyermekfolyamatban helyettesítjük; deploymentet nem érünk el.
const preload = `
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { createPrivateKey } from "node:crypto";
childProcess.spawnSync = (executable, args) => {
  const [cli, command, operation, entry, target] = args;
  if (executable !== process.execPath || !cli.endsWith("/convex/bin/main.js")) throw Error("Expected local Node CLI");
  if (command !== "env" || target !== "--prod") throw Error("Expected explicit production target");
  const name = entry.split("=")[0];
  if (name === "JWT_PRIVATE_KEY" && operation === "set") {
    createPrivateKey(entry.slice(name.length + 1).replaceAll(" ", "\\n").replace("BEGIN\\nPRIVATE\\nKEY", "BEGIN PRIVATE KEY").replace("END\\nPRIVATE\\nKEY", "END PRIVATE KEY"));
  }
  if (name === "JWKS") {
    const jwks = JSON.parse(entry.slice(name.length + 1));
    if (jwks.keys[0].kty !== "RSA" || jwks.keys[0].use !== "sig" || jwks.keys[0].d) throw Error("Invalid public key");
  }
  console.log(JSON.stringify({ operation, name, site: name === "SITE_URL" ? entry.slice(name.length + 1) : undefined }));
  if (process.env.SETUP_TEST_FAIL === name) return { status: 1, stderr: "test CLI failure", stdout: "" };
  return { status: 0, stderr: "", stdout: operation === "get" ? process.env.SETUP_TEST_EXISTING : "" };
};
syncBuiltinESMExports();
`;

function runSetup(args: string[], existing = "", fail = "") {
  return spawnSync(
    "node",
    [
      "--import",
      `data:text/javascript,${encodeURIComponent(preload)}`,
      fileURLToPath(new URL("../../scripts/setup-auth.mjs", import.meta.url)),
      ...args,
    ],
    { encoding: "utf8", env: { ...process.env, SETUP_TEST_EXISTING: existing, SETUP_TEST_FAIL: fail } },
  );
}

const productionArgs = ["--prod", "--site-url", "https://example.com"];

test("Node auth setup creates signing keys and sets the production origin", () => {
  const result = runSetup(productionArgs);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('"name":"JWT_PRIVATE_KEY"');
  expect(result.stdout).toContain('"name":"JWKS"');
  expect(result.stdout).toContain('"site":"https://example.com"');
  expect(result.stdout).not.toContain("BEGIN PRIVATE KEY");
  expect(result.stdout).not.toContain('"kty"');
});

test("Node auth setup preserves existing keys unless rotation is requested", () => {
  const result = runSetup(productionArgs, "existing-key");
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Signing keys already set; keeping them");
  expect(result.stdout).not.toContain('"name":"JWKS"');
  expect(result.stdout).toContain('"name":"SITE_URL"');
  expect(runSetup([...productionArgs, "--rotate"], "existing-key").stdout).toContain("Rotated signing keys.");
});

test("Node auth setup refuses invalid production origins before invoking the CLI", () => {
  for (const site of ["http://example.com", "https://example.com/", "https://example.com/path"]) {
    const result = runSetup(["--prod", "--site-url", site]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
  }
});

test("Node auth setup stops after a CLI error without reporting success", () => {
  const result = runSetup(productionArgs, "", "SITE_URL");
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("test CLI failure");
  expect(result.stdout).not.toContain("SITE_URL=https://example.com on the production deployment.");
});
