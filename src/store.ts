import { create } from 'zustand'

interface AppState {
    stage: 'CONFUSION' | 'FORMED' | 'CELEBRATION'
    progress: number
    goalProgress: number
    cameraOffset: number
    cameraOffsetY: number
    cameraZoom: number
    setStage: (id: 'CONFUSION' | 'FORMED' | 'CELEBRATION') => void
    setProgress: (p: number) => void
    setGoalProgress: (p: number) => void
    setCameraOffset: (o: number) => void
    setCameraOffsetY: (o: number) => void
    setCameraZoom: (o: number) => void
    cameraReady: boolean
    setCameraReady: (ready: boolean) => void
    cameraStatus: string
    setCameraStatus: (status: string) => void
}

export const useStore = create<AppState>((set) => ({
    stage: 'FORMED',
    progress: 1,
    goalProgress: 1,
    cameraOffset: 0, // X
    cameraOffsetY: 0, // Y
    cameraZoom: 0, // Z offset
    setStage: (stage) => set({ stage }),
    setProgress: (p) => set({ progress: p }),
    setGoalProgress: (p) => set({ goalProgress: p }),
    setCameraOffset: (o) => set({ cameraOffset: o }),
    setCameraOffsetY: (o) => set({ cameraOffsetY: o }),
    setCameraZoom: (o) => set({ cameraZoom: o }),
    cameraReady: false,
    setCameraReady: (ready: boolean) => set({ cameraReady: ready }),
    cameraStatus: 'Initializing',
    setCameraStatus: (status) => set({ cameraStatus: status }),
}))
