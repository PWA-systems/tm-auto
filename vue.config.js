module.exports = {
  pluginOptions: {
    vuetify: {
      // https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vuetify-loader
    },
    electronBuilder: {
      preload: "src/preload.ts",
      builderOptions: {
        // options placed here will be merged with default configuration and passed to electron-builder
        extraResources: ["./extra/**/*"],
      },
    },
  },
};
