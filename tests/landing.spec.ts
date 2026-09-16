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

async function expectRenderedHeroLogo(page: Page) {
  const logo = page.locator(".hero-logo");
  await expect(logo).toHaveAttribute("data-state", "ready", { timeout: 20000 });
  await expect(logo).toHaveAttribute("aria-hidden", "true");
  const canvas = logo.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
  const surface = await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext("webgl2");
    return {
      alpha: context?.getContextAttributes()?.alpha,
      clearAlpha: context?.getParameter(context.COLOR_CLEAR_VALUE)[3],
    };
  });
  expect(surface.alpha).toBe(true);
  expect(surface.clearAlpha).toBe(0);
  // The renderer is on-demand and does not preserve its drawing buffer.
  // Compare browser-composited pixels instead of depending on another frame.
  const bounds = (await canvas.boundingBox())!;
  const viewport = page.viewportSize()!;
  const clip = {
    x: Math.max(0, bounds.x),
    y: Math.max(0, bounds.y),
    width:
      Math.min(viewport.width, bounds.x + bounds.width) - Math.max(0, bounds.x),
    height:
      Math.min(viewport.height, bounds.y + bounds.height) -
      Math.max(0, bounds.y),
  };
  expect(clip.width).toBeGreaterThan(0);
  expect(clip.height).toBeGreaterThan(0);
  const rendered = await page.screenshot({ clip });
  const backgroundOnly = await page.screenshot({
    clip,
    style: ".hero-logo canvas { visibility: hidden !important; }",
  });
  expect(
    rendered.equals(backgroundOnly),
    "The WebGL canvas adds visible pixels to the hero",
  ).toBe(false);
}

async function settledLogoScreenshot(page: Page) {
  let previous: Buffer | undefined;
  let frame: Buffer = Buffer.alloc(0);
  await expect
    .poll(
      async () => {
        frame = await page.locator(".hero-logo canvas").screenshot();
        const stable = previous?.equals(frame) ?? false;
        previous = frame;
        return stable;
      },
      { intervals: [200], timeout: 10000 },
    )
    .toBe(true);
  return frame;
}

async function screenshotDifference(page: Page, first: Buffer, second: Buffer) {
  return page.evaluate(
    async ([firstPng, secondPng]) => {
      const images = await Promise.all(
        [firstPng, secondPng].map(async (base64) => {
          const image = new Image();
          image.src = `data:image/png;base64,${base64}`;
          await image.decode();
          return image;
        }),
      );
      const canvas = document.createElement("canvas");
      canvas.width = images[0].width;
      canvas.height = images[0].height;
      const context = canvas.getContext("2d")!;
      const pixels = images.map((image) => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      });
      let difference = 0;
      let samples = 0;
      for (let index = 0; index < pixels[0].length; index += 16) {
        for (let color = 0; color < 3; color += 1) {
          difference += Math.abs(
            pixels[0][index + color] - pixels[1][index + color],
          );
          samples += 1;
        }
      }
      return difference / (samples * 255);
    },
    [first.toString("base64"), second.toString("base64")],
  );
}

