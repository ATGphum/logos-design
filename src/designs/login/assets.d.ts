// Vite asset-URL imports for this design (the sandbox tsconfig does not pull
// in vite/client types, so declare the two extensions this design uses).
declare module "*.webp" {
  const url: string
  export default url
}
declare module "*.svg" {
  const url: string
  export default url
}
