export const getContext = () => {
  return {
    mode: Bun.env['npm_lifecycle_event']
  }
}