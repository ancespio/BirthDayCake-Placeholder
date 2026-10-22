import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from './store'

export function AnimationController() {
    // We subscribe to goal in useFrame to avoid re-renders of this component, 
    // but reading from store inside useFrame is fine via selector or transient update?
    // Let's just use transient state usage pattern if possible, or simple lerp.

    useFrame((_state, delta) => {
        // Read directly from store instance to avoid react re-render overhead if possible, 
        // but zustand hook triggers render. 
        // Better:
        const currentProgress = useStore.getState().progress
        const goal = useStore.getState().goalProgress

        // Smoothly interpolate
        // Critically damped spring or simple lerp
        // Let's use a simple framerate-independent lerp

        const diff = goal - currentProgress
        if (Math.abs(diff) > 0.001) {
            // Adjust speed: 3.0 is faster
            const newProgress = THREE.MathUtils.lerp(currentProgress, goal, 3.0 * delta)
            useStore.setState({ progress: newProgress })
        }
    })

    return null
}
