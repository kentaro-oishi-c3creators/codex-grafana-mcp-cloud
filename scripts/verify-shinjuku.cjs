// Functional browser verification of the offline, synthetic mobility demo.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { existsSync } = require("node:fs");
(async () => {
  const root = path.resolve(__dirname, ".."),
    out = path.join(root, ".local/browser/shinjuku-flow");
  await fs.mkdir(out, { recursive: true });
  const targetUrl = process.env.SHINJUKU_URL;
  if (targetUrl && !/^https?:\/\//.test(targetUrl)) {
    throw new Error("SHINJUKU_URL must be an HTTP or HTTPS URL");
  }
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  });
  const errors = [],
    network = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  const checks = [];
  async function check(name, fn) {
    await fn();
    checks.push(name);
    console.log("PASS " + name);
  }
  const snap = () => page.evaluate(() => window.shinjukuDemo.snapshot());
  const range = async (id, value) => {
    await page.locator("#" + id).evaluate((e, v) => {
      e.value = v;
      e.dispatchEvent(new Event("input", { bubbles: true }));
    }, String(value));
    await page.waitForTimeout(250);
  };
  try {
    if (targetUrl) {
      const response = await page.goto(targetUrl, { waitUntil: "load" });
      assert.equal(
        response.status(),
        200,
        "Published HTML must return HTTP 200",
      );
      assert.equal(
        page.url(),
        targetUrl,
        "Unexpected redirect from published site",
      );
      assert.equal(
        await response.text(),
        await fs.readFile(
          path.join(root, "demos/shinjuku-flow/index.html"),
          "utf8",
        ),
        "Published HTML must match the checked-out commit",
      );
    } else {
      await page.setContent(
        await fs.readFile(
          path.join(root, "demos/shinjuku-flow/index.html"),
          "utf8",
        ),
      );
    }
    await page.waitForFunction(
      () => window.shinjukuDemo?.snapshot().frameCount > 2,
    );
    await check("Animation advances time and positions", async () => {
      const a = await snap();
      await page.waitForTimeout(500);
      const b = await snap();
      assert(b.state.time > a.state.time);
      assert.notEqual(
        a.agents[0].x + ":" + a.agents[0].y,
        b.agents[0].x + ":" + b.agents[0].y,
      );
      assert(b.agents.length > 100);
      assert(b.size.height < 1300);
      assert.equal(a.size.height, b.size.height);
    });
    await check("Pause freezes the simulation", async () => {
      await page.locator("#play").click();
      const a = await snap();
      await page.waitForTimeout(300);
      const b = await snap();
      assert.equal(b.state.time, a.state.time);
      assert.deepEqual(b.agents, a.agents);
    });
    await check("Time scrub is deterministic and updates density", async () => {
      await range("time", 7200);
      const a = await snap();
      await range("time", 30600);
      const b = await snap();
      assert.equal(b.state.time, 30600);
      assert(b.agents.length > a.agents.length);
      const original = b.agents;
      await range("time", 40000);
      await range("time", 30600);
      assert.deepEqual((await snap()).agents, original);
      assert.equal(await page.locator("#clock").textContent(), "08:30:00");
    });
    await check("Tracking selects a rendered agent", async () => {
      const s = await snap();
      const a = s.agents.find(
        (a) =>
          a.screenX > 80 &&
          a.screenX < s.size.width - 90 &&
          a.screenY > 80 &&
          a.screenY < s.size.height - 80,
      );
      const box = await page.locator("#map").boundingBox();
      await page.mouse.click(box.x + a.screenX, box.y + a.screenY);
      await page.waitForTimeout(300);
      assert((await snap()).state.selected);
      assert.match(await page.locator("#inspection").textContent(), /緯度/);
      assert.match(await page.locator("#inspection").textContent(), /速度/);
      await page.locator("#clear-selection").click();
      assert.equal((await snap()).state.selected, null);
    });
    await check("Layers hide people and cars independently", async () => {
      await page.locator("#layer-people").uncheck();
      await page.waitForTimeout(100);
      assert((await snap()).agents.every((a) => a.car));
      await page.locator("#layer-cars").uncheck();
      await page.waitForTimeout(100);
      assert.equal((await snap()).agents.length, 0);
      await page.locator("#layer-people").check();
      await page.locator("#layer-cars").check();
      await page.locator("#layer-trails").uncheck();
      assert.equal((await snap()).state.layers.trails, false);
      await page.locator("#layer-trails").check();
    });
    await check("Zone highlight toggles without changing counts", async () => {
      const count = await page.locator("#people-count").textContent();
      await page.locator("#zone-west").click();
      assert.equal((await snap()).state.zone, "west");
      assert.equal(
        await page.locator("#selection-label").textContent(),
        "西口・西新宿",
      );
      assert.equal(await page.locator("#people-count").textContent(), count);
      await page.locator("#zone-west").click();
      assert.equal((await snap()).state.zone, null);
    });
    await page.screenshot({ path: path.join(out, "2d.png"), fullPage: true });
    await check(
      "3D projection, rotation, pitch and terrain respond",
      async () => {
        const before = (await snap()).agents[0];
        await page.locator("#mode-3d").click();
        await page.waitForTimeout(100);
        const after = (await snap()).agents[0];
        assert.equal((await snap()).state.mode, "3d");
        assert.notEqual(before.screenY, after.screenY);
        assert(await page.locator("#camera").isVisible());
        await range("bearing", 35);
        const rot = (await snap()).agents[0];
        assert.notEqual(rot.screenX, after.screenX);
        await range("pitch", 70);
        assert.notEqual((await snap()).agents[0].screenY, rot.screenY);
        await page.locator("#layer-terrain").check();
        assert.equal((await snap()).state.layers.terrain, true);
        await page.locator("#layer-buildings").uncheck();
        assert.equal((await snap()).state.layers.buildings, false);
        await page.locator("#layer-buildings").check();
      },
    );
    await page.locator("#reset-view").click();
    await page.locator("#layer-terrain").uncheck();
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(out, "3d.png"), fullPage: true });
    await check("Zoom, drag and reset work", async () => {
      await page.locator("#zoom-in").click();
      assert((await snap()).state.zoom > 1);
      const b = await page.locator("#map").boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2 + 50, b.y + b.height / 2 + 20, {
        steps: 5,
      });
      await page.mouse.up();
      assert((await snap()).state.panX > 30);
      await page.locator("#reset-view").click();
      const s = (await snap()).state;
      assert.equal(s.zoom, 1);
      assert.equal(s.panX, 0);
      assert.equal(s.panY, 0);
    });
    await check(
      "Density changes counts and CSV has valid coordinates",
      async () => {
        await range("density", 100);
        const low = await page.locator("#people-count").textContent();
        await range("density", 1200);
        const high = await page.locator("#people-count").textContent();
        assert(+high.replaceAll(",", "") > +low);
        const rows = (await page.evaluate(() => window.shinjukuDemo.csv()))
          .trim()
          .split("\n");
        assert.match(rows[0], /simulation_time_jst,agent_id/);
        const s = await snap();
        assert.equal(rows.length - 1, s.agents.length);
        for (const row of rows.slice(1)) {
          const v = row.split(",");
          assert.equal(v.length, 8);
          assert(+v[3] > 35.68 && +v[3] < 35.71);
          assert(+v[4] > 139.68 && +v[4] < 139.72);
          assert.equal(v[7], "synthetic");
        }
        const promise = page.waitForEvent("download");
        await page.locator("#export").click();
        const download = await promise;
        assert.match(
          download.suggestedFilename(),
          /^shinjuku-synthetic-\d{6}\.csv$/,
        );
        await download.saveAs(path.join(out, "positions.csv"));
        assert.equal(
          await fs.readFile(path.join(out, "positions.csv"), "utf8"),
          rows.join("\n") + "\n",
        );
      },
    );
    await check("Time sync uses JST and locks playback speed", async () => {
      await page.locator("#realtime").click();
      const a = await snap();
      assert(a.state.realtime);
      assert(await page.locator("#speed").isDisabled());
      await page.waitForTimeout(300);
      const b = await snap();
      assert(b.state.time > a.state.time);
      const expected = await page.evaluate(() => {
        const n = new Date();
        return (
          ((n.getUTCHours() + 9) % 24) * 3600 +
          n.getUTCMinutes() * 60 +
          n.getUTCSeconds()
        );
      });
      assert(Math.abs(b.state.time - expected) < 2);
      assert.match(await page.locator("#play-state").textContent(), /合成/);
      await range("time", 28800);
      assert.equal((await snap()).state.realtime, false);
      assert(!(await page.locator("#speed").isDisabled()));
    });
    await check("Playback speed changes simulated elapsed time", async () => {
      await page.selectOption("#speed", "300");
      await page.locator("#play").click();
      const a = await snap();
      await page.waitForTimeout(400);
      const b = await snap();
      assert(b.state.time - a.state.time > 45);
      await page.locator("#play").click();
    });
    await check("Mobile view fits and remains interactive", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.locator("#mode-2d").click();
      await page.locator("#zoom-in").click();
      assert.equal((await snap()).state.mode, "2d");
      await page.screenshot({
        path: path.join(out, "mobile.png"),
        fullPage: true,
      });
    });
    await check("No external requests or JavaScript errors", async () => {
      assert.deepEqual(errors, []);
      assert.deepEqual(network, targetUrl ? [targetUrl] : []);
    });
    await fs.writeFile(
      path.join(out, "validation.json"),
      JSON.stringify(
        {
          passed: true,
          target: targetUrl || "local HTML",
          checks,
          errors,
          externalRequests: network,
          verifiedAt: new Date().toISOString(),
        },
        null,
        2,
      ) + "\n",
    );
    console.log(`${checks.length} functional checks passed`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
