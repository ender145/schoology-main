/* sanitize-url v6.0.2 - https://github.com/braintree/sanitize-url | @licence https://github.com/braintree/sanitize-url/blob/main/LICENSE */
/*
  This is a modified version of sanitize-url. It has been modified to be a
  self executing function so it is namespaced and all const variables have been
  replaced with vars so it works in older browsers. It has then been minified.
*/
var SanitizeUrl=function(){var r={},a=/^([^\w]*)(javascript|data|vbscript)/im,t=/&#(\w+)(^\w|;)?/g,n=/&(newline|tab);/gi,e=/[\u0000-\u001F\u007F-\u009F\u2000-\u200D\uFEFF]/gim,i=/^.+(:|&colon;)/gim,u=[".","/"];return r.sanitize=function(r){var $,c,o=(c=r||"").replace(t,function(r,a){return String.fromCharCode(a)}).replace(n,"").replace(e,"").trim();if(!o)return"about:blank";if($=o,u.indexOf($[0])>-1)return o;var f=o.match(i);if(!f)return o;var l=f[0];return a.test(l)?"about:blank":o},r}();
