import type { Engine } from "@babylonjs/core/Engines/engine";
import type { Scene } from "@babylonjs/core/scene";

/**
 * 定义一个场景构造器接口，负责构建或异步构建Babylon.js场景。
 */
export interface ISceneBuilder {
    build(canvas: HTMLCanvasElement, engine: Engine): Scene | Promise<Scene>;
}

/**
 * 定义初始化BaseRuntime类所需的基参数接口。
 */
export interface BaseRuntimeInitParams {
    canvas: HTMLCanvasElement; // 用于渲染的HTML画布元素
    engine: Engine; // Babylon.js引擎实例
    sceneBuilder: ISceneBuilder; // 场景构造器实例
}

/**
 * BaseRuntime类提供了一个基础的运行时环境，用于初始化、运行和销毁Babylon.js场景。
 */
export class BaseRuntime {
    private readonly _canvas: HTMLCanvasElement;
    private readonly _engine: Engine;
    private _scene: Scene;
    private _onTick: () => void;

    /**
     * 私有构造函数，用于确保通过Create方法实例化。
     * @param params 初始化参数，包括画布、引擎和场景构造器。
     */
    private constructor(params: BaseRuntimeInitParams) {
        this._canvas = params.canvas;
        this._engine = params.engine;

        this._scene = null!;
        this._onTick = null!;
    }

    /**
     * 静态方法，用于异步创建BaseRuntime实例。
     * @param params 初始化参数。
     * @returns 返回一个Promise，解析为BaseRuntime实例。
     */
    public static async Create(params: BaseRuntimeInitParams): Promise<BaseRuntime> {
        const runtime = new BaseRuntime(params);
        runtime._scene = await runtime._initialize(params.sceneBuilder);
        runtime._onTick = runtime._makeOnTick();
        return runtime;
    }

    /**
     * 启动渲染循环和事件监听器。
     */
    public run(): void {
        const engine = this._engine;

        window.addEventListener("resize", this._onResize);
        engine.runRenderLoop(this._onTick);
    }

    /**
     * 清理资源，移除事件监听器并销毁引擎。
     */
    public dispose(): void {
        window.removeEventListener("resize", this._onResize);
        this._engine.dispose();
    }

    /**
     * 当浏览器窗口大小改变时调用，用于调整渲染画布的大小。
     */
    private readonly _onResize = (): void => {
        this._engine.resize();
    };

    /**
     * 初始化场景。
     * @param sceneBuilder 场景构造器。
     * @returns 返回一个Promise，解析为构建的场景实例。
     */
    private async _initialize(sceneBuilder: ISceneBuilder): Promise<Scene> {
        return await sceneBuilder.build(this._canvas, this._engine);
    }

    /**
     * 创建一个渲染回调函数。
     * @returns 返回一个函数，当调用时会触发场景渲染。
     */
    private _makeOnTick(): () => void {
        const scene = this._scene;
        return () => scene.render();
    }
}
