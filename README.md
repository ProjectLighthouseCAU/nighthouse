# Nighthouse

[![npm](https://img.shields.io/npm/v/nighthouse)](https://www.npmjs.com/package/nighthouse)
[![Build](https://github.com/ProjectLighthouseCAU/nighthouse/actions/workflows/build.yml/badge.svg)](https://github.com/ProjectLighthouseCAU/nighthouse/actions/workflows/build.yml)
[![Docs](https://github.com/ProjectLighthouseCAU/nighthouse/actions/workflows/docs.yml/badge.svg)](https://projectlighthousecau.github.io/nighthouse)

A lightweight, asynchronous Project Lighthouse client for JavaScript that runs both in the browser and Node.js environments.

## Getting Started

To install the dependencies, run

```sh
npm install
```

To build the `nighthouse` packages, run

```sh
npm run build
```

To continuously rebuild them in the background you can also use

```sh
npm run watch
```

### Examples

To build and run the browser example, run

```sh
npm -w examples/browser run serve
```

To build and run the Node.js example, run

```
npm -w examples/node run build
npm -w examples/node run start
```

> As with the packages you can substitute `watch` for `build` to continuously rebuild in the background.
