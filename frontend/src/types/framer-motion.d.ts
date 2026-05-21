import { Easing } from "framer-motion"

// Fix: framer-motion v12 tightened Easing type - 
// our variants use `ease: string` which is valid at runtime
// This allows string to be assignable to Easing
declare module "framer-motion" {
  export interface Transition {
    ease?: Easing | Easing[] | string
  }
}
