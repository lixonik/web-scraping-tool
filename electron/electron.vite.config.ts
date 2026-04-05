import { defineConfig } from 'electron-vite'
// import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    build: {
      externalizeDeps: true,
      bytecode: false
    }
  },

  preload: {
    build: {
      externalizeDeps: true,
      bytecode: false
    }
  },

  //   renderer: {
  //   // dev mode: Vite будет работать из этой папки
  //   root: resolve(__dirname, 'dev-renderer'),
  //     build: {
  //     // продакшен тебе НЕ нужен, но electron-vite требует outDir
  //     outDir: 'dist/renderer'
  //   }
  // }
  renderer: {
    // resolve: {
    //   alias: {
    //     '@renderer': resolve(__dirname, 'src/renderer/src')
    //   }
    // },
    // plugins: [vue()]
  }
})
