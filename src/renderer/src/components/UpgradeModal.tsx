import { useState } from 'react'
import { activateLicense, FREE_LIMIT, PRICE, remainingSlots } from '../services/license'

interface Props {
  onClose: () => void
  onActivated: () => void
}

export default function UpgradeModal({ onClose, onActivated }: Props) {
  const [tab, setTab] = useState<'upgrade' | 'activate'>('upgrade')
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleActivate = async () => {
    setStatus('loading')
    const result = await activateLicense(key)
    setStatus(result.success ? 'success' : 'error')
    setMessage(result.message)
    if (result.success) {
      setTimeout(() => onActivated(), 800)
    }
  }

  const slots = remainingSlots()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                {tab === 'upgrade' ? '升级 FileMaster Pro' : '输入激活码'}
              </h2>
              <p className="text-primary-200 text-sm mt-1">解锁无限文件处理</p>
            </div>
            <button onClick={onClose} className="text-primary-200 hover:text-white text-xl">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {tab === 'upgrade' ? (
            <>
              {/* Usage bar */}
              {!isNaN(slots) && (
                <div className="mb-5">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>免费额度已用</span>
                    <span>{FREE_LIMIT - slots} / {FREE_LIMIT} 个文件</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((FREE_LIMIT - slots) / FREE_LIMIT) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Pricing Card */}
              <div className="border-2 border-primary-200 bg-primary-50 rounded-xl p-5 mb-4 text-center">
                <div className="text-xs text-primary-600 font-medium mb-1">终身买断</div>
                <div className="text-3xl font-bold text-primary-700">
                  ¥{PRICE}
                  <span className="text-sm font-normal text-primary-500"> / 永久</span>
                </div>
                <div className="text-xs text-primary-500 mt-2">一次付费，终身使用，无订阅</div>
              </div>

              {/* Feature list */}
              <ul className="space-y-2 mb-5 text-sm text-slate-600">
                {[
                  '✅ 无限文件处理数量',
                  '✅ 所有功能模块无限制',
                  '✅ 支持文件夹递归扫描',
                  '✅ 批量重命名无上限',
                  '✅ 格式转换无上限',
                  '✅ 信息提取无上限',
                  '✅ 终生免费更新',
                ].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              {/* CTA */}
              <button
                className="w-full btn-primary py-3 text-base font-semibold"
                onClick={() => setTab('activate')}
              >
                已购买？点此激活 →
              </button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  请输入激活码（格式: FMP-XXXX-XXXX）
                </label>
                <input
                  className="w-full text-sm border-2 border-slate-200 rounded-lg px-4 py-3 font-mono tracking-wider text-center
                           focus:outline-none focus:border-primary-400 uppercase"
                  placeholder="FMP-XXXX-XXXX"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value.toUpperCase())
                    setStatus('idle')
                  }}
                  maxLength={17}
                  autoFocus
                />
              </div>

              {status === 'error' && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-3">{message}</div>
              )}
              {status === 'success' && (
                <div className="text-sm text-green-600 bg-green-50 rounded-lg px-4 py-3 mb-3">{message}</div>
              )}

              <div className="flex gap-3">
                <button className="flex-1 btn-secondary" onClick={() => setTab('upgrade')}>
                  ← 返回
                </button>
                <button
                  className="flex-1 btn-primary"
                  onClick={handleActivate}
                  disabled={key.length < 14 || status === 'loading'}
                >
                  {status === 'loading' ? '验证中...' : '激活'}
                </button>
              </div>

              {/* Test key hint (only in dev) */}
              <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">
                购买后获得激活码 | 支持支付宝/微信支付
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
