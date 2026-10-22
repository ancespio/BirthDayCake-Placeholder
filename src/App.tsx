import { Scene } from './Scene.tsx'
import { GestureController } from './components/Controls/GestureController.tsx'
import { AudioPlayer } from './components/UI/AudioPlayer.tsx'
import { LoadingOverlay } from './components/UI/LoadingOverlay.tsx'

function App() {
  return (
    <>
      <Scene />
      <GestureController />
      <AudioPlayer />
      <LoadingOverlay />

      <div className="absolute top-0 left-0 p-4 pointer-events-none text-white font-mono z-10">
        <h1 className="text-2xl font-bold tracking-tighter">黄小🐠生🎉日🎉快🎉乐🎉</h1>
        <p className="opacity-50 text-sm">因为有你，愿意说永远</p>
      </div>
    </>
  )
}

export default App
