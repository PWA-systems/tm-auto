module.exports = {
  pluginOptions: {
    vuetify: {
      // https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vuetify-loader
    },
    electronBuilder: {
      preload: "src/preload.ts",
    },
  },
};
