// 导入所需模块
import { ArcRotateCamera, Constants, Engine, HemisphericLight, Material, Scene, ShadowGenerator, StandardMaterial, Vector3 } from "@babylonjs/core";
import { MmdCamera, MmdRuntime, MmdPhysics } from "babylon-mmd";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

// 类型声明
interface ISceneBuilder {
    build(canvas: HTMLCanvasElement, engine: Engine): Promise<Scene>;
}

// 重构后的 SceneBuilder 类
export class SceneBuilder implements ISceneBuilder {
    public async build(canvas: HTMLCanvasElement, engine: Engine): Promise<Scene> {
        try {
            const scene = new Scene(engine);
            const mmdRoot = this.createMmdRoot(scene);
            const mmdCamera = this.setupMmdCamera(scene, mmdRoot);
            const arcRotateCamera = this.setupArcRotateCamera(canvas, scene, mmdCamera);
            this.setupLights(scene);
            const ground = this.createGround(scene);

            // 异步加载模型、动画等资源
            await this.loadModelAndAnimations(scene);

            // 配置材质、阴影等
            this.setupMaterials(scene);
            this.setupShadows(scene, mmdRoot, ground);

            // 配置物理模拟
            this.setupPhysics(scene, mmdRoot);

            // 配置音频
            this.setupAudio(scene);

            return scene;
        } catch (error) {
            console.error("Failed to build the scene:", error);
            throw error;
        }
    }

    // 分离出的辅助函数，负责创建 MMD 根节点
    private createMmdRoot(scene: Scene): TransformNode {
        const mmdRoot = new TransformNode("mmdRoot", scene);
        mmdRoot.position.z -= 50;
        return mmdRoot;
    }

    // 设置 MMD 相机
    private setupMmdCamera(scene: Scene, mmdRoot: TransformNode): MmdCamera {
        const mmdCamera = new MmdCamera("mmdCamera", new Vector3(0, 10, 0), scene);
        mmdCamera.maxZ = 5000;
        mmdCamera.parent = mmdRoot;
        return mmdCamera;
    }

    // 设置 ArcRotateCamera 相机
    private setupArcRotateCamera(canvas: HTMLCanvasElement, scene: Scene, mmdCamera: MmdCamera): ArcRotateCamera {
        const arcRotateCamera = new ArcRotateCamera("arcRotateCamera", 0, 0, 45, new Vector3(0, 10, 0), scene);
        arcRotateCamera.maxZ = 5000;
        arcRotateCamera.setPosition(new Vector3(0, 10, -45));
        arcRotateCamera.attachControl(canvas, false);
        arcRotateCamera.inertia = 0.8;
        arcRotateCamera.speed = 10;
        return arcRotateCamera;
    }

    // 设置灯光
    private setupLights(scene: Scene) {
        const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
        hemisphericLight.intensity = 0.4;
        hemisphericLight.specular.set(0, 0, 0);
        hemisphericLight.groundColor.set(1, 1, 1);

        const directionalLight = new DirectionalLight("directionalLight", new Vector3(0.5, -1, 1), scene);
        directionalLight.intensity = 0.8;
        // 其他灯光配置...
    }

    // 创建地面
    private createGround(scene: Scene): Mesh {
        const ground = CreateGround("ground1", { width: 120, height: 120, subdivisions: 2, updatable: false }, scene);
        const groundMaterial = ground.material = new StandardMaterial("groundMaterial", scene);
        groundMaterial.diffuseColor = new Color3(0.65, 0.65, 0.65);
        ground.receiveShadows = true;
        // 其他地面配置...
        return ground;
    }

    // 异步加载模型和动画
    private async loadModelAndAnimations(scene: Scene) {
        // 模型和动画加载代码
        const modelPromise = SceneLoader.ImportMeshAsync(undefined, "res/", "YYB Hatsune Miku_10th_v1.02.bpmx", scene);
        const animationPromise = SceneLoader.ImportMeshAsync(undefined, "res/", "ガラス片ドームB.bpmx", scene);
        // 动画加载代码...

        await Promise.all([modelPromise, animationPromise]);
    }

    // 配置材质
    private setupMaterials(scene: Scene) {
        // 材质配置代码
    }

    // 配置阴影
    private setupShadows(scene: Scene, mmdRoot: TransformNode, ground: Mesh) {
        const shadowGenerator = new ShadowGenerator(1024, directionalLight, true);
        shadowGenerator.usePercentageCloserFiltering = true;
        shadowGenerator.bias = 0.01;
        shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
        // 阴影配置...
    }

    // 配置物理模拟
    private setupPhysics(scene: Scene, mmdRoot: TransformNode) {
        const mmdRuntime = new MmdRuntime(new MmdPhysics(scene));
        mmdRuntime.loggingEnabled = false;
        mmdRuntime.register(scene);
        // 物理模拟配置...
    }

    // 配置音频
    private setupAudio(scene: Scene) {
        // 音频配置代码
    }
}