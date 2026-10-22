import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useRef, Suspense } from 'react'
import * as THREE from 'three'
import { useStore } from './store'
import { Foliage } from './components/Cake/Foliage'
import { Ornaments } from './components/Cake/Ornaments'
import { Polaroids } from './components/Cake/Polaroids'
import { AnimationController } from './AnimationController'

function CameraRig() {
    // Optimization: Access state directly in loop to avoid re-renders
    // const { cameraOffset, cameraOffsetY, cameraZoom } = useStore(...) <- This causes 60fps re-renders

    useFrame((state) => {
        const { cameraOffset, cameraOffsetY, cameraZoom } = useStore.getState()
        // Base Position: [0, 15, 8]
        const targetX = cameraOffset
        const targetY = 15 + cameraOffsetY
        const targetZ = 8 - cameraZoom

        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.1)
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.1)
        state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.1)

        state.camera.lookAt(0, 2, 0)
    })
    return null
}

function RotationWrapper({ children }: { children: React.ReactNode }) {
    const group = useRef<THREE.Group>(null)
    useFrame((_state, delta) => {
        if (group.current) {
            // Speed depends on chaos level: (1 - progress)
            // Progress 0 (Chaos) -> Max speed
            // Progress 1 (Formed) -> Stop
            const progress = useStore.getState().progress
            const speed = 0.2 * (1 - progress)
            group.current.rotation.y += speed * delta
        }
    })
    return <group ref={group}>{children}</group>
}

export function Scene() {
    const isMobile = /Android|iPhone|iPod/i.test(navigator.userAgent)
    const isAndroid = /Android/i.test(navigator.userAgent)

    return (
        <Canvas
            gl={{ antialias: false, stencil: false, alpha: false }}
            camera={{ position: [0, 15, 8], fov: 40 }}
        >
            <color attach="background" args={['#050505']} />

            {/* <Environment preset="lobby" background={false} blur={0.8} /> */}
            <ambientLight intensity={1.5} />
            <directionalLight position={[5, 10, 5]} intensity={2} />
            <pointLight position={[-5, 5, -5]} intensity={1} />

            {/* Android Fallback Lights (Stronger since no HDRI) */}
            {isMobile && <ambientLight intensity={2} />}

            <Suspense fallback={null}>
                {/* GLOBAL FIX: Enable HDRI for everyone EXCEPT Android (Causes black screen hang) */}
                {!isAndroid && <Environment preset="lobby" background={false} blur={0.8} />}

                {/* Restored Cake Model */}
                <RotationWrapper>
                    <Foliage />
                    <Ornaments fallback={isAndroid} />
                    {/* Enable Polaroids for everyone (Optimized to WebP to reduce memory) */}
                    <Polaroids />
                </RotationWrapper>
                <CameraRig />
                <AnimationController />

                <EffectComposer>
                    <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.025} height={300} intensity={1.2} />
                </EffectComposer>
            </Suspense>

            <OrbitControls makeDefault />
        </Canvas>
    )
}
