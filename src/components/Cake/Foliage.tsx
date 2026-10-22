import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store'
import { generateCakePositions, generateChaosPositions } from '../../utils/math'

const vertexShader = `
  uniform float uProgress;
  uniform float uTime;
  
  attribute vec3 aPositionTarget;
  attribute vec3 aPositionChaos;
  attribute float aSize;
  
  varying vec3 vColor;
  
  void main() {
    // Uniform linear interpolation to match other objects
    float t = uProgress;
    // Removed cubic easing to match ornaments speed
    // t = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;

    vec3 finalPos = mix(aPositionChaos, aPositionTarget, t);
    
    // Add some noise/wind movement
    finalPos.x += sin(uTime + finalPos.y) * 0.05 * (1.0 - t); // More movement in chaos
    finalPos.y += cos(uTime + finalPos.x) * 0.05 * (1.0 - t);

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    
    // Color transition: Chaos (Cool) -> Formed (Warm/Gold)
    vec3 colorChaos = vec3(0.5, 0.8, 0.9);
    vec3 colorFormed = vec3(1.0, 0.84, 0.0); // Gold
    vColor = mix(colorChaos, colorFormed, t);
  }
`

const fragmentShader = `
  varying vec3 vColor;
  
  void main() {
    // Circular particle
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    
    // Smooth edge
    float alpha = 1.0 - smoothstep(0.4, 0.5, r);
    
    gl_FragColor = vec4(vColor, alpha);
  }
`

export function Foliage({ count = 5000 }) {
    const mesh = useRef<THREE.Points>(null)
    const progress = useStore((state) => state.progress)

    const uniforms = useMemo(() => ({
        uProgress: { value: 0 },
        uTime: { value: 0 }
    }), [])

    const [chaos, target, sizes] = useMemo(() => {
        const c = generateChaosPositions(count)
        // Use default layered args or custom? Default is fine [3.5, 4]
        const t = generateCakePositions(count, 3.5, 4)
        const s = new Float32Array(count)
        for (let i = 0; i < count; i++) s[i] = Math.random() * 0.5 + 0.2
        return [c, t, s]
    }, [count])

    useFrame((state) => {
        if (mesh.current) {
            // Lerp the store progress for smoothness (optional here if store updates fast enough, but shader needs uniform)
            // Actually we can pass store progress directly if it's animated smoothly externally
            // But let's assume store triggers state change and we animate here or store animates
            // For now, let's just pass the value. Usually better to lerp value in useFrame if store is "target state"
            // But Implementation Plan says "Lerp in useFrame".
            // Let's assume store holds the TARGET state or ACTUALLY interpolated value. 
            // Plan: "Map gestures to State (Open=Chaos, ...)", so store is target.
            // We need local lerp logic here.

            // Directly map progress to uniform to match other components exactly
            // The store 'progress' is already smoothed by AnimationController
            uniforms.uProgress.value = progress
            uniforms.uTime.value = state.clock.elapsedTime
        }
    })

    return (
        <points ref={mesh}>
            <bufferGeometry>
                {/* We cheat: reuse 'position' as temp or just use custom attributes. 
            Standard points material uses 'position'. 
            For shader, we ignore 'position' attribute or set it to 0 and use aPositionTarget/Chaos? 
            Or we can just set one of them as 'position'. 
            Let's set "position" to chaos initially so raycasting works if needed (not needed for particles usually).
            Actually BufferGeometry needs 'position'. We can just give it zeros or copy chaos.
        */}
                <bufferAttribute attach="attributes-position" args={[chaos, 3]} />
                <bufferAttribute attach="attributes-aPositionChaos" args={[chaos, 3]} />
                <bufferAttribute attach="attributes-aPositionTarget" args={[target, 3]} />
                <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
            </bufferGeometry>
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    )
}
