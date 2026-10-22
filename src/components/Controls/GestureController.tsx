import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { useStore } from '../../store'


// Helper to draw skeleton
function drawResults(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    ctx.lineWidth = 2
    ctx.strokeStyle = '#00ff00'
    ctx.fillStyle = '#ff0000'

    for (const land of landmarks) {
        // MediaPipe landmarks are 0..1
        // We need to map to canvas
        const w = ctx.canvas.width
        const h = ctx.canvas.height

        // Connections
        // Wrist(0) - Thumb(1-4)
        // Wrist(0) - Index(5-8)
        // Index..Pinky MCPs (5,9,13,17) connected?
        // Let's just draw points for simplicity first, or simple lines

        // Simple: Connect 0->1->2->3->4
        const fingers = [
            [0, 1, 2, 3, 4],
            [0, 5, 6, 7, 8],
            [5, 9, 10, 11, 12], // 5-9 is usually connected in palm
            [9, 13, 14, 15, 16],
            [13, 17, 18, 19, 20],
            [0, 17] // Palm base
        ]

        ctx.beginPath()
        for (const chain of fingers) {
            for (let i = 0; i < chain.length - 1; i++) {
                const i1 = chain[i]
                const i2 = chain[i + 1]
                const p1 = land[i1]
                const p2 = land[i2]
                ctx.moveTo(p1.x * w, p1.y * h)
                ctx.lineTo(p2.x * w, p2.y * h)
            }
        }
        ctx.stroke()

        // Draw points
        for (const p of land) {
            ctx.beginPath()
            ctx.arc(p.x * w, p.y * h, 3, 0, 2 * Math.PI)
            ctx.fill()
        }
    }
}

