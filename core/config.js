export let config = {
  baseURL: "/",
  url(path) {
    return `${config.baseURL}${path}`;
  },
};

export function setConfig(options) {
  Object.assign(config, options);
}
