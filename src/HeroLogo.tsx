import { useEffect, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  Vector3,
  type BufferGeometry,
  type Material,
  type WebGLRenderTarget,
} from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const logoSource = `${import.meta.env.BASE_URL}paul-mark.svg`;

export default function HeroLogo() {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );

  useEffect(() => {
    const element = host.current!;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    const geometries: BufferGeometry[] = [];
    const materials: Material[] = [];
    const abort = new AbortController();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let renderer: WebGLRenderer | undefined;
    let environment: WebGLRenderTarget | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let frame = 0;
    let disposed = false;
    let failed = false;
    let visible = true;
    let ready = false;
    let published = false;
    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 30);
    const model = new Group();
    const baseRotation = { x: 0.12, y: -0.3 };
    const targetRotation = { ...baseRotation };
    let previousFrame = 0;
    model.rotation.set(baseRotation.x, baseRotation.y, -0.08);
    scene.add(model);

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousFrame = 0;
    };
    const fallback = () => {
      failed = true;
      stop();
      if (!disposed) setState("fallback");
    };
    const render = () => {
      if (
        !renderer ||
        failed ||
        disposed ||
        !ready ||
        !visible ||
        document.hidden
      )
        return;
      try {
        renderer.render(scene, camera);
        if (!published) {
          published = true;
          canvas.dataset.state = "ready";
          setState("ready");
        }
      } catch {
        fallback();
      }
    };
    // Render only while the pointer tilt settles, or when the canvas needs resizing.
    // There is no idle animation loop.
    const animate = (time: number) => {
      frame = 0;
      if (!ready || !visible || document.hidden || failed || disposed) return;
      // Use real elapsed time so slower renderers settle instead of stretching
      // a short ease into many expensive frames.
      const seconds = previousFrame
        ? (time - previousFrame) / 1000
        : 1 / 60;
      previousFrame = time;
      const ease = 1 - Math.exp(-10 * seconds);
      model.rotation.x += (targetRotation.x - model.rotation.x) * ease;
      model.rotation.y += (targetRotation.y - model.rotation.y) * ease;
      const settled =
        Math.abs(targetRotation.x - model.rotation.x) < 0.00015 &&
        Math.abs(targetRotation.y - model.rotation.y) < 0.00015;
      if (settled) {
        model.rotation.x = targetRotation.x;
        model.rotation.y = targetRotation.y;
      }
      render();
      if (!settled && !failed) frame = requestAnimationFrame(animate);
      else previousFrame = 0;
    };
    const requestRender = () => {
      if (frame || !ready || !visible || document.hidden || failed || disposed)
        return;
      frame = requestAnimationFrame(animate);
    };
    const resetTilt = (immediate = false) => {
      targetRotation.x = baseRotation.x;
      targetRotation.y = baseRotation.y;
      if (immediate) {
        model.rotation.x = baseRotation.x;
        model.rotation.y = baseRotation.y;
      }
      requestRender();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      fallback();
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
        resetTilt(true);
      } else requestRender();
    };
    const onPreferenceChange = () => resetTilt(true);
    canvas.addEventListener("webglcontextlost", onContextLost);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);

    const hero =
      element
        .closest(".intro-sequence")
        ?.querySelector<HTMLElement>(".hero-shell") ?? element;
    const onPointerMove = (event: PointerEvent) => {
      if (
        event.pointerType !== "mouse" ||
        !finePointer.matches ||
        reducedMotion.matches ||
        !visible
      )
        return;
      const bounds = hero.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
      );
      const y = Math.max(
        -1,
        Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1),
      );
      targetRotation.x = baseRotation.x - y * 0.075;
      targetRotation.y = baseRotation.y + x * 0.1;
      requestRender();
    };
    const onPointerLeave = () => resetTilt();
    hero.addEventListener("pointermove", onPointerMove, { passive: true });
    hero.addEventListener("pointerleave", onPointerLeave, { passive: true });
    intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      element.dataset.visible = String(visible);
      if (visible) requestRender();
      else {
        stop();
        resetTilt(true);
      }
    });
    intersectionObserver.observe(hero);

    const initialize = async () => {
      try {
        // Probe first so unsupported browsers quietly retain the lightweight SVG.
        const context = canvas.getContext("webgl2", {
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
        if (!context) {
          fallback();
          return;
        }
        renderer = new WebGLRenderer({
          canvas,
          context,
          alpha: true,
          antialias: true,
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.outputColorSpace = SRGBColorSpace;
        renderer.toneMapping = ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        element.appendChild(canvas);

        const response = await fetch(logoSource, { signal: abort.signal });
        if (!response.ok) throw new Error("Logo unavailable");
        const source = await response.text();
        if (disposed) return;
        const svg = new SVGLoader().parse(source);
        const shapes = svg.paths.flatMap((path) =>
          SVGLoader.createShapes(path),
        );
        if (!shapes.length) throw new Error("Empty logo");
        const extrusion = new ExtrudeGeometry(shapes, {
          depth: 40,
          steps: 1,
          bevelEnabled: true,
          bevelSegments: 6,
          bevelSize: 6,
          bevelThickness: 7,
          curveSegments: 24,
        });
        extrusion.center();
        extrusion.computeBoundingBox();
        const size = extrusion.boundingBox!.getSize(new Vector3());
        const scale = 2.9 / Math.max(size.x, size.y);
        extrusion.scale(scale, scale, scale);
        // Weld the bevel vertices before computing normals for smoothly machined edges.
        extrusion.deleteAttribute("normal");
        extrusion.deleteAttribute("uv");
        const geometry = mergeVertices(extrusion, 0.00001);
        extrusion.dispose();
        geometry.computeVertexNormals();
        geometries.push(geometry);
        const face = new MeshPhysicalMaterial({
          color: 0xd9d9d9,
          metalness: 1,
          roughness: 0.23,
          clearcoat: 0,
          envMapIntensity: 1.4,
        });
        materials.push(face);
        const mesh = new Mesh(geometry, face);
        mesh.scale.y = -1;
        model.add(mesh);

        // Studio softboxes exist only in the reflection map; the canvas stays transparent.
        const studio = new Scene();
        studio.background = new Color(0x151515);
        const card = (
          width: number,
          height: number,
          x: number,
          y: number,
          z: number,
          intensity: number,
        ) => {
          const cardGeometry = new PlaneGeometry(width, height);
          const cardMaterial = new MeshBasicMaterial({
            color: new Color().setScalar(intensity),
            side: DoubleSide,
          });
          const lightCard = new Mesh(cardGeometry, cardMaterial);
          lightCard.position.set(x, y, z);
          lightCard.lookAt(0, 0, 0);
          studio.add(lightCard);
          geometries.push(cardGeometry);
          materials.push(cardMaterial);
        };
        card(5, 7, -4, 2, 5, 4.5);
        card(5, 6, 4, -1, 3, 3);
        card(8, 4, 0, 5, 2, 5);
        const pmrem = new PMREMGenerator(renderer);
        try {
          environment = pmrem.fromScene(studio, 0.1, 0.1, 30, { size: 128 });
          scene.environment = environment.texture;
        } finally {
          pmrem.dispose();
        }
        const key = new DirectionalLight(0xffffff, 2.4);
        key.position.set(-3, 5, 5);
        const rim = new DirectionalLight(0xffffff, 3.3);
        rim.position.set(4, 1, -2);
        scene.add(key, rim);

        let previousWidth = 0;
        let previousHeight = 0;
        const resize = () => {
          if (!renderer || disposed || failed) return;
          const { width, height } = element.getBoundingClientRect();
          if (
            !width ||
            !height ||
            (width === previousWidth && height === previousHeight)
          )
            return;
          previousWidth = width;
          previousHeight = height;
          camera.aspect = width / height;
          camera.position.z = 5.8 / Math.min(camera.aspect, 1);
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
          requestRender();
        };
        ready = true;
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(element);
        resize();
        requestRender();
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          fallback();
      }
    };
    // Deferring setup lets React discard its development-only probe effect
    // before allocating a second WebGL context or compiling the same shaders.
    const initializationFrame = requestAnimationFrame(() => void initialize());

    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(initializationFrame);
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);
      hero.removeEventListener("pointermove", onPointerMove);
      hero.removeEventListener("pointerleave", onPointerLeave);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      environment?.dispose();
      renderer?.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div ref={host} className="hero-logo" data-state={state} aria-hidden="true">
      <img className="hero-logo-fallback" src={logoSource} alt="" />
    </div>
  );
}
