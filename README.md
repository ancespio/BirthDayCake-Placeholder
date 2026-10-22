# 超级生日蛋糕 (Super Birthday Cake) 🎂

这是一个基于 React 19、Three.js 和 MediaPipe 构建的高保真 3D 互动网页应用。它展示了一个可以在“混沌散落”与“完美聚合”状态之间自由切换的金色生日蛋糕，并通过你的手势进行控制。

本公开示例版中的原照片已替换为通用占位插画。你可以将自己的图片放入 `public/photos/`，再按需修改 `src/components/Cake/Polaroids.tsx`。

## ✨ 特性

- **双坐标系统 (Dual-Position System)**：所有粒子和物体都在“混沌空间”和“目标形态”之间动态插值，实现丝滑的变形动画。
- **高保真视觉效果**：
  - **Foliage**: 数千个金色发光粒子组成的蛋糕主体，使用自定义 Shader 渲染。
  - **Ornaments**: 包含礼物盒、彩球和灯光，赋予不同的物理权重，飞行速度各不相同。
  - **Postprocessing**: 电影级的 Bloom 辉光效果，营造“金色光晕”。
- **手势控制 (Gesture Control)**：
  - 使用 Google MediaPipe 实时捕捉手部动作。
  - **右上角实时预览**：方便查看手势识别状态。

## 🎮 玩法指南

打开摄像头权限，使用以下手势控制场景：

1.  **🖐️ 张开手掌 (Unleash/Chaos)**
    - 蛋糕瞬间炸裂，变成漫天飞舞的粒子和礼物，散布在整个空间。
2.  **✊ 握紧拳头 (Formed/Cake)**
    - 所有碎片受到引力牵引，迅速聚合成一个完美的金色生日蛋糕。
3.  **🤏 捏合手指 (Pinch)**
    - 食指与大拇指捏合，**左右移动**手部。
    - 这将控制摄像机的水平移动，产生视差效果，让你从不同角度观察蛋糕。

## 🛠️ 技术栈

- **前端框架**: [React 19](https://react.dev/) + TypeScript
- **构建工具**: [Vite 6](https://vitejs.dev/)
- **3D 引擎**: [Three.js](https://threejs.org/) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- **视觉效果**: [Drei](https://github.com/pmndrs/drei) + [Postprocessing](https://github.com/pmndrs/react-postprocessing)
- **计算机视觉**: [MediaPipe Tasks Vision](https://developers.google.com/mediapipe)
- **样式**: [Tailwind CSS v3](https://tailwindcss.com/)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)

## 🚀 快速开始

1.  **安装依赖**
    ```bash
    npm install
    ```

2.  **启动开发服务器**
    ```bash
    npm run dev
    ```

3.  **构建生产版本**
    ```bash
    npm run build
    ```

## ⚠️ 注意事项

- 请确保允许浏览器访问**摄像头**权限，否则无法进行手势互动。
- 建议在**桌面端 Chrome/Edge** 浏览器上运行以获得最佳性能和兼容性。
- 右上角的摄像头预览仅在本地处理，**不会**上传任何视频数据。
