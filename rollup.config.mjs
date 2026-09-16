import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

const isWatch = !!process.env.ROLLUP_WATCH;

export default {
  input: "src/plugin.ts",
  output: {
    file: "com.alexismartin.applemusic-nowplaying.sdPlugin/bin/plugin.js",
    format: "cjs",
    sourcemap: isWatch
  },
  external: ["node:child_process", "node:readline", "node:path"],
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json", noEmitOnError: !isWatch }),
    !isWatch && terser()
  ]
};
