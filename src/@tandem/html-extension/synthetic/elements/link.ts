import {
  serialize,
  deserialize,
  CSS_MIME_TYPE,
  HTML_MIME_TYPE,
} from "@tandem/common";

import {
  SyntheticHTMLElement,
  SyntheticCSSStyleSheet
} from "@tandem/synthetic-browser";
import * as path from "path";

const _cache = {};

export class SyntheticHTMLLink extends SyntheticHTMLElement {

  public stylesheet: SyntheticCSSStyleSheet;
  public import: SyntheticHTMLElement;

  get href() {
    return this.getAttribute("href");
  }

  set href(value: string) {
    this.setAttribute("href", value);
    this.reload();
  }

  createdCallback() {
    const rel     = this.getAttribute("rel") || "stylesheet";
    const href    = this.getAttribute("href");
  }

  attachedCallback() {
    this.attachStylesheet();
  }

  detachedCallback() {
    this.detachStylesheet();
  }

  private reload() {
    const rel     = (this.getAttribute("rel") || "stylesheet").toLowerCase();
    const href    = this.href;

    //  TODO - need to use fetch for this
    let { type, content } = parseDataURI(href);
    content = decodeURIComponent(content);

    if (rel === "stylesheet") {
      this.stylesheet = this.stylesheet || new SyntheticCSSStyleSheet([]);
      this.stylesheet.cssText = content;
      this.attachStylesheet();
    } else if (rel === "import") {
      this.attachShadow({ mode: "open" });
      // // Odd chunk of code.
      // // Elements that are evaluated are created in a sandbox, which require pre-loaded
      // // bundles for them to execute. Therefore it's okay to fetch a bundle here synchronously
      // // because it *must* exist for the createCallback to be called. for deserialized instances,
      // // this method is never called anyways because deserialization implies that we're restoring the
      // // element to its original state -- another method is called instead.
      // this[rel] = this.module.sandbox.evaluate(this.module.source.eagerGetDependency(href));

        // const shadow = this.attachShadow({ mode: "open" });
        // this.import.querySelectorAll("*").forEach((element) => {

        //   // only include importable elements -- this reduces the number of traversable
        //   // items, which thus speeds up the app
        //   if (/style|link|template/.test(element.tagName)) {
        //     shadow.appendChild(element);
        //   }
        // });
      }
  }

  private attachStylesheet() {
    if (!this.ownerDocument || !this._attached || !this.stylesheet) return;
    const edit = this.ownerDocument.createEdit();
    edit.addStyleSheet(this.stylesheet);
    edit.applyActionsTo(this.ownerDocument);
  }

  private detachStylesheet() {
    if (!this.ownerDocument || !this._attached || !this.stylesheet) return;
    const edit = this.ownerDocument.createEdit();
    edit.removeStyleSheet(this.stylesheet);
    edit.applyActionsTo(this.ownerDocument);
  }
}



function parseDataURI(uri: string): { type: string, content: string } {
  const parts = uri.match(/data:(.*?),(.*)/);
  return parts && { type: parts[1], content: parts[2] };
}