import { useState } from 'react'
import { isLicensed, getLicense, FREE_LIMIT, PRICE } from '../services/license'
import UpgradeModal from '../components/UpgradeModal'

export default function SettingsPage() {
  const [showUpgrade, setShowUpgrade] = useState(false)
  const license = getLicense()
  const licensed = isLicensed()
  return (
    <div className="h-full flex flex-col">
      <div className="page-header">
        <div>
          <h2 className="page-title">设置</h2>
          <p className="page-subtitle">偏好设置与关于</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="card p-4 max-w-2xl">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">通用设置</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <div className="text-sm text-slate-700">界面语言</div>
                <div className="text-xs text-slate-400">选择应用程序的显示语言</div>
              </div>
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                <option>简体中文</option>
                <option>English</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <div className="text-sm text-slate-700">主题</div>
                <div className="text-xs text-slate-400">浅色 / 深色 / 跟随系统</div>
              </div>
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                <option>跟随系统</option>
                <option>浅色</option>
                <option>深色</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <div className="text-sm text-slate-700">文件名冲突时</div>
                <div className="text-xs text-slate-400">目标位置已存在同名文件时的行为</div>
              </div>
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                <option>询问</option>
                <option>自动重命名（添加序号）</option>
                <option>跳过</option>
                <option>覆盖</option>
              </select>
            </div>
          </div>

          {/* License */}
          <h3 className="text-sm font-semibold text-slate-700 mt-6 mb-4">许可证</h3>
          {licensed ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✅</span>
                <span className="text-sm font-semibold text-green-700">专业版已激活</span>
              </div>
              <div className="text-xs text-green-600 space-y-1">
                <div>激活码: {license.key}</div>
                <div>激活时间: {new Date(license.activatedAt).toLocaleDateString()}</div>
                <div>状态: 终身有效，无限文件处理</div>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🆓</span>
                  <span className="text-sm font-semibold text-orange-700">免费版</span>
                </div>
                <button className="btn-primary text-xs py-1.5 px-4" onClick={() => setShowUpgrade(true)}>
                  升级 ¥{PRICE}
                </button>
              </div>
              <div className="text-xs text-orange-600">
                免费版限制: 累计处理 {FREE_LIMIT} 个文件 | 升级后永久解除所有限制
              </div>
            </div>
          )}

          <h3 className="text-sm font-semibold text-slate-700 mt-6 mb-4">关于</h3>
          <div className="text-xs text-slate-500 space-y-1">
            <div>FileMaster Pro v1.0.0</div>
            <div>批量文件处理工具 — 重命名、分类、转换、提取</div>
            <div className="text-slate-400 mt-3">
              纯浏览器端运行，所有文件处理在本地完成。<br />
              文件不会上传到任何服务器，保护你的数据隐私。
            </div>
            <div className="text-slate-400 mt-3">
              技术支持: Chromium 系浏览器 (Chrome / Edge / Arc)<br />
              使用 File System Access API
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          onActivated={() => {
            setShowUpgrade(false)
            // Force re-render to show licensed state
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
