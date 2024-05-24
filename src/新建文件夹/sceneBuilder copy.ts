import "babylon-mmd/esm/Loader/Optimized/bpmxLoader";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeCameraAnimation";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeModelAnimation";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Rendering/geometryBufferRendererSceneComponent";

import { ArcRotateCamera, Constants,  Material, MirrorTexture, Plane, SSRRenderingPipeline } from "@babylonjs/core";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { Scene } from "@babylonjs/core/scene";
import HavokPhysics from "@babylonjs/havok";
import { MmdPlayerControl } from "babylon-mmd";
// import type { MmdStandardMaterialBuilder } from "babylon-mmd/esm/Loader/mmdStandardMaterialBuilder";
import type { BpmxLoader } from "babylon-mmd/esm/Loader/Optimized/bpmxLoader";
import { BvmdLoader } from "babylon-mmd/esm/Loader/Optimized/bvmdLoader";
import { SdefInjector } from "babylon-mmd/esm/Loader/sdefInjector";
import { StreamAudioPlayer } from "babylon-mmd/esm/Runtime/Audio/streamAudioPlayer";
import { MmdCamera } from "babylon-mmd/esm/Runtime/mmdCamera";
import { MmdPhysics } from "babylon-mmd/esm/Runtime/mmdPhysics";
import { MmdRuntime } from "babylon-mmd/esm/Runtime/mmdRuntime";

// import { MmdPlayerControl } from "babylon-mmd/esm/Runtime/Util/mmdPlayerControl";
import type { ISceneBuilder } from "./baseRuntime";

