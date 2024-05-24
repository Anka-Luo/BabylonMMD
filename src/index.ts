import { Engine } from "@babylonjs/core/Engines/engine";

import { BaseRuntime } from "./baseRuntime";
import { SceneBuilder } from "./sceneBuilder";

/**
 * 初始化页面加载完成后执行的函数。
 * 该函数创建一个Canvas元素，用于Babylon.js引擎的渲染目标，并初始化一个Babylon.js引擎实例。
 * 然后，利用这个引擎实例和指定的场景构建器创建并运行一个基础运行时环境。
 */
window.onload = (): void => {
    // 创建一个新的canvas元素并设置其样式，之后将其添加到文档的body元素中。
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    document.body.appendChild(canvas);

    // 使用canvas元素创建一个Babylon.js引擎实例，配置引擎的选项如是否保留绘制缓冲区等。
    const engine = new Engine(canvas, false, {
        preserveDrawingBuffer: false,
        premultipliedAlpha: false,
        powerPreference: "high-performance",
        audioEngine: false,
        doNotHandleContextLost: true,
        doNotHandleTouchAction: true,
        antialias: false,
        stencil: false
    }, true);

    // 使用创建的canvas、engine和一个新的SceneBuilder实例，异步创建基础运行时环境。
    // 创建成功后，运行这个运行时环境。
    BaseRuntime.Create({
        canvas,
        engine,
        sceneBuilder: new SceneBuilder()
    }).then(runtime => runtime.run());
};
