'use client';
import { useAuthStore } from '@/store/useAuthStore';
import { BiX } from 'react-icons/bi';

const QUALITIES = [
    { label: 'High (320kbps)', value: '320kbps' },
    { label: 'Medium (160kbps)', value: '160kbps' },
    { label: 'Low (96kbps)', value: '96kbps' }
];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
    const { userData, updateSettings } = useAuthStore();
    const settings = userData?.settings || { streamQuality: '160kbps', downloadQuality: '320kbps' };

    const handleSave = (key: 'streamQuality' | 'downloadQuality', val: string) => {
        updateSettings({ ...settings, [key]: val });
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#18181b]">
                    <h2 className="text-xl font-bold text-white">Playback Settings</h2>
                    <button onClick={onClose}><BiX size={24} className="text-gray-400 hover:text-white" /></button>
                </div>

                <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
                    {/* Streaming */}
                    <div>
                        <h3 className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wider ml-1">Streaming Quality</h3>
                        <div className="space-y-2">
                            {QUALITIES.map(q => (
                                <button
                                    key={q.value}
                                    onClick={() => handleSave('streamQuality', q.value)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex justify-between items-center group
                                         ${settings.streamQuality === q.value
                                            ? 'bg-purple-600/10 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                                            : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5 hover:border-white/10'}
                                     `}
                                >
                                    <span className="font-medium">{q.label}</span>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center
                                         ${settings.streamQuality === q.value ? 'border-purple-500' : 'border-gray-600 group-hover:border-gray-400'}
                                     `}>
                                        {settings.streamQuality === q.value && <div className="w-2 h-2 rounded-full bg-purple-500"></div>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Download */}
                    <div>
                        <h3 className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wider ml-1">Download Quality</h3>
                        <div className="space-y-2">
                            {QUALITIES.map(q => (
                                <button
                                    key={'dl' + q.value}
                                    onClick={() => handleSave('downloadQuality', q.value)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex justify-between items-center group
                                         ${settings.downloadQuality === q.value
                                            ? 'bg-purple-600/10 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                                            : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5 hover:border-white/10'}
                                     `}
                                >
                                    <span className="font-medium">{q.label}</span>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center
                                         ${settings.downloadQuality === q.value ? 'border-purple-500' : 'border-gray-600 group-hover:border-gray-400'}
                                     `}>
                                        {settings.downloadQuality === q.value && <div className="w-2 h-2 rounded-full bg-purple-500"></div>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
