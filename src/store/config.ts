import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import { AppConfig, DEFAULT_CONFIG } from '../types'

interface ConfigState {
  config: AppConfig
  loaded: boolean
  load: () => Promise<void>
  save: (config: AppConfig) => Promise<void>
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: DEFAULT_CONFIG,
  loaded: false,

  load: async () => {
    try {
      const raw = await invoke<AppConfig>('get_config')
      set({ config: raw, loaded: true })
    } catch (e) {
      console.error('get_config failed:', e)
      set({ loaded: true })
    }
  },

  save: async (config) => {
    await invoke('save_config_cmd', { config })
    set({ config })
    try {
      await invoke('fetch_now')
    } catch (e) {
      console.error('fetch_now failed:', e)
    }
  },
}))
