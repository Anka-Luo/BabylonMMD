import "babylon-mmd/esm/Loader/Optimized/bpmxLoader";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeCameraAnimation";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeModelAnimation";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Rendering/geometryBufferRendererSceneComponent";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeCameraAnimation";
import "babylon-mmd/esm/Runtime/Animation/mmdRuntimeModelAnimation";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/core/Rendering/geometryBufferRendererSceneComponent";

import { type Engine, Scene, SceneLoader } from "@babylonjs/core";
import * as BABYLON from "@babylonjs/core";
import { ArcRotateCamera, Constants, Material, MirrorTexture, Plane, SSRRenderingPipeline } from "@babylonjs/core";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
// import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import HavokPhysics from "@babylonjs/havok";
import { GLTFFileLoader } from "@babylonjs/loaders";
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
import type { ISceneBuilder } from "./baseRuntime";/**
* 场景构建器类，用于创建和配置Babylon.js场景以及加载MMD模型和相关资源。
* /
* @export
* @class SceneBuilder
* @implements {ISceneBuilder} 异步构建场景的接口
*/
export class SceneBuilder implements ISceneBuilder {
    /**
     * 使用给定的HTML画布和引擎异步构建场景。
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



        // //Pipline
        // const defaultPipeline = new DefaultRenderingPipeline("default", true, scene, [mmdCamera, camera]);
        // defaultPipeline.samples = 4;
        // defaultPipeline.bloomEnabled = true;
        // defaultPipeline.chromaticAberrationEnabled = true;
        // defaultPipeline.chromaticAberration.aberrationAmount = 1;
        // defaultPipeline.fxaaEnabled = true;
        // defaultPipeline.imageProcessingEnabled = true;
        // defaultPipeline.imageProcessing.toneMappingEnabled = true;
        // defaultPipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
        // defaultPipeline.imageProcessing.vignetteWeight = 0.5;
        // defaultPipeline.imageProcessing.vignetteStretch = 0.5;
        // defaultPipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);
        // defaultPipeline.imageProcessing.vignetteEnabled = true;
        // //
        //ssr
        const ssrRenderingPipeline = new SSRRenderingPipeline(
            "ssr",
            scene,
            [mmdCamera, arcRotateCamera],
            false,
            Constants.TEXTURETYPE_UNSIGNED_BYTE
        );
        ssrRenderingPipeline.step = 32;
        ssrRenderingPipeline.maxSteps = 128;
        ssrRenderingPipeline.maxDistance = 500;
        ssrRenderingPipeline.enableSmoothReflections = false;
        ssrRenderingPipeline.enableAutomaticThicknessComputation = false;
        ssrRenderingPipeline.blurDownsample = 2;
        ssrRenderingPipeline.ssrDownsample = 2;
        ssrRenderingPipeline.thickness = 0.1;
        ssrRenderingPipeline.selfCollisionNumSkip = 2;
        ssrRenderingPipeline.blurDispersionStrength = 0;
        ssrRenderingPipeline.roughnessFactor = 0.1;
        ssrRenderingPipeline.reflectivityThreshold = 0.9;
        ssrRenderingPipeline.samples = 4;
        //
        let lastClickTime = -Infinity;
        _canvas.onclick = (): void => {
            const currentTime = performance.now();
            if (500 < currentTime - lastClickTime) {
                lastClickTime = currentTime;
                return;
            }

            lastClickTime = -Infinity;

            if (scene.activeCamera === mmdCamera) {
                // ssrRenderingPipeline.depthOfFieldEnabled = false;
                scene.activeCamera = arcRotateCamera;
            } else {
                // ssrRenderingPipeline.depthOfFieldEnabled = true;
                scene.activeCamera = mmdCamera;
            }
        };
        // const guiCamera = new ArcRotateCamera("GUICamera", Math.PI / 2 + Math.PI / 7, Math.PI / 2, 100, new Vector3(0, 20, 0), scene);
        // guiCamera.layerMask = 0x10000000;
        // scene.activeCameras = [mmdCamera, guiCamera];

        // let lastClickTime = -Infinity;
        // _canvas.onclick = (): void => {
        //     const currentTime = performance.now();
        //     if (500 < currentTime - lastClickTime) {
        //         lastClickTime = currentTime;
        //         return;
        //     }
        //     lastClickTime = -Infinity;
        //     scene.activeCameras = [mmdCamera, guiCamera];

        //     if (scene.activeCameras[0] === mmdCamera) scene.activeCameras = [camera, guiCamera];
        //     else scene.activeCameras = [mmdCamera, guiCamera];
        // };

        // // ...
        // const defaultPipeline = new DefaultRenderingPipeline("default", true, scene, [mmdCamera, arcRotateCamera]);
        //加载特效
        SceneLoader.RegisterPlugin(new GLTFFileLoader());

        const birds: any[] = [];
        const meshName = "SM_CownFish_lowpoly100.glb";
        const meshRooturl = "src/Boids/";
        const materialName = "NM_Fish";
        const materialFilePath = "src/Boids/" + materialName + ".json";
        const meshScale = 0.5;
        // 异步加载模型

        BABYLON.NodeMaterial.ParseFromFileAsync(materialName, materialFilePath, scene).then(birdmaterial => {
            BABYLON.SceneLoader.ImportMeshAsync("", meshRooturl, meshName, scene).then((result) => {
                const mesh_01 = result.meshes[1] as BABYLON.Mesh;
                mesh_01.scaling = new BABYLON.Vector3(meshScale, meshScale, meshScale);
                //视模型情况开启backFaceCulling
                birdmaterial.backFaceCulling = false;
                mesh_01.material = birdmaterial;
                mesh_01.setEnabled(false);
                const birdquantity = 100;
                for (let i = 0; i < birdquantity; i++) {
                    // 创建每只生物的实例
                    const bird = mesh_01.createInstance("bird" + i);
                    bird.material = birdmaterial;
                    // 初始随机设置每只生物的位置
                    const xRandomvalue = 15;
                    const yRandomvalue = 5;
                    const zRandomvalue = 15;
                    bird.position = new BABYLON.Vector3(
                        Math.random() * xRandomvalue - 1, Math.random() * yRandomvalue - 5, Math.random() * zRandomvalue - 5
                    );
                    birds.push(bird);
                }
            });
        });

        let t = 0;
        let rotationQuaternion = new BABYLON.Quaternion();
        scene.registerAfterRender(function() {
            t += 0.005;

            for (let i = 0; i < birds.length; i++) {
                const bird = birds[i];
                // bird move
                const position_origin = bird.position.clone();
                const xspeed = 0.05;
                const yspeed = 0.5;
                const zspeed = 0.2;
                bird.position.x += 0.3 * Math.sin(Math.PI * (t + i * xspeed));
                bird.position.y += 0.05 * Math.cos(Math.PI * (t + i * yspeed));
                bird.position.z += 0.3 * Math.sin(Math.PI * (t + i * zspeed));

                const velocity = bird.position.subtract(position_origin);

                //四元数旋转
                rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, -Math.atan2(velocity.z, velocity.x));
                bird.rotationQuaternion = rotationQuaternion;

                // Ausrichtung 速度一致性
                let alignmentVector = new BABYLON.Vector3();
                let alignmentCount = 0;
                for (let j = 0; j < birds.length; j++) {
                    if (i !== j) {
                        const otherBird = birds[j];
                        const distance = bird.position.subtract(otherBird.position).length();
                        if (distance < 1) {
                            alignmentVector = alignmentVector.add(otherBird.getDirection(BABYLON.Axis.Z));
                            // eslint-disable-next-line no-plusplus
                            alignmentCount++;
                        }
                    }
                }
                if (alignmentCount > 0) {
                    alignmentVector = alignmentVector.scale(1 / alignmentCount);
                }

                // Zusammenhalt 凝聚行为
                let cohesionVector = new BABYLON.Vector3();
                let cohesionCount = 0;
                for (let j = 0; j < birds.length; j++) {
                    if (i !== j) {
                        const otherBird = birds[j];
                        const distance = bird.position.subtract(otherBird.position).length();
                        if (distance < 2) { // 2
                            cohesionVector = cohesionVector.add(otherBird.position);
                            // eslint-disable-next-line no-plusplus
                            cohesionCount++;
                        }
                    }
                }
                if (cohesionCount > 0) {
                    cohesionVector = cohesionVector.scale(1 / cohesionCount);
                    bird.position = bird.position.add(cohesionVector.subtract(bird.position).scale(0.05));
                }

                // Trennung 分离行为
                let separationVector = new BABYLON.Vector3();
                for (let j = 0; j < birds.length; j++) {
                    if (i !== j) {
                        const otherBird = birds[j];
                        const distance = bird.position.subtract(otherBird.position).length();
                        if (distance < 2) { // 1
                            separationVector = separationVector.add(bird.position.subtract(otherBird.position).normalize().scale(1 / distance));
                        }
                    }
                }
                bird.position = bird.position.add(separationVector.scale(0.02));
            }
        });
        //
        return scene;
    }
}