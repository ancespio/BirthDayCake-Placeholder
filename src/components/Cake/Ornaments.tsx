import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'
import { generateCakePositions, generateChaosPositions, generateCandlePositions } from '../../utils/math'

const tempObj = new THREE.Object3D()

function OrnamentGroup({
    count,
    geometry,
    material,
    scale = 1,
    isCandle = false // Special flag for candles
}: {
    count: number
    geometry: THREE.BufferGeometry
    material: THREE.Material
    scale?: number
    isCandle?: boolean
}) {
    const mesh = useRef<THREE.InstancedMesh>(null)
    const progress = useStore((state) => state.progress)

    const currentPositions = useMemo(() => new Float32Array(count * 3), [count])
    // Pre-calculate random rotation seeds/speeds to avoid jitter twitching
    const rotationSpeeds = useMemo(() => {
        const arr = new Float32Array(count * 3)
        for (let i = 0; i < count * 3; i++) arr[i] = (Math.random() - 0.5) * 2 // -1 to 1
        return arr
    }, [count])

    const [chaos, target] = useMemo(() => {
        const c = generateChaosPositions(count)
        let t: Float32Array

        if (isCandle) {
            // Top layer is roughly: 
            // Base(3.5) * 0.4 = 1.4 radius
            // Height is 4. Top is at y=2.
            t = generateCandlePositions(count, 1.4, 2.0)
        } else {
            t = generateCakePositions(count, 3.5, 4)
        }

        return [c, t]
    }, [count, isCandle])

    useLayoutEffect(() => {
        if (mesh.current) {
            for (let i = 0; i < count; i++) {
                currentPositions[i * 3] = chaos[i * 3]
                currentPositions[i * 3 + 1] = chaos[i * 3 + 1]
                currentPositions[i * 3 + 2] = chaos[i * 3 + 2]

                tempObj.position.set(chaos[i * 3], chaos[i * 3 + 1], chaos[i * 3 + 2])
                tempObj.scale.setScalar(scale)
                tempObj.updateMatrix()
                mesh.current.setMatrixAt(i, tempObj.matrix)
            }
            mesh.current.instanceMatrix.needsUpdate = true
        }
    }, [chaos, count, currentPositions, scale])

    useFrame((state) => {
        if (!mesh.current) return

        const globalTarget = progress

        for (let i = 0; i < count; i++) {
            const tx = target[i * 3]
            const ty = target[i * 3 + 1]
            const tz = target[i * 3 + 2]

            const cx = chaos[i * 3]
            const cy = chaos[i * 3 + 1]
            const cz = chaos[i * 3 + 2]

            // Direct mapping - no secondary lag
            const ix = THREE.MathUtils.lerp(cx, tx, globalTarget)
            const iy = THREE.MathUtils.lerp(cy, ty, globalTarget)
            const iz = THREE.MathUtils.lerp(cz, tz, globalTarget)

            tempObj.position.set(ix, iy, iz)

            // Fix jitter: use deterministic time-based rotation using pre-calc speeds
            // ROTATE only if not candle? Candles should be upright?
            // Gifts/Balls rotate.
            if (!isCandle) {
                tempObj.rotation.x = state.clock.elapsedTime * rotationSpeeds[i * 3]
                tempObj.rotation.y = state.clock.elapsedTime * rotationSpeeds[i * 3 + 1]
            } else {
                tempObj.rotation.set(0, 0, 0) // Candles upright
            }

            // If candle, flicker scale or generic scale
            if (isCandle) {
                tempObj.scale.set(scale, scale * (1 + Math.sin(state.clock.elapsedTime * 10 + i) * 0.1), scale)
            } else {
                tempObj.scale.setScalar(scale)
            }

            tempObj.updateMatrix()
            mesh.current.setMatrixAt(i, tempObj.matrix)
        }
        mesh.current.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow receiveShadow>
            <primitive object={geometry} />
            <primitive object={material} />
        </instancedMesh>
    )
}

export function Ornaments({ fallback = false }: { fallback?: boolean }) {
    const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
    const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 16), [])
    const candleGeo = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 6, 8), []) // Tall thin

    const giftMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff4444', roughness: 0.3 }), [])
    const ballMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#4444ff',
        roughness: fallback ? 0.6 : 0.1,
        metalness: fallback ? 0.2 : 0.8
    }), [fallback])
    const goldMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#ffd700',
        roughness: fallback ? 0.6 : 0.1,
        metalness: fallback ? 0.2 : 1.0
    }), [fallback])
    const candleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffaa00', emissiveIntensity: 0.5 }), [])

    return (
        <group>
            {/* Heavy Gifts - now uniform speed */}
            <OrnamentGroup count={30} geometry={boxGeo} material={giftMat} scale={0.4} />
            {/* Light Balls - now uniform speed */}
            <OrnamentGroup count={50} geometry={sphereGeo} material={ballMat} scale={0.25} />
            {/* Golden Balls */}
            <OrnamentGroup count={50} geometry={sphereGeo} material={goldMat} scale={0.3} />
            {/* Candles */}
            <OrnamentGroup count={21} geometry={candleGeo} material={candleMat} scale={0.2} isCandle={true} />
        </group>
    )
}
