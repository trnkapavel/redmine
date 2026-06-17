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
    const raw = await invoke<AppConfig>('get_config')
    set({ config: raw, loaded: true })
  },

  save: async (config) => {
    await invoke('save_config_cmd', { config })
    set({ config })
  },
}))
