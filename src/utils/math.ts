import * as THREE from 'three'

// Helper to generate random point in sphere
export function randomPointInSphere(radius: number) {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const r = Math.cbrt(Math.random()) * radius

    const sinPhi = Math.sin(phi)
    return new THREE.Vector3(
        r * sinPhi * Math.cos(theta),
        r * sinPhi * Math.sin(theta),
        r * Math.cos(phi)
    )
}

// Generate cake shape positions (Strict Layers)
export function generateCakePositions(count: number, baseRadius: number = 3.5, totalHeight: number = 4) {
    const positions = []

    // Layer config: [RelativeRadius, RelativeHeight, ParticleShare]
    const layers = [
        { r: 1.0, h: 0.4, share: 0.5 }, // Bottom Base
        { r: 0.7, h: 0.3, share: 0.3 }, // Middle
        { r: 0.4, h: 0.3, share: 0.2 }  // Top
    ]

    // let currentCount = 0

    for (let i = 0; i < count; i++) {
        // Determine layer based on index
        let layerIndex = 0
        let threshold = layers[0].share * count
        if (i > threshold) {
            layerIndex = 1
            threshold += layers[1].share * count
            if (i > threshold) layerIndex = 2
        }

        const layer = layers[layerIndex]
        const r = baseRadius * layer.r
        const h = totalHeight * layer.h

        // Calculate Y center for this layer
        // Bottom layer sits at bottom, etc.
        // Let's stack them up from y = -2
        let yBase = -totalHeight / 2 // -2
        for (let l = 0; l < layerIndex; l++) {
            yBase += totalHeight * layers[l].h
        }
        // Center of this layer
        const yCenter = yBase + h / 2

        // Distribute points: Surface + Volume
        // Mostly surface for definition (95% surface)
        const isSurface = Math.random() > 0.05
        // If surface, use minimal noise
        const radiusSample = isSurface ? r : Math.sqrt(Math.random()) * r
        const theta = Math.random() * Math.PI * 2
        // Restrict height usage to be less "fluffy"
        const ySample = yCenter + (Math.random() - 0.5) * (h * 0.9)

        positions.push(
            radiusSample * Math.cos(theta),
            ySample,
            radiusSample * Math.sin(theta)
        )
    }

    return new Float32Array(positions)
}

// Explicit positions for candles on TOP of the top layer
export function generateCandlePositions(count: number, topRadius: number = 1.4, topHeight: number = 2) {
    const positions = []
    for (let i = 0; i < count; i++) {
        // Ring on top
        const theta = (i / count) * Math.PI * 2
        const r = topRadius * 0.8 // Slightly inside edge
        const x = r * Math.cos(theta)
        const z = r * Math.sin(theta)
        // Sink them slightly so they look inserted (topHeight - 0.3)
        const y = topHeight - 0.3

        positions.push(x, y, z)
    }
    return new Float32Array(positions)
}

export function generateChaosPositions(count: number, radius: number = 15) {
    const positions = []
    for (let i = 0; i < count; i++) {
        const p = randomPointInSphere(radius)
        positions.push(p.x, p.y, p.z)
    }
    return new Float32Array(positions)
}
