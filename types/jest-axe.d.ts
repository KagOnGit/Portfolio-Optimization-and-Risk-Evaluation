declare module 'jest-axe' {
  import { AxeResults } from 'axe-core';
  export function axe(container: Element | DocumentFragment, options?: any): Promise<AxeResults>;
  export function toHaveNoViolations(results?: AxeResults): any;
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}
export {};