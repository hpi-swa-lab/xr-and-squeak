import { options, Component } from "../external/preact.mjs";

const instances = {};
const idMapping = {};

const oldVnode = options.vnode;
options.vnode = (vnode) => {
  const id = idMapping[vnode.type];
  if (id) (instances[id] ??= []).push(vnode);
  oldVnode?.(vnode);
};

const oldUnmount = options.unmount;
options.unmount = (vnode) => {
  const id = idMapping[vnode.type];
  if (id) {
    const list = instances[id];
    list.splice(list.indexOf(vnode), 1);
  }
  oldUnmount?.(vnode);
};

const oldDiffed = options.diffed;
options.diffed = (vnode) => {
  const id = idMapping[vnode.type];
  const vnodes = instances[id];
  if (vnodes) {
    const matchingDom = vnodes.filter((p) => p.__c === vnode.__c);
    if (matchingDom.length > 1)
      vnodes.splice(
        vnodes.findIndex((p) => p === matchingDom[0]),
        1
      );
  }
  oldDiffed?.(vnode);
};

export function register(componentFunc, id) {
  idMapping[componentFunc] = id;
  instances[id]?.forEach((vnode) => {
    vnode.type = componentFunc;
    vnode.__c.constructor = componentFunc;
    Component.prototype.forceUpdate.call(vnode.__c);
  });
}

window.io().on("hot-reload", ({ url }) => {
  import(url);
});