// Wait for the scrubbed timeline to catch up without masking a layout jump
// behind an arbitrary delay. Four unchanged samples span several render frames.
async function scrollToAndSettle(
  page: Page,
  top: number,
  selector = ".flow-pin, .float-layer, .intro-backdrop",
) {
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    top,
  );
  let previous: number[] = [];
  let stableSamples = 0;
  await expect
    .poll(
      async () => {
        const positions = await page.locator(selector).evaluateAll((elements) =>
          elements.flatMap((element) => {
            const style = getComputedStyle(element);
            return [
              element.getBoundingClientRect().top,
              parseFloat(style.getPropertyValue("--intro-blur")) || 0,
              Number(style.opacity),
            ];
          }),
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
      { intervals: [100], timeout: 10000 },
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

async function backdropGeometry(page: Page) {
  return page.locator(".intro-backdrop").evaluate((backdrop) => {
    const image = backdrop.querySelector<HTMLElement>(".hero-background")!;
    const style = getComputedStyle(backdrop);
    const imageFilter = getComputedStyle(image).filter;
    const blur = `${style.filter} ${imageFilter}`.match(/blur\(([\d.]+)px\)/);
    return {
      top: backdrop.getBoundingClientRect().top,
      height: backdrop.getBoundingClientRect().height,
      blur: blur ? Number(blur[1]) : 0,
      imageFilter,
      overlay: getComputedStyle(backdrop, "::after").backgroundImage,
      overlayContent: getComputedStyle(backdrop, "::after").content,
    };
  });
}

const philosophyText = "“Just five minutes” shouldn’t take your whole evening.";

async function quoteGeometry(page: Page) {
  return page.locator(".philosophy").evaluate((element) => {
    const title = element.querySelector<HTMLElement>("#philosophy-title")!;
    const words = Array.from(
      element.querySelectorAll<HTMLElement>(".philosophy-word"),
    );
    const rect = title.getBoundingClientRect();
    return {
      top: element.getBoundingClientRect().top,
      text: title.textContent!.trim(),
      headingTop: rect.top,
      headingBottom: rect.bottom,
      opacity: words.map((word) => Number(getComputedStyle(word).opacity)),
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
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPage(page);
  const canvas = page.locator('.hero-logo[data-state="ready"] canvas');
  await expect(canvas).toBeVisible({ timeout: 20000 });
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width * 0.15, viewport.height * 0.55);
  const firstFrame = await canvas.screenshot();
  await page.mouse.move(viewport.width * 0.85, viewport.height * 0.55, {
    steps: 6,
  });
  // Observe a real interval: reduced motion must ignore pointer-follow tilt.
  await page.waitForTimeout(750);
  const secondFrame = await canvas.screenshot();
  expect(
    secondFrame.equals(firstFrame),
    "Reduced motion keeps the 3D logo still during pointer movement",
  ).toBe(true);
  await expect(page.locator(".flow-section.is-sticky")).toHaveCount(0);
  await expect(page.locator(".flow-panel")).toHaveCount(3);
  const initialBlur = (await backdropGeometry(page)).blur;
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
    expect(
      (await backdropGeometry(page)).blur,
      "Reduced motion does not animate background blur",
    ).toBe(initialBlur);
  }
  await expect(page.locator(".philosophy-section.is-sticky-quote")).toHaveCount(
    0,
  );
  await page.locator(".philosophy").scrollIntoViewIfNeeded();
  await expect(page.locator(".philosophy")).not.toHaveCSS("position", "sticky");
  const quote = await quoteGeometry(page);
  expect(quote.text).toBe(philosophyText);
  expect(quote.opacity.length).toBeGreaterThan(1);
  expect(quote.opacity.every((opacity) => opacity === 1)).toBe(true);
  await expect(page.locator(".hero-logo")).toHaveAttribute(
    "data-visible",
    "false",
  );
  await expect(page.locator(".hero-logo")).toHaveCSS("visibility", "hidden");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.locator(".hero-logo")).toHaveAttribute(
    "data-visible",
    "true",
  );
  await expect(page.locator(".hero-logo")).toBeVisible();
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
    test.setTimeout(60000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
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
    }));
    const background = await backdropGeometry(page);
    await expect(page.locator(".intro-backdrop")).toHaveCSS(
      "position",
      "sticky",
    );
    expect(hero.height).toBeGreaterThanOrEqual(viewport.height - 1);
    expect(Math.abs(hero.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(background.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(background.height - viewport.height)).toBeLessThanOrEqual(
      1,
    );
    expect(background.blur).toBeLessThanOrEqual(0.1);
    expect(background.imageFilter).toMatch(/grayscale\(1\)/);
    expect(background.overlayContent).not.toBe("none");
    expect(background.overlay).toMatch(/rgba?\(0,\s*0,\s*0/);
    await expectRenderedHeroLogo(page);
    await expectNoOverflow(page);
    await page
      .locator(".hero")
      .getByRole("link", { name: "Explore Paul", exact: true })
      .click();
    await expect(page).toHaveURL(/#experience$/);
    await expect(
      page.getByRole("tab", { name: "Today", exact: true }),
    ).toBeInViewport();
  });

  test(`the ${size} sticky story enters smoothly, advances, and releases`, async ({
    page,
  }) => {
    // This walks through fifteen scroll positions, each awaiting the
    // scrubbed animation; software-rendered blur can be slower in CI.
    test.setTimeout(60000);
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

    // The same image stays at the viewport edge while the hero scrolls away.
    // Measure the rendered filter, not only the custom property driving it.
    expect(Math.abs((await backdropGeometry(page)).top)).toBeLessThanOrEqual(1);
    let previousBlur = (await backdropGeometry(page)).blur;
    for (const progress of [0.25, 0.5, 0.75, 1]) {
      await scrollToAndSettle(page, start * progress);
      const background = await backdropGeometry(page);
      expect(
        Math.abs(background.top),
        `Background stays still at hero progress ${progress}`,
      ).toBeLessThanOrEqual(1);
      expect(
        background.blur,
        "Blur increases gradually through the hero",
      ).toBeGreaterThan(previousBlur + 0.5);
      expect(background.blur).toBeLessThanOrEqual(14.1);
      previousBlur = background.blur;
      await expectNoOverflow(page);
    }
    expect(
      previousBlur,
      "The story starts with the full background blur",
    ).toBeGreaterThanOrEqual(13.5);

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
    const headerGap = await page
      .locator(".flow-pin")
      .evaluate((pin, narrow) => {
        const navigation = pin
          .querySelector(".flow-navigation")!
          .getBoundingClientRect();
        const content = pin
          .querySelector(
            narrow ? ".flow-panel-0 .flow-copy" : ".flow-panel-0 .float-layer",
          )!
          .getBoundingClientRect();
        return content.top - navigation.bottom;
      }, viewport.width <= 850);
    expect(
      headerGap,
      "Chapter navigation sits close to the story without overlapping it",
    ).toBeGreaterThanOrEqual(viewport.width <= 850 ? 16 : 24);
    expect(
      headerGap,
      "Chapter navigation and story form one visual group",
    ).toBeLessThanOrEqual(viewport.width <= 850 ? 36 : 80);

    for (const [index, progress] of [0.08, 0.54, 0.88].entries()) {
      await scrollToAndSettle(page, start + 1150 * progress);
      const panel = page.locator(`.flow-panel-${index}`);
      await expect(panel).toHaveCSS("opacity", "1");
      await expect(panel).toHaveCSS("visibility", "visible");
      expect(Math.abs((await flowGeometry(page)).pinTop)).toBeLessThanOrEqual(
        1,
      );
      const background = await backdropGeometry(page);
      expect(
        Math.abs(background.top),
        `The shared background stays pinned behind chapter ${index + 1}`,
      ).toBeLessThanOrEqual(1);
      expect(background.blur).toBeGreaterThanOrEqual(13.5);
      expect(background.blur).toBeLessThanOrEqual(14.1);
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
    const releasedBackground = await backdropGeometry(page);
    expect(
      Math.abs(releasedBackground.top + 90),
      "The background releases upward with the story",
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(releasedBackground.top - (await flowGeometry(page)).pinTop),
    ).toBeLessThanOrEqual(2);
    await expectNoOverflow(page);
    await page.locator("#your-space").scrollIntoViewIfNeeded();
    await expect(page.locator("#your-space h2")).toBeInViewport();
  });

  test(`the ${size} quote finishes revealing before release and rewinds on reverse scroll`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openPage(page);
    const section = page.locator(".philosophy-section.is-sticky-quote");
    await expect(section).toHaveCount(1);
    await expect(page.locator(".philosophy")).toHaveCSS("position", "sticky");
    const start = await section.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
    const move = (offset: number) =>
      scrollToAndSettle(page, start + offset, ".philosophy, .philosophy-word");

    await move(0);
    const initial = await quoteGeometry(page);
    expect(initial.text).toBe(philosophyText);
    expect(initial.opacity.length).toBe(philosophyText.split(" ").length);
    expect(Math.abs(initial.top)).toBeLessThanOrEqual(1);
    for (const opacity of initial.opacity) expect(opacity).toBeCloseTo(0.18, 2);

    await move(720 * 0.25);
    const quarter = await quoteGeometry(page);
    expect(Math.abs(quarter.top)).toBeLessThanOrEqual(1);
    expect(quarter.opacity[0]).toBeGreaterThan(quarter.opacity.at(-1)! + 0.3);
    expect(quarter.opacity.at(-1)).toBeCloseTo(0.18, 2);

    await move(720 * 0.55);
    const halfway = await quoteGeometry(page);
    expect(Math.abs(halfway.top)).toBeLessThanOrEqual(1);
    expect(
      halfway.opacity.reduce((sum, opacity) => sum + opacity, 0),
    ).toBeGreaterThan(
      quarter.opacity.reduce((sum, opacity) => sum + opacity, 0) + 1,
    );

    // Leave scroll room after the last word reaches full opacity. A quote
    // that finishes only after leaving the screen fails this assertion.
    for (const offset of [720 * 0.92, 718]) {
      await move(offset);
      const complete = await quoteGeometry(page);
      expect(Math.abs(complete.top)).toBeLessThanOrEqual(1);
      expect(complete.headingTop).toBeGreaterThanOrEqual(0);
      expect(complete.headingBottom).toBeLessThanOrEqual(viewport.height);
      for (const opacity of complete.opacity)
        expect(opacity).toBeGreaterThanOrEqual(0.995);
    }

    await move(720 * 0.25);
    const reversed = await quoteGeometry(page);
    expect(Math.abs(reversed.top)).toBeLessThanOrEqual(1);
    for (const [index, opacity] of reversed.opacity.entries()) {
      expect(
        opacity,
        "Each word follows the scroll position in both directions",
      ).toBeCloseTo(quarter.opacity[index], 2);
    }
    expect(reversed.opacity.at(-1)).toBeCloseTo(0.18, 2);

    await move(720 + 90);
    const released = await quoteGeometry(page);
    expect(Math.abs(released.top + 90)).toBeLessThanOrEqual(2);
    for (const opacity of released.opacity)
      expect(opacity).toBeGreaterThanOrEqual(0.995);
    expect(released.text).toBe(philosophyText);
    await expectNoOverflow(page);
  });
}

test("the hero logo responds to the pointer and returns toward its neutral pose", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openPage(page);
  await expect(page.locator(".hero-logo")).toHaveAttribute(
    "data-state",
    "ready",
    { timeout: 20000 },
  );
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Paul home" })
    .hover();
  const neutral = await settledLogoScreenshot(page);
  await page.mouse.move(1440 * 0.15, 550, { steps: 6 });
  const left = await settledLogoScreenshot(page);
  await page.mouse.move(1440 * 0.85, 550, { steps: 6 });
  const right = await settledLogoScreenshot(page);
  const leftShift = await screenshotDifference(page, neutral, left);
  const rightShift = await screenshotDifference(page, neutral, right);
  expect(
    leftShift,
    "Moving left changes the rendered model pose",
  ).toBeGreaterThan(0.0001);
  expect(
    rightShift,
    "Moving right changes the rendered model pose",
  ).toBeGreaterThan(0.0001);
  expect(
    await screenshotDifference(page, left, right),
    "Opposite pointer positions produce different poses",
  ).toBeGreaterThan(0.0001);
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Paul home" })
    .hover();
  const returned = await settledLogoScreenshot(page);
  expect(
    await screenshotDifference(page, neutral, returned),
    "Leaving the hero restores the neutral pose",
  ).toBeLessThan(Math.max(leftShift, rightShift) * 0.25);
  await expectNoOverflow(page);
});

test("the hero keeps a usable SVG fallback when WebGL is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      options?: unknown,
    ) {
      if (["webgl2", "webgl", "experimental-webgl"].includes(kind)) return null;
      return Reflect.apply(original, this, [kind, options]);
    } as typeof original;
  });
  await openPage(page);
  const logo = page.locator(".hero-logo");
  await expect(logo).toHaveAttribute("data-state", "fallback", {
    timeout: 20000,
  });
  await expect(logo).toHaveAttribute("aria-hidden", "true");
  const fallback = logo.locator(".hero-logo-fallback");
  await expect(fallback).toBeVisible();
  await expect
    .poll(() =>
      fallback.evaluate(
        (element) =>
          (element as HTMLImageElement).complete &&
          (element as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(logo.locator("canvas")).toHaveCount(0);
  await page
    .locator(".hero")
    .getByRole("link", { name: "Explore Paul", exact: true })
    .click();
  await expect(page).toHaveURL(/#experience$/);
  await expect(
    page.getByRole("tab", { name: "Today", exact: true }),
  ).toBeInViewport();
  await expectNoOverflow(page);
});

test("short screens keep the philosophy quote static and fully readable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 550 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openPage(page);
  await expect(page.locator(".philosophy-section.is-sticky-quote")).toHaveCount(
    0,
  );
  await expect(page.locator(".philosophy")).not.toHaveCSS("position", "sticky");
  await page.locator("#philosophy-title").scrollIntoViewIfNeeded();
  await expect(page.locator("#philosophy-title")).toBeInViewport();
  const quote = await quoteGeometry(page);
  expect(quote.text).toBe(philosophyText);
  expect(quote.opacity.every((opacity) => opacity === 1)).toBe(true);
  await expectNoOverflow(page);
});

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
