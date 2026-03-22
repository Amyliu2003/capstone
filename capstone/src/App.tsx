import { SceneRouter } from './scenes/SceneRouter'
import { AppFrame } from './layout/AppFrame'
import { DesignSystemProvider } from './designSystem/DesignSystemProvider'

function App() {
  return (
    <DesignSystemProvider>
      <AppFrame>
      <SceneRouter />
      </AppFrame>
    </DesignSystemProvider>
  )
}

export default App
