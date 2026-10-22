import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Image } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../store'
import { generateCakePositions, generateChaosPositions } from '../../utils/math'

function PolaroidItem({ chaosPos, targetPos }: { chaosPos: number[], targetPos: number[] }) {
    const ref = useRef<THREE.Group>(null)
    const progress = useStore((state) => state.progress)

    // Add some random float offsets per item
    const floatOffset = useMemo(() => ({
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5
    }), [])

    useFrame((state) => {
        if (!ref.current) return

        const cx = chaosPos[0]
        const cy = chaosPos[1]
        const cz = chaosPos[2]

        const tx = targetPos[0]
        const ty = targetPos[1]
        const tz = targetPos[2]

        const ix = THREE.MathUtils.lerp(cx, tx, progress)
        const iy = THREE.MathUtils.lerp(cy, ty, progress)
        const iz = THREE.MathUtils.lerp(cz, tz, progress)

        // Float effect
        const time = state.clock.elapsedTime
        const floatX = Math.sin(time * floatOffset.speed + floatOffset.phase) * 0.05
        const floatY = Math.cos(time * floatOffset.speed + floatOffset.phase * 2) * 0.05

        ref.current.position.set(ix + floatX, iy + floatY, iz)

        // Rotation: Look at center but slightly random ?
        // Or specific rotation for chaos vs formed?
        // Let's keep simpler LookAt(0,0,0) + Y rotate
        ref.current.lookAt(0, 0, 0)
        ref.current.rotateY(Math.PI)

        // Scale
        // Base scale [1, 1.2] (Portrait)
        const currentScale = THREE.MathUtils.lerp(1.2, 0.5, progress)
        ref.current.scale.set(1 * currentScale, 1.2 * currentScale, 1)
    })

    const url = '/photos/placeholder.svg'

    return (
        <group ref={ref as any}>
            {/* White Polaroid Frame */}
            {/* White Polaroid Frame - Center at 0 */}
            <mesh position={[0, 0, 0]}>
                <planeGeometry args={[1, 1.25]} />
                <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
            </mesh>

            {/* The Photo (Front) - Move out to 0.02 */}
            <Image
                url={url}
                transparent
                side={THREE.DoubleSide}
                position={[0, 0.1, 0.02]}
                scale={0.9}
            />
            {/* The Photo (Back) - Move out to -0.02 */}
            <Image
                url={url}
                transparent
                side={THREE.DoubleSide}
                position={[0, 0.1, -0.02]}
                rotation={[0, Math.PI, 0]}
                scale={0.9}
            />
        </group>
    )
}

export function Polaroids({ count = 44 }) {
    // Generate positions once
    const [chaos, target] = useMemo(() => {
        const c = generateChaosPositions(count, 12)
        const t = generateCakePositions(count, 4.0, 5)
        return [c, t]
    }, [count])

    return (
        <group>
            {Array.from({ length: count }).map((_, i) => (
                <PolaroidItem
                    key={i}
                    chaosPos={[chaos[i * 3], chaos[i * 3 + 1], chaos[i * 3 + 2]]}
                    targetPos={[target[i * 3], target[i * 3 + 1], target[i * 3 + 2]]}
                />
            ))}
        </group>
    )
}