export function GestureController() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [loaded, setLoaded] = useState(false)
    const lastVideoTime = useRef(-1)
    const requestRef = useRef<number>(0)
    const lastDebugUpdate = useRef(0)
    // We use ref to store latest command to avoid flickering
    const handLandmarkerRef = useRef<HandLandmarker | null>(null)
    const [error, setError] = useState<string | null>(null)
    const isInitializing = useRef(false)
    const commandState = useRef<'CHAOS' | 'FORMED'>('FORMED')
    const lastPinchDist = useRef<number | null>(null)
    const lastPinchPos = useRef<{ x: number, y: number } | null>(null)
    const [, setDebugStats] = useState({ hands: 0, state: 'NONE', step: 'Idle', readyState: 0 })
    const [, setLogs] = useState<string[]>([])

    // Mobile Console Logger
    useEffect(() => {
        const originalError = console.error
        const errorHandler = (msg: any, ...args: any[]) => {
            const fullMsg = `${msg} ${args.join(' ')}`
            // Filter benign TFLite/MediaPipe INFO logs that some browsers treat as errors
            if (fullMsg.includes("INFO:") || fullMsg.includes("XNNPACK")) return
            // Filter benign WASM network glitches (it falls back automatically)
            if (fullMsg.includes("wasm streaming compile failed") || fullMsg.includes("falling back to ArrayBuffer")) return

            setLogs(prev => [...prev.slice(-4), `ERR: ${fullMsg}`]) // Keep last 5
            originalError.apply(console, [msg, ...args])
        }
        console.error = errorHandler

        const windowHandler = (event: ErrorEvent) => {
            setLogs(prev => [...prev.slice(-4), `WIN: ${event.message}`])
        }
        window.addEventListener('error', windowHandler)

        return () => {
            console.error = originalError
            window.removeEventListener('error', windowHandler)
        }
    }, [])

    // Auto-start on mount
    useEffect(() => {
        startCamera()
        return () => {
            cancelAnimationFrame(requestRef.current)
            if (handLandmarkerRef.current) {
                handLandmarkerRef.current.close()
                handLandmarkerRef.current = null
            }
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
                tracks.forEach(track => track.stop())
            }
        }
    }, [])

    async function startCamera() {
        // Prevent double init
        if (isInitializing.current || handLandmarkerRef.current) return
        isInitializing.current = true

        // Clear logs on retry
        setLogs([])
        setError(null)
        try {
            // Simple robust check for iOS devices
            const isIOS = /iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

            setDebugStats(prev => ({ ...prev, step: 'Loading Vision Wasm...' }))
            useStore.setState({ cameraStatus: 'Loading Engine...' }) // 25%
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            )

            // OPTIMIZATION STRATEGY:
            // Desktop/Android: usage of GPU delegate is preferred for performance.
            // iOS: Recent WebGL/MediaPipe issues cause crashes with GPU delegate. 
            // We explicitely fallback to CPU or standard auto-selection for iOS.
            const baseOptions: any = {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            }
            if (!isIOS) {
                baseOptions.delegate = "GPU"
            } else {
                // Ensure safer execution on iOS
                baseOptions.delegate = "CPU"
            }

            setDebugStats(prev => ({ ...prev, step: 'Loading Model...' }))
            useStore.setState({ cameraStatus: 'Loading AI Model...' }) // 50%
            try {
                // iOS MEMORY FIX: Reduce numHands to 1 to save ~40% WASM memory
                handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
                    baseOptions,
                    runningMode: "VIDEO",
                    numHands: isIOS ? 1 : 2
                })
            } catch (initErr) {
                console.warn("Primary init failed, retrying with defaults", initErr)
                setDebugStats(prev => ({ ...prev, step: 'Model Fallback...' }))
                // Absolute fallback
                handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                        delegate: "CPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1 // Safety fallback always 1
                })
            }

            const video = videoRef.current
            if (!video) {
                isInitializing.current = false
                return
            }

            setDebugStats(prev => ({ ...prev, step: 'Requesting Camera...' }))
            useStore.setState({ cameraStatus: 'Accessing Camera...' }) // 75%

            // iOS MEMORY FIX: Very low resolution
            const constraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: isIOS ? 320 : 640 },
                    height: { ideal: isIOS ? 240 : 480 }
                }
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            video.srcObject = stream

            // iOS Autoplay Policy Handling:
            // We try to play. If it fails (Promise rejected), it means the browser requires user interaction.
            // We throw a specific error to trigger the "Tap to Start" UI.
            setDebugStats(prev => ({ ...prev, step: 'Starting Video...' }))
            useStore.setState({ cameraStatus: 'Starting Video...' }) // 90%
            try {
                await video.play()
            } catch (playErr) {
                console.warn("Autoplay blocked/failed", playErr)
                // Try again muted if not already (safeguard)
                video.muted = true
                await video.play().catch(e => console.error("Retry play failed", e))
            }

            setDebugStats(prev => ({ ...prev, step: 'Waiting for Data...' }))

            useStore.setState({ cameraStatus: 'Starting Video...' }) // 90%
            const startPredicting = () => {
                if (isInitializing.current && !loaded) { // Only start once
                    setLoaded(true)
                    useStore.setState({ cameraReady: true, cameraStatus: 'Ready' }) // <--- Ready Signal
                    setDebugStats(prev => ({ ...prev, step: 'Running', readyState: video.readyState }))
                    if (handLandmarkerRef.current) {
                        predict()
                    }
                }
            }

            if (video.readyState >= 2) {
                startPredicting()
            } else {
                video.addEventListener('loadeddata', startPredicting)
                video.addEventListener('canplay', startPredicting)
            }
        } catch (err: any) {
            console.error("Camera/MediaPipe Error", err)
            setError(err.message || "Camera Error")
            isInitializing.current = false
        }
    }

    // Predict safe wrapper
    function predict() {
        const handLandmarker = handLandmarkerRef.current
        if (!handLandmarker) return

        requestRef.current = requestAnimationFrame(predict)

        const video = videoRef.current
        if (!video || !video.videoWidth) return

        // Throttling: Limit to ~10 FPS (100ms) on mobile to prevent overheating/crash
        const now = performance.now()
        // Simple check for iOS/Android user agent
        const isMobile = /iPhone|iPod|Android/i.test(navigator.userAgent)
        const frameInterval = isMobile ? 100 : 0 // 0 = max fps on desktop

        if (now - lastVideoTime.current < frameInterval) return
        lastVideoTime.current = now

        try {
            // Pass "now" as timestamp
            const results = handLandmarker.detectForVideo(video, now)
            // ...

            // --- Drawing Logic ---
            // Optimization: Skip drawing on mobile to save GPU for 3D Scene
            if (!isMobile && canvasRef.current && video) {
                const ctx = canvasRef.current.getContext('2d')
                if (ctx) {
                    if (canvasRef.current.width !== video.videoWidth) {
                        canvasRef.current.width = video.videoWidth
                        canvasRef.current.height = video.videoHeight
                    }
                    if (results.landmarks && results.landmarks.length > 0) {
                        drawResults(ctx, results.landmarks)
                    } else {
                        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
                    }
                }
            }

            // --- Hand Control Logic ---
            if (results.landmarks && results.landmarks.length > 0) {
                // console.log("Landmarks detected:", results.landmarks.length)
                handleGestures(results.landmarks)
            }
        } catch (e) {
            console.error("Prediction loop error", e)
        }
    }

    // Extracted gesture logic for clarity
    function handleGestures(landmarks: any[]) {
        // 1. Logic (Chaos/Formed)
        const primaryHand = landmarks[0]
        // Safe check for points
        if (!primaryHand[0] || !primaryHand[12] || !primaryHand[9]) return

        const wrist = primaryHand[0]
        const tip = primaryHand[12]
        const mcp = primaryHand[9]
        const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y)
        const mcpDist = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y)
        const ratio = mcpDist > 0.001 ? distTip / mcpDist : 0

        // console.log("Gesture Ratio:", ratio)

        if (ratio > 1.6) commandState.current = 'CHAOS'
        else if (ratio < 1.1) commandState.current = 'FORMED'
        useStore.setState({ goalProgress: commandState.current === 'CHAOS' ? 0 : 1 })

        // 2. Camera Controls (Zoom & Pan)
        const hands = landmarks
        let isPinching1 = false
        let pinchPos1 = { x: 0, y: 0 }
        let isPinching2 = false
        let pinchPos2 = { x: 0, y: 0 }

        // Check Hand 1
        if (hands.length > 0 && hands[0].length > 8) {
            const index = hands[0][8]
            const thumb = hands[0][4]
            const dist = Math.hypot(index.x - thumb.x, index.y - thumb.y)
            if (dist < 0.08) {
                isPinching1 = true
                pinchPos1 = { x: (index.x + thumb.x) / 2, y: (index.y + thumb.y) / 2 }
            }
        }
        // Check Hand 2
        if (hands.length > 1 && hands[1].length > 8) {
            const index = hands[1][8]
            const thumb = hands[1][4]
            const dist = Math.hypot(index.x - thumb.x, index.y - thumb.y)
            if (dist < 0.08) {
                isPinching2 = true
                pinchPos2 = { x: (index.x + thumb.x) / 2, y: (index.y + thumb.y) / 2 }
            }
        }

        // Update debug stats (throttled)
        const now = performance.now()
        if (now - (lastDebugUpdate.current || 0) > 200) {
            setDebugStats(prev => ({
                ...prev,
                hands: hands.length,
                state: `R:${ratio.toFixed(2)} ${commandState.current} ${isPinching1 ? 'P1' : ''} ${isPinching2 ? 'P2' : ''}`
            }))
            lastDebugUpdate.current = now
        }
        // A: 2-Hand Zoom
        if (isPinching1 && isPinching2) {
            const dx = pinchPos1.x - pinchPos2.x
            const dy = pinchPos1.y - pinchPos2.y
            const currentDist = Math.hypot(dx, dy)
            if (lastPinchDist.current !== null) {
                const delta = currentDist - lastPinchDist.current
                const sensitivity = 15.0
                const currentZoom = useStore.getState().cameraZoom
                let newZoom = currentZoom + delta * sensitivity
                // Increased limits per user request: -10..10 -> -30..30
                newZoom = Math.max(-40, Math.min(40, newZoom))
                useStore.setState({ cameraZoom: newZoom })
            }
            lastPinchDist.current = currentDist
            lastPinchPos.current = null
        }
        // B: 1-Hand Pan
        else if (isPinching1) {
            lastPinchDist.current = null
            if (lastPinchPos.current) {
                const dx = pinchPos1.x - lastPinchPos.current.x
                const dy = pinchPos1.y - lastPinchPos.current.y
                const sensitivityX = 20.0
                const sensitivityY = 20.0
                const currentX = useStore.getState().cameraOffset
                const currentY = useStore.getState().cameraOffsetY

                let newX = currentX + dx * sensitivityX
                let newY = currentY + dy * sensitivityY

                newX = Math.max(-10, Math.min(10, newX))
                newY = Math.max(-5, Math.min(10, newY))
                useStore.setState({ cameraOffset: newX, cameraOffsetY: newY })
            }
            lastPinchPos.current = pinchPos1
        } else {
            lastPinchDist.current = null
            lastPinchPos.current = null
        }
    }

    // --- Draggable Logic ---
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isMobile, setIsMobile] = useState(false)
    const isDragging = useRef(false)
    const dragStart = useRef({ x: 0, y: 0 })
    const initialPos = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const mobileCheck = /iPhone|iPod|Android/i.test(navigator.userAgent)
        setIsMobile(mobileCheck)

        if (mobileCheck) {
            // Mobile: Top-Left, tightly below text (~90px down)
            setPosition({ x: 16, y: 90 })
        } else {
            // Desktop: Top-Right
            setPosition({ x: window.innerWidth - 210, y: 16 })
        }
    }, [])

    const handlePointerDown = (e: React.PointerEvent) => {
        isDragging.current = true
        dragStart.current = { x: e.clientX, y: e.clientY }
        initialPos.current = { ...position }
            // Capture pointer to track outside element
            ; (e.target as Element).setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return
        const dx = e.clientX - dragStart.current.x
        const dy = e.clientY - dragStart.current.y
        setPosition({
            x: initialPos.current.x + dx,
            y: initialPos.current.y + dy
        })
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        isDragging.current = false
            ; (e.target as Element).releasePointerCapture(e.pointerId)
    }

    return (
        <>
            <div
                className={`fixed bg-black rounded-lg border-2 border-white/20 shadow-lg overflow-hidden z-50 cursor-grab active:cursor-grabbing touch-none
                           ${isMobile ? 'w-24 h-[4.5rem]' : 'w-48 h-36'}`}
                style={{ left: position.x, top: position.y }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* Mirror effect applied to content */}
                <div className="w-full h-full transform scale-x-[-1]">
                    <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
                </div>
            </div>

            {/* Debug Overlay REMOVED per user request */}

            {error && (
                <div
                    className={`absolute inset-0 flex items-center justify-center z-50 cursor-pointer ${error === "Tap to Start" ? "bg-transparent" : "bg-black/90"
                        }`}
                    onClick={() => {
                        // Reset init flag allow retry
                        isInitializing.current = false
                        if (error === "Tap to Start") {
                            // Retry play immediately if just blocked
                            if (videoRef.current) {
                                videoRef.current.play().then(() => {
                                    setError(null)
                                    // Ensure predict loop starts
                                    if (handLandmarkerRef.current) {
                                        predict()
                                    }
                                }).catch(e => console.error("Retry failed", e))
                            } else {
                                startCamera()
                            }
                        } else {
                            startCamera()
                        }
                    }}
                >
                    <div className="text-white text-center p-4">
                        {error === "Tap to Start" ? null : (
                            <>
                                <p className="text-xl font-bold mb-2 text-red-500">Error</p>
                                <p className="mb-4">{error}</p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        startCamera()
                                    }}
                                    className="px-4 py-2 bg-white/20 text-white rounded hover:bg-white/30"
                                >
                                    Retry
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
