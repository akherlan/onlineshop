// Ref: https://stackoverflow.com/questions/74640623/why-am-i-facing-referenceerror-urlsearchparams-is-not-defined
String.prototype.addQuery = function (obj) {
  return this + Object.keys(obj).reduce(function (p, e, i) {
    return p + (i == 0 ? "?" : "&") +
      (Array.isArray(obj[e]) ? obj[e].reduce(function (str, f, j) {
        return str + e + "=" + encodeURIComponent(f) + (j != obj[e].length - 1 ? "&" : "")
      }, "") : e + "=" + encodeURIComponent(obj[e]));
  }, "");
}