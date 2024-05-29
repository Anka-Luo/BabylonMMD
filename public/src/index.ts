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
    //这段代码的目的是在网页加载完成后设置一个canvas元素并将其添加到页面的body部分。以下是代码的详细解释：
    /*
    window.onload: 这是一个事件处理器，表示当整个页面（包括所有资源如图片）加载完成后触发。
        在这里，它被用作一个匿名箭头函数，该函数没有返回值，因此类型注解为(): void =>。

    document.createElement("canvas"): 这个方法创建了一个新的canvas元素。
        canvas元素用于在网页上绘制图形，可以使用JavaScript和Canvas API进行操作。

    canvas.style.width = "100%": 设置canvas元素的宽度为父元素的100%，使其占据整个容器的宽度。

    canvas.style.height = "100%": 类似地，设置canvas元素的高度也为父元素的100%，使其占据整个容器的高度。

    canvas.style.display = "block": 将canvas元素的CSS display属性设置为block，确保它作为块级元素独占一行，不会与其他元素并排显示。

    document.body.appendChild(canvas): 这个方法将canvas元素添加到body元素的子节点列表末尾，将其实际插入到HTML文档中。
    */

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
