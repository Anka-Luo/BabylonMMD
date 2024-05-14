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
    public async build(_canvas: HTMLCanvasElement, engine: Engine): Promise<Scene> {

        const bpmxLoader = SceneLoader.GetPluginForExtension(".bpmx") as BpmxLoader;
        bpmxLoader.loggingEnabled = true;

        SdefInjector.OverrideEngineCreateEffect(engine);
        const materialBuilder = bpmxLoader.materialBuilder as any;
        materialBuilder.useAlphaEvaluation = false;
        materialBuilder.loadOutlineRenderingProperties = (): void => { /* do nothing */ };


        //a
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

        const scene = new Scene(engine);
        scene.clearColor = new Color4(0.95, 0.95, 0.95, 1.0);

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
        //

        //light
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

        const shadowGenerator = new ShadowGenerator(1024, directionalLight, true);
        shadowGenerator.usePercentageCloserFiltering = true;
        shadowGenerator.forceBackFacesOnly = false;
        shadowGenerator.bias = 0.01;
        shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
        shadowGenerator.frustumEdgeFalloff = 0.1;
        //

        const ground = CreateGround("ground1", { width: 120, height: 120, subdivisions: 2, updatable: false }, scene);
        const groundMaterial = ground.material = new StandardMaterial("groundMaterial", scene);
        groundMaterial.diffuseColor = new Color3(0.65, 0.65, 0.65);
        ground.receiveShadows = true;

        groundMaterial.specularPower = 128;
        const groundReflectionTexture = groundMaterial.reflectionTexture = new MirrorTexture("MirrorTexture", 1024, scene, true);
        groundReflectionTexture.mirrorPlane = Plane.FromPositionAndNormal(ground.position, ground.getFacetNormal(0).scale(-1));

        groundReflectionTexture.level = 0.45;



        // create mmd runtime
        const mmdRuntime = new MmdRuntime(new MmdPhysics(scene));
        mmdRuntime.loggingEnabled = false;
        mmdRuntime.register(scene);

        mmdRuntime.playAnimation();

        engine.displayLoadingUI();


        const promises: Promise<any>[] = [];
        //model load
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
        //motion load
        promises.push(bvmdLoader.loadAsync(
            "motion_1",
            "res/メランコリ・ナイト.bvmd"

        ));


        const loadResults = await Promise.all(promises);
        scene.onAfterRenderObservable.addOnce(() => engine.hideLoadingUI());

        loadResults;

        //aduio load
        const audioPlayer = new StreamAudioPlayer(scene);
        audioPlayer.preservesPitch = true;
        audioPlayer.source = "res/higma - メランコリナイト  melancholy night feat.初音ミク.mp3";
        mmdRuntime.setAudioPlayer(audioPlayer);


        //physics
        // ...
        scene.enablePhysics(new Vector3(0, -9.8 * 10, 0), new HavokPlugin(true, await HavokPhysics()));

        const mmdPlayerControl = new MmdPlayerControl(scene, mmdRuntime, audioPlayer);
        mmdPlayerControl.showPlayerControl();
        engine.displayLoadingUI();



        mmdRuntime.setCamera(mmdCamera);
        mmdCamera.addAnimation(loadResults[2]);
        mmdCamera.setAnimation("motion_1");

        const modelMesh = loadResults[0] as Mesh;
        modelMesh.parent = mmdRoot;
        modelMesh.receiveShadows = true;
        shadowGenerator.addShadowCaster(modelMesh);
        groundReflectionTexture.renderList = [modelMesh];



        const bodyBone = modelMesh.skeleton!.bones.find((bone) => bone.name === "センター");
        const meshWorldMatrix = modelMesh.getWorldMatrix();
        const boneWorldMatrix = new Matrix();
        scene.onBeforeRenderObservable.add(() => {
            boneWorldMatrix.copyFrom(bodyBone!.getFinalMatrix()).multiplyToRef(meshWorldMatrix, boneWorldMatrix);
            boneWorldMatrix.getTranslationToRef(directionalLight.position);
            directionalLight.position.y -= 10;

            arcRotateCamera.target.copyFrom(directionalLight.position);
            arcRotateCamera.target.y += 13;
        });//

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
        return scene;
    }
}
