// Ref: https://stackoverflow.com/a/74642018/10639901
String.prototype.addQuery = function (obj) {
  return this + Object.keys(obj).reduce(function (p, e, i) {
    return p + (i == 0 ? "?" : "&") +
      (Array.isArray(obj[e]) ? obj[e].reduce(function (str, f, j) {
        return str + e + "=" + encodeURIComponent(f) + (j != obj[e].length - 1 ? "&" : "")
      }, "") : e + "=" + encodeURIComponent(obj[e]));
  }, "");
}

// Ref: https://stackoverflow.com/a/5574446/10639901
String.prototype.toTitleCase = function () {
  return this.replace(
    /\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
};