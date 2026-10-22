import { useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useStore } from '../../store'

export function LoadingOverlay() {
    const { active, progress } = useProgress()
    const cameraReady = useStore((state) => state.cameraReady)
    const cameraStatus = useStore((state) => state.cameraStatus) || 'Initializing...'
    const [started, setStarted] = useState(false)

    // Calculate Camera Progress based on Status String
    // Step: 'Loading Vision Wasm...' -> 'Loading Engine...'
    // Step: 'Loading Model...' -> 'Loading AI Model...'
    // Step: 'Requesting Camera...' -> 'Accessing Camera...'
    // Step: 'Starting Video...'
    // Step: 'Ready'
    let camProgress = 10
    if (cameraStatus.includes('Engine')) camProgress = 30
    if (cameraStatus.includes('AI Model')) camProgress = 55
    if (cameraStatus.includes('Accessing')) camProgress = 75
    if (cameraStatus.includes('Starting')) camProgress = 90
    if (cameraStatus.includes('Ready') || cameraStatus === 'Running') camProgress = 100
    if (cameraReady) camProgress = 100

    const isLoading = !cameraReady || active

    // Hide only if NOT loading AND started
    if (!isLoading && started) return null

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-white space-y-8">
            {/* Title / Slogan */}
            <div className="text-3xl font-bold tracking-widest text-center animate-pulse">
                惊喜即将到来
            </div>

            {isLoading ? (
                // LOADING STATE
                <div className="flex flex-col space-y-6 w-72 opacity-90">

                    {/* 1. Camera Status Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-400">
                            <span>Camera: {cameraStatus}</span>
                            <span>{camProgress}%</span>
                        </div>
                        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-500 ease-out"
                                style={{ width: `${camProgress}%` }}
                            />
                        </div>
                    </div>

                    {/* 2. Scene Status Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-400">
                            <span>Scene Assets</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-500 transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                </div>
            ) : (
                // READY STATE - Tap to Start (Unlocks Audio)
                <button
                    onClick={() => setStarted(true)}
                    className="group relative px-8 py-3 bg-white text-black font-bold tracking-widest rounded-full 
                             hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                    <span className="relative z-10">开启惊喜</span>
                    <div className="absolute inset-0 rounded-full blur-md bg-white opacity-50 group-hover:opacity-80 transition-opacity"></div>
                </button>
            )}
        </div>
    )
}
