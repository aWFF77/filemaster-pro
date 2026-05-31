import { useState } from 'react'
import Sidebar from './components/Sidebar'
import RenamePage from './pages/RenamePage'
import ConvertPage from './pages/ConvertPage'
import ClassifyPage from './pages/ClassifyPage'
import ExtractPage from './pages/ExtractPage'
import ReportPage from './pages/ReportPage'
import SettingsPage from './pages/SettingsPage'

type ModuleId = 'rename' | 'convert' | 'classify' | 'extract' | 'report' | 'settings'

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('classify')

  const renderPage = () => {
    switch (activeModule) {
      case 'rename': return <RenamePage />
      case 'convert': return <ConvertPage />
      case 'classify': return <ClassifyPage />
      case 'extract': return <ExtractPage />
      case 'report': return <ReportPage />
      case 'settings': return <SettingsPage />
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar activeModule={activeModule} onNavigate={setActiveModule} />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-6 h-full">{renderPage()}</div>
      </main>
    </div>
  )
}
