export default (module: any) => {
  const hot = { effect, onDispose, addEventListener }
  return hot

  function onDispose(run) {
    module &&
      module.hot &&
      typeof module.hot.dispose === 'function' &&
      module.hot.dispose(run)
    return hot
  }

  function addEventListener(type: string, cb: any, target=window, options?: boolean | AddEventListenerOptions) {
    target.addEventListener(type, cb, options)
    onDispose(() => target.removeEventListener(type, cb))
    return hot
  }

  function effect(cb: any) {
    onDispose(cb())
    return hot
  }
}