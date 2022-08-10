# Litehouse Browser Example

A small example showcasing how Litehouse can be used in a simple web app.

## Getting Started

To run the browser example, first make sure to have the dependencies installed by running

```sh
npm install
```

Then either compile as a one-off using

```sh
npm run build
```

or continuously rebuild by invoking

```sh
npm run watch
```

In either case the outputs will be placed in the `dist` folder, where they can be served using any web server or simply opened locally using a web browser of your choice.

Alternatively, you can also use

```sh
npm run serve
```

to run a development web server directly and automatically rebuild in the background.

> Note: You can run these commands from the top-level package too by including `--workspace examples/browser` or `-w examples/browser` for short.
