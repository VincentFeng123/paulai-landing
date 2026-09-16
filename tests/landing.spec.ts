import { expect, test as base, type Page } from "@playwright/test";

const test = base.extend<{ errorGuard: void }>({
  errorGuard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use();
      expect(
        errors,
        "The page should not emit browser or console errors",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

async function openPage(page: Page) {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function expectNoOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport + 1);
}

// Wait for the scrubbed timeline to catch up without masking a layout jump
// behind an arbitrary delay. Four unchanged samples span several render frames.
async function scrollToAndSettle(page: Page, top: number) {
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    top,
  );
  let previous: number[] = [];
  let stableSamples = 0;
  await expect
    .poll(
      async () => {
        const positions = await page
          .locator(".flow-pin, .float-layer")
          .evaluateAll((elements) =>
            elements.map((element) => element.getBoundingClientRect().top),
          );
        const unchanged =
          positions.length === previous.length &&
          positions.every(
            (value, index) => Math.abs(value - previous[index]) < 0.05,
          );
        stableSamples = unchanged ? stableSamples + 1 : 0;
        previous = positions;
        return stableSamples;
      },
      { intervals: [100], timeout: 5000 },
    )
    .toBeGreaterThanOrEqual(4);
}

async function flowGeometry(page: Page) {
  return page.locator(".flow-section").evaluate((section) => {
    const pin = section.querySelector<HTMLElement>(".flow-pin")!;
    const panel = section.querySelector<HTMLElement>(".flow-panel-0")!;
    const layer = panel.querySelector<HTMLElement>(".float-layer")!;
    const transform = getComputedStyle(layer).transform;
    return {
      sectionTop: section.getBoundingClientRect().top,
      pinTop: pin.getBoundingClientRect().top,
      layerWithinPin:
        layer.getBoundingClientRect().top - pin.getBoundingClientRect().top,
      layerTranslateY:
        transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42,
    };
  });
}

for (const width of [375, 768, 1440]) {
  test(`the page and every preview tab fit a ${width}px viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openPage(page);
    for (const name of ["Today", "Boundaries", "Patterns"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(
        page.getByRole("tab", { name, exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await expectNoOverflow(page);
    }
    for (const section of [
      "#how-it-works",
      "#your-space",
      "#questions",
      ".closing",
    ]) {
      await page.locator(section).scrollIntoViewIfNeeded();
      await expectNoOverflow(page);
    }
  });
}

test("preview tabs support pointer and keyboard navigation", async ({
  page,
}) => {
  await openPage(page);
  const today = page.getByRole("tab", { name: "Today", exact: true });
  const boundaries = page.getByRole("tab", { name: "Boundaries", exact: true });
  const patterns = page.getByRole("tab", { name: "Patterns", exact: true });
  await today.focus();
  await page.keyboard.press("ArrowRight");
  await expect(boundaries).toBeFocused();
  await expect(boundaries).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveAttribute(
    "aria-labelledby",
    "preview-tab-boundaries",
  );
  await page.keyboard.press("End");
  await expect(patterns).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "The pattern, in perspective." }),
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(today).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(patterns).toBeFocused();
  await page.keyboard.press("Home");
  await expect(today).toBeFocused();
  await boundaries.click();
  await expect(
    page.getByRole("heading", { name: "Your boundaries." }),
  ).toBeVisible();
});

test("boundary controls persist and update the Today preview", async ({
  page,
}) => {
  await openPage(page);
  await page.getByRole("tab", { name: "Boundaries", exact: true }).click();
  for (const [level, name] of [
    "Awareness",
    "Delay",
    "Intent",
    "Friction",
    "Block",
  ].entries()) {
    const button = page.getByRole("button", {
      name: `Level ${level}: ${name}`,
      exact: true,
    });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".preview-level-description strong")).toHaveText(
      name,
    );
    await expect(
      page.locator('.preview-levels [aria-pressed="true"]'),
    ).toHaveCount(1);
  }
  const youtube = page.getByRole("switch", {
    name: "Watch YouTube in this sample preview",
    exact: true,
  });
  await youtube.click();
  await expect(youtube).toHaveAttribute("aria-checked", "false");
  await page.getByRole("tab", { name: "Today", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Adjust the sample boundary for YouTube",
    }),
  ).toContainText("Paused");
  await expect(
    page.getByRole("button", { name: "Adjust the sample boundary for Reddit" }),
  ).toContainText("Block");
  await page
    .getByRole("button", { name: "Pause watching in this sample preview" })
    .click();
  await expect(page.locator(".preview-monitor")).toContainText(
    "Watching is paused",
  );
  await expect(
    page.getByRole("button", { name: "Adjust the sample boundary for Reddit" }),
  ).toContainText("Paused");
  await page
    .getByRole("button", { name: "Resume watching in this sample preview" })
    .click();
  await page.getByRole("tab", { name: "Boundaries", exact: true }).click();
  await expect(youtube).toHaveAttribute("aria-checked", "false");
  await youtube.click();
  await page
    .getByRole("button", {
      name: "Try a sample twenty-minute planned-use window",
    })
    .click();
  await expect(page.locator(".preview-planned")).toContainText(
    "YouTube · 20 minutes of planned time.",
  );
  await page.getByRole("tab", { name: "Today", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Adjust the sample boundary for YouTube",
    }),
  ).toContainText("Planned use");
});

test("cross-panel actions move focus to the selected content", async ({
  page,
}) => {
  await openPage(page);
  await page.getByRole("button", { name: "Manage", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "Boundaries", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Today", exact: true }).click();
  await page
    .getByRole("button", { name: "Adjust the sample boundary for YouTube" })
    .click();
  await expect(page.getByRole("tabpanel")).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Your boundaries." }),
  ).toBeVisible();
});

test("main call to action opens the experience and FAQ answers expand", async ({
  page,
}) => {
  await openPage(page);
  await page
    .locator(".hero")
    .getByRole("link", { name: "Explore Paul", exact: true })
    .click();
  await expect(page).toHaveURL(/#experience$/);
  await expect
    .poll(async () =>
      page
        .locator("#experience")
        .evaluate((el) => Math.round(el.getBoundingClientRect().top)),
    )
    .toBeLessThan(170);
  await expect(
    page.getByRole("heading", { name: "Good afternoon." }),
  ).toBeInViewport();
  const item = page.locator("details").filter({
    has: page.locator("summary", { hasText: "Where can I try Paul?" }),
  });
  await item.locator("summary").click();
  await expect(item).toHaveAttribute("open", "");
  await expect(item.locator("p")).toBeVisible();
  await expect(item.locator("p")).toContainText(
    "public installer downloads are not available here yet",
  );
  await item.locator("summary").press("Enter");
  await expect(item).not.toHaveAttribute("open", "");
});

test("moment dialog answers, resets, closes with Escape, and restores focus", async ({
  page,
}) => {
  await openPage(page);
  const trigger = page.getByRole("button", { name: "Try a moment with Paul" });
  const dialog = page.getByRole("dialog");
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveText(
    "What brought you here?",
  );
  await dialog.getByRole("button", { name: "Make a little room" }).click();
  await expect(dialog.getByRole("heading")).toHaveText(
    "That sounds like a good start.",
  );
  await expect(dialog).toContainText("relax your shoulders");
  await expect(
    dialog.getByRole("button", { name: "Back with a little more intention" }),
  ).toBeFocused();
  await dialog
    .getByRole("button", { name: "Back with a little more intention" })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByRole("heading")).toHaveText(
    "What brought you here?",
  );
  await dialog.getByRole("button", { name: "Explore with intention" }).click();
  await expect(dialog).toContainText("Keep that intention in mind.");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("the mobile header opens the preview directly", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openPage(page);
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Explore Paul" })
    .click();
  await expect(page).toHaveURL(/#experience$/);
  await expect(
    page.getByRole("tab", { name: "Today", exact: true }),
  ).toBeInViewport();
});

test("reduced motion exposes all three stories in document flow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPage(page);
  await expect(page.locator(".flow-section.is-sticky")).toHaveCount(0);
  await expect(page.locator(".flow-panel")).toHaveCount(3);
  let previousBottom = 0;
  for (const panel of await page.locator(".flow-panel").all()) {
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveCSS("opacity", "1");
    const bounds = await panel.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top + window.scrollY,
        bottom: rect.bottom + window.scrollY,
        position: getComputedStyle(el).position,
      };
    });
    expect(bounds.position).not.toBe("absolute");
    expect(bounds.top).toBeGreaterThanOrEqual(previousBottom - 1);
    previousBottom = bounds.bottom;
  }
  await expect(page.locator(".philosophy-word").first()).toHaveCSS(
    "opacity",
    "1",
  );
  await expectNoOverflow(page);
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 483, height: 710 },
]) {
  const size = `${viewport.width}×${viewport.height}`;

  test(`the hero fills the ${size} viewport with grayscale artwork and a dark overlay`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openPage(page);
    const artwork = page.locator(".hero-background");
    await expect(artwork).toBeVisible();
    await expect
      .poll(() =>
        artwork.evaluate(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(artwork).toHaveCSS("object-fit", "cover");
    const hero = await page.locator(".hero-shell").evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      top: element.getBoundingClientRect().top,
      overlay: getComputedStyle(element, "::before").backgroundImage,
      overlayContent: getComputedStyle(element, "::before").content,
      filter: getComputedStyle(element.querySelector(".hero-background")!)
        .filter,
    }));
    expect(hero.height).toBeGreaterThanOrEqual(viewport.height - 1);
    expect(Math.abs(hero.top)).toBeLessThanOrEqual(1);
    expect(hero.filter).toMatch(/grayscale\(1\)/);
    expect(hero.overlayContent).not.toBe("none");
    expect(hero.overlay).toMatch(/rgba?\(0,\s*0,\s*0/);
    await expectNoOverflow(page);
  });

  test(`the ${size} sticky story enters smoothly, advances, and releases`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openPage(page);
    const section = page.locator(".flow-section.is-sticky");
    await expect(section).toHaveCount(1);
    await expect(page.locator(".flow-pin")).toHaveCSS("position", "sticky");
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    const start = await section.evaluate(
      (el) => el.getBoundingClientRect().top + window.scrollY,
    );

    // Before the section reaches the viewport edge, its content travels with
    // the document. A premature fixed pin or fromTo offset breaks these checks.
    await scrollToAndSettle(page, start - 180);
    const before = await flowGeometry(page);
    await scrollToAndSettle(page, start - 80);
    const approaching = await flowGeometry(page);
    expect(Math.abs(before.pinTop - 180)).toBeLessThanOrEqual(1);
    expect(Math.abs(approaching.pinTop - 80)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(before.layerWithinPin - approaching.layerWithinPin),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs(before.layerTranslateY)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(approaching.layerTranslateY)).toBeLessThanOrEqual(0.1);

    await scrollToAndSettle(page, start - 2);
    const entryBefore = await flowGeometry(page);
    await scrollToAndSettle(page, start + 2);
    const entryAfter = await flowGeometry(page);
    expect(Math.abs(entryBefore.pinTop - 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(entryAfter.pinTop)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(entryBefore.layerWithinPin - entryAfter.layerWithinPin),
    ).toBeLessThanOrEqual(1);

    // The first floating layer begins at timeline 0.08 / 3, about 31px
    // after entry. It must ease out of its natural position without snapping.
    await scrollToAndSettle(page, start + 27);
    const layerBefore = await flowGeometry(page);
    await scrollToAndSettle(page, start + 35);
    const layerAfter = await flowGeometry(page);
    expect(
      Math.abs(layerAfter.layerWithinPin - layerBefore.layerWithinPin),
    ).toBeLessThanOrEqual(2);
    await scrollToAndSettle(page, start + 50);
    expect(Math.abs((await flowGeometry(page)).pinTop)).toBeLessThanOrEqual(1);

    for (const [index, progress] of [0.08, 0.54, 0.88].entries()) {
      await scrollToAndSettle(page, start + 1150 * progress);
      const panel = page.locator(`.flow-panel-${index}`);
      await expect(panel).toHaveCSS("opacity", "1");
      await expect(panel).toHaveCSS("visibility", "visible");
      expect(Math.abs((await flowGeometry(page)).pinTop)).toBeLessThanOrEqual(
        1,
      );
      await expect(
        page.locator(".flow-step-labels > span").nth(index),
      ).toHaveClass("active");
      const visibleContent = await panel
        .locator(".flow-copy, .float-layer")
        .evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom };
          }),
        );
      for (const bounds of visibleContent) {
        expect(
          bounds.top,
          `Chapter ${index + 1} content starts within the screen`,
        ).toBeGreaterThanOrEqual(-1);
        expect(
          bounds.bottom,
          `Chapter ${index + 1} content fits the screen`,
        ).toBeLessThanOrEqual(viewport.height + 1);
      }
      for (const other of [0, 1, 2].filter((n) => n !== index)) {
        await expect(page.locator(`.flow-panel-${other}`)).toHaveCSS(
          "visibility",
          "hidden",
        );
      }
      await expectNoOverflow(page);
    }
    await scrollToAndSettle(page, start + 1150 + 90);
    expect(
      Math.abs((await flowGeometry(page)).pinTop + 90),
    ).toBeLessThanOrEqual(2);
    await page.locator("#your-space").scrollIntoViewIfNeeded();
    await expect(page.locator("#your-space h2")).toBeInViewport();
  });
}

test("short desktop windows display every story without pinning or clipping", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openPage(page);
  await expect(page.locator(".flow-section.is-sticky")).toHaveCount(0);
  for (const panel of await page.locator(".flow-panel").all()) {
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toHaveCSS("opacity", "1");
    await expect(panel).toHaveCSS("visibility", "visible");
    await expect(panel.getByRole("heading")).toBeInViewport();
    for (const layer of await panel.locator(".float-layer").all()) {
      const offset = await layer.evaluate((el) => {
        const transform = getComputedStyle(el).transform;
        return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
      });
      expect(
        Math.abs(offset),
        "Fallback layers stay in their natural positions",
      ).toBeLessThanOrEqual(0.1);
    }
    await expectNoOverflow(page);
  }
});
