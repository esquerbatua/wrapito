import { createRoot } from 'react-dom/client';
import { Component, Config, Mount } from './models'

const mount = (component: Component) => {
  const rootNode = document.body.appendChild(document.createElement('div'));

  createRoot(rootNode).render(component);

  return rootNode;
}

let config: Config = {
  defaultHost: '',
  extend: {},
  mount,
  changeRoute: (path: string) => window.history.replaceState(null, '', path),
}

function configure(newConfig: Config) {
  config = {
    ...config,
    ...newConfig,
  }
}

const getConfig = (): Config => ({ ...config });

export { configure, getConfig, Config, Mount };
