import { parse } from "./parser.peg";

export { parse as parseCSS };
export * from "./expressions";

export function parseCSSStyle(source) {
  return parse(`style { ${source} }`).rules[0].style;
}