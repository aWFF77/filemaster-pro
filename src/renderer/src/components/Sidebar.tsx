type ModuleId = 'rename' | 'convert' | 'classify' | 'extract' | 'report' | 'settings'

interface NavItem {
  id: ModuleId
  label: string
  icon: string
  description: string
}

const navItems: NavItem[] = [
  { id: 'classify', label: '智能分类', icon: '🗂️', description: '按规则自动归类文件' },
  { id: 'rename', label: '批量重命名', icon: '✏️', description: '通过规则批量重命名文件' },
  { id: 'convert', label: '格式转换', icon: '🔄', description: '图片、文档格式互转' },
  { id: 'extract', label: '信息提取', icon: '📋', description: '提取邮箱、手机号等结构化信息' },
  { id: 'report', label: '归纳报告', icon: '📊', description: '文件清单、统计分析' },
  { id: 'settings', label: '设置', icon: '⚙️', description: '偏好设置与许可证' },
]

export default function Sidebar({
  activeModule,
  onNavigate,
}: {
  activeModule: ModuleId
  onNavigate: (id: ModuleId) => void
}) {
  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
            FM
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">FileMaster Pro</h1>
            <p className="text-xs text-slate-400">v1.0.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeModule === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`sidebar-item w-full text-left ${isActive ? 'active' : ''}`}
              title={item.description}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">FileMaster Pro © 2026</p>
      </div>
    </aside>
  )
}