export class SceneBuilder implements ISceneBuilder {
    /**
     * 使用给定的HTML画布和引擎异步构建场景。
     *
     * @param _canvas HTML画布元素，用于初始化Babylon.js场景。
     * @param engine Babylon.js引擎实例。
     * @returns {Promise<Scene>} 构建完成的Babylon.js场景实例。
     */
    public async build(_canvas: HTMLCanvasElement, engine: Engine): Promise<Scene> {
        // 初始化MMD相关插件和加载器
        const bpmxLoader = SceneLoader.GetPluginForExtension(".bpmx") as BpmxLoader;
        bpmxLoader.loggingEnabled = true;

        SdefInjector.OverrideEngineCreateEffect(engine);
        const materialBuilder = bpmxLoader.materialBuilder as any;
        // 配置材质构建器
        materialBuilder.useAlphaEvaluation = false;
        materialBuilder.loadOutlineRenderingProperties = (): void => { /* do nothing */ };

        // 配置透明材质处理
        const alphaBlendMaterials = ["face02", "Facial02", "HL", "Hairshadow", "q302"];
        const alphaTestMaterials = ["q301"];
        materialBuilder.afterBuildSingleMaterial = (material: any): any => {
            if (!alphaBlendMaterials.includes(material.name) && !alphaTestMaterials.includes(material.name)) return;
            material.transparencyMode = alphaBlendMaterials.includes(material.name)
                ? Material.MATERIAL_ALPHABLEND
                : Material.MATERIAL_ALPHATEST;
            material.useAlphaFromDiffuseTexture = true;
            material.diffuseTexture.hasAlpha = true;
        };

        // 初始化场景和基础相机
        const scene = new Scene(engine);
        scene.clearColor = new Color4(0.95, 0.95, 0.95, 1.0);

        // 设置MMD根节点和相机
        const mmdRoot = new TransformNode("mmdRoot", scene);
        mmdRoot.position.z -= 50;

        const mmdCamera = new MmdCamera("mmdCamera", new Vector3(0, 10, 0), scene);
        mmdCamera.maxZ = 5000;
        mmdCamera.parent = mmdRoot;

        const arcRotateCamera = new ArcRotateCamera("arcRotateCamera", 0, 0, 45, new Vector3(0, 10, 0), scene);
        arcRotateCamera.maxZ = 5000;
        arcRotateCamera.setPosition(new Vector3(0, 10, -45));
        arcRotateCamera.attachControl(_canvas, false);
        arcRotateCamera.inertia = 0.8;
        arcRotateCamera.speed = 10;

        // 设置光源
        const hemisphericLight = new HemisphericLight("hemisphericLight", new Vector3(0, 1, 0), scene);
        hemisphericLight.intensity = 0.4;
        hemisphericLight.specular.set(0, 0, 0);
        hemisphericLight.groundColor.set(1, 1, 1);

        const directionalLight = new DirectionalLight("directionalLight", new Vector3(0.5, -1, 1), scene);
        directionalLight.intensity = 0.8;
        directionalLight.autoCalcShadowZBounds = false;
        directionalLight.autoUpdateExtends = false;
        directionalLight.shadowMaxZ = 20;
        directionalLight.shadowMinZ = -15;
        directionalLight.orthoTop = 18;
        directionalLight.orthoBottom = -1;
        directionalLight.orthoLeft = -10;
        directionalLight.orthoRight = 10;
        directionalLight.shadowOrthoScale = 0;

        // 配置阴影生成器
        const shadowGenerator = new ShadowGenerator(1024, directionalLight, true);
        shadowGenerator.usePercentageCloserFiltering = true;
        shadowGenerator.forceBackFacesOnly = false;
        shadowGenerator.bias = 0.01;
        shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
        shadowGenerator.frustumEdgeFalloff = 0.1;

        // 创建地面和设置地面材质
        const ground = CreateGround("ground1", { width: 120, height: 120, subdivisions: 2, updatable: false }, scene);
        const groundMaterial = ground.material = new StandardMaterial("groundMaterial", scene);
        groundMaterial.diffuseColor = new Color3(0.65, 0.65, 0.65);
        ground.receiveShadows = true;

        groundMaterial.specularPower = 128;
        const groundReflectionTexture = groundMaterial.reflectionTexture = new MirrorTexture("MirrorTexture", 1024, scene, true);
        groundReflectionTexture.mirrorPlane = Plane.FromPositionAndNormal(ground.position, ground.getFacetNormal(0).scale(-1));
        groundReflectionTexture.level = 0.45;

        // 创建MMD运行时环境并注册到场景中
        const mmdRuntime = new MmdRuntime(new MmdPhysics(scene));
        mmdRuntime.loggingEnabled = false;
        mmdRuntime.register(scene);

        mmdRuntime.playAnimation();

        engine.displayLoadingUI();

        // 异步加载模型和动作
        const promises: Promise<any>[] = [];
        bpmxLoader.boundingBoxMargin = 60;
        promises.push(SceneLoader.ImportMeshAsync(
            undefined,
            "res/",
            "YYB Hatsune Miku_10th_v1.02.bpmx",
            scene
        ).then((result) => result.meshes[0] as Mesh));

        bpmxLoader.boundingBoxMargin = 0;
        bpmxLoader.buildSkeleton = false;
        bpmxLoader.buildMorph = false;
        promises.push(SceneLoader.ImportMeshAsync(
            undefined,
            "res/",
            "ガラス片ドームB.bpmx",
            scene
        ));

        const bvmdLoader = new BvmdLoader(scene);
        bvmdLoader.loggingEnabled = true;
        promises.push(bvmdLoader.loadAsync(
            "motion_1",
            "res/メランコリ・ナイト.bvmd"
        ));

        const loadResults = await Promise.all(promises);
        scene.onAfterRenderObservable.addOnce(() => engine.hideLoadingUI());

        // 音频加载和设置
        const audioPlayer = new StreamAudioPlayer(scene);
        audioPlayer.preservesPitch = true;
        audioPlayer.source = "res/higma - メランコリナイト  melancholy night feat.初音ミク.mp3";
        mmdRuntime.setAudioPlayer(audioPlayer);

        // 物理引擎设置
        scene.enablePhysics(new Vector3(0, -9.8 * 10, 0), new HavokPlugin(true, await HavokPhysics()));

        const mmdPlayerControl = new MmdPlayerControl(scene, mmdRuntime, audioPlayer);
        mmdPlayerControl.showPlayerControl();

        // 将模型和动画附加到场景中
        mmdRuntime.setCamera(mmdCamera);
        mmdCamera.addAnimation(loadResults[2]);
        mmdCamera.setAnimation("motion_1");

        const modelMesh = loadResults[0] as Mesh;
        modelMesh.parent = mmdRoot;
        modelMesh.receiveShadows = true;
        shadowGenerator.addShadowCaster(modelMesh);
        groundReflectionTexture.renderList = [modelMesh];

        // 骨骼和模型位置同步
        const bodyBone = modelMesh.skeleton!.bones.find((bone) => bone.name === "センター");
        const meshWorldMatrix = modelMesh.getWorldMatrix();
        const boneWorldMatrix = new Matrix();
        scene.onBeforeRenderObservable.add(() => {
            boneWorldMatrix.copyFrom(bodyBone!.getFinalMatrix()).multiplyToRef(meshWorldMatrix, boneWorldMatrix);
            boneWorldMatrix.getTranslationToRef(directionalLight.position);
            directionalLight.position.y -= 10;

            arcRotateCamera.target.copyFrom(directionalLight.position);
            arcRotateCamera.target.y += 13;
        });

        const mmdModel = mmdRuntime.createMmdModel(modelMesh);
        mmdModel.addAnimation(loadResults[2]);
        mmdModel.setAnimation("motion_1");

        return scene;
    }
}
